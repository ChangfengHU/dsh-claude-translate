import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TextTranslator, protect, translateRequest } from '../src/text.js';
import { createExecutor } from '../src/provider.js';
import { Store } from '../src/store.js';
import { createRpcHandler } from '../src/rpc.js';
import { OutputTranslation } from '../src/output.js';
import { stablePrefix, translationPieces, translationPreview } from '../src/incremental.js';

test('each JSON token extends the preview instead of clearing it at the next segment header', () => {
  const source = '## First\n\n1. **One**\n2. **Two**\n';
  const shield = protect(source), pieces = translationPieces(shield.text, 'zh');
  const raw = JSON.stringify({ translations: pieces.filter(p => p.translate).map(p => ({ id: p.id, text: ({ First: '第一段', One: '第一项', Two: '第二项' })[p.text] })) });
  let previous = '';
  for (let i = 1; i <= raw.length; i++) {
    const preview = translationPreview(raw.slice(0, i), pieces, new Map(), shield, 'zh');
    assert.ok(preview.startsWith(previous), 'preview regressed at JSON position ' + i);
    previous = preview;
  }
  assert.equal(previous, '## 第一段\n\n1. **第一项**\n2. **第二项**\n');
});

test('Markdown structure is never handed to the output translator as prose', async () => {
  const source = '## Before departure\n\n1. **Check weather** and pack an umbrella.\n2. Bring your card.\n3. Keep `client.json` unchanged.\n\n> Arrive early.\n';
  const pieces = translationPieces(source, 'zh');
  assert.equal(pieces.map(p => p.text).join(''), source);
  assert.ok(pieces.some(p => !p.translate && p.text.includes('2. ')));
  const translator = new TextTranslator(async ({ text }) => {
    const { segments } = JSON.parse(text);
    for (const segment of segments) assert.doesNotMatch(segment.text, /^(?:[1-3]\. |## |\*\*)/u);
    return JSON.stringify({ translations: segments.map(s => ({ id: s.id, text: s.text.replace('Before departure', '出发前').replace('Check weather', '查看天气').replace('and pack an umbrella.', '并带好雨伞。').replace('Bring your card.', '带好交通卡。').replace('Keep ', '保留 ').replace(' unchanged.', ' 不变。').replace('Arrive early.', '提前到达。') })) });
  });
  const output = await translator.translate(source, 'zh', config);
  assert.match(output, /1\. \*\*查看天气\*\*/u);
  assert.match(output, /\n2\. 带好交通卡。\n3\. /u);
  assert.match(output, /`client\.json`/u);
  assert.match(output, /\n> 提前到达。\n/u);
});

test('Markdown links and list syntax survive incremental previews', () => {
  const source = '1. **Weather**\n2. [Transit](https://example.com)\n';
  const pieces = translationPieces(source, 'zh');
  const translated = pieces.map(p => p.translate ? p.text.replace('Weather', '天气').replace('Transit', '交通') : p.text).join('');
  assert.equal(translated, '1. **天气**\n2. [交通](https://example.com)\n');
});

const config = { mode: 'route', provider: 'qwen', model: 'qwen-flash', timeoutMs: 1000 };
const tick = () => new Promise(resolve => setTimeout(resolve, 5));
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
async function fixture(t) { const directory = await mkdtemp(join(tmpdir(), 'dct-stream-')); t.after(() => rm(directory, { recursive: true, force: true })); const store = new Store(directory); await store.init(); return store; }

test('partial translated input is visible but cannot dispatch or enter the completed cache', async () => {
  const gate = deferred(), observed = [];
  const translator = new TextTranslator(async ({ text, onProgress }) => {
    const input = JSON.parse(text); const partial = JSON.stringify({ translations: input.segments.map(s => ({ id: s.id, text: 'Help organize my work.' })) });
    onProgress(partial.slice(0, -5)); await gate.promise; return partial;
  });
  let completed = false;
  const result = translator.translate('请整理工作。', 'en', config, undefined, undefined, text => observed.push(text)).then(text => { completed = true; return text; });
  await tick(); assert.ok(observed.some(text => text.includes('Help organize'))); assert.equal(completed, false); assert.equal(translator.cache.size, 0);
  gate.resolve(); assert.equal(await result, 'Help organize my work.'); assert.equal(translator.cache.size, 1);
});

test('failed final validation clears preliminary text and never caches an incomplete translation', async () => {
  const observed = [];
  const translator = new TextTranslator(async ({ onProgress }) => { onProgress('{"translations":[{"id":"0","text":"Hello'); return '{"translations":[]}'; });
  await assert.rejects(translator.translate('你好。', 'en', config, undefined, undefined, text => observed.push(text)), { code: 'TRANSLATION_INCOMPLETE' });
  assert.ok(observed.includes('Hello')); assert.equal(observed.at(-1), ''); assert.equal(translator.cache.size, 0);
});

test('incremental literal restoration hides unfinished placeholders and rejects invented tokens', () => {
  const shield = protect('Open `src/auth.ts` now.');
  const marker = shield.text.match(/DSHT_[A-Za-z0-9_]+_END/)[0];
  for (let i = 1; i < marker.length; i++) assert.equal(shield.preview('Open ' + marker.slice(0, i)), 'Open ');
  assert.equal(shield.preview('Open ' + marker), 'Open `src/auth.ts`');
  assert.equal(shield.preview('DSHT_invented_END'), '');
  assert.equal(shield.preview(marker + marker), '');
});

test('only the latest user input supplies an English preview, not system or prior messages', async () => {
  const previews = [];
  const translator = new TextTranslator(async ({ text, onProgress }) => {
    const data = JSON.parse(text); const value = JSON.stringify({ translations: data.segments.map(s => ({ id: s.id, text: 'Translated input.' })) });
    onProgress?.(value); return value;
  });
  const messages = ['之前的话。', '现在的问题。'].map((text, i) => ({ id: String(i), role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text }] }));
  await translateRequest({ system: '系统规则。', messages }, translator, config, value => value, undefined, value => previews.push(value));
  assert.equal(previews.length, 1); assert.equal(previews[0], 'Translated input.');
});

test('latest input streams before context translation but is not dispatched while context is invalid', async () => {
  const order = [], previews = [];
  const translator = new TextTranslator(async ({ text, onProgress }) => {
    const { segments } = JSON.parse(text); order.push(segments.map(s => s.text).join(''));
    if (segments.some(s => s.text.includes('系统'))) throw new Error('Context unavailable');
    const output = JSON.stringify({ translations: segments.map(s => ({ id: s.id, text: 'Prepare for my meeting.' })) });
    onProgress?.(output.slice(0, -5)); return output;
  });
  await assert.rejects(translateRequest({ system: '系统规则。', messages: [{ id: 'u1', role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: '准备会议。' }] }] }, translator, config, x => x, undefined, p => previews.push(p)), /Context unavailable/);
  assert.equal(order[0], '准备会议。'); assert.ok(previews.some(x => x.includes('Prepare')));
});

test('API SSE preserves UTF-8 across arbitrary byte splits and emits before the terminal record', async () => {
  const gate = deferred(), observed = [];
  const content = '{"translations":[{"id":"0","text":"你好。"}]}';
  const bytes = Buffer.from('data: ' + JSON.stringify({ choices: [{ delta: { content } }] }) + '\r\n\r\n');
  const execute = createExecutor({ credentials: { resolve: async () => ({ value: 'server-only-key' }) }, fetcher: async (_url, request) => {
    assert.equal(JSON.parse(request.body).stream, true);
    return new Response(new ReadableStream({ async start(controller) {
      for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
      await gate.promise;
      controller.enqueue(Buffer.from('data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n')); controller.close();
    } }), { headers: { 'content-type': 'text/event-stream' } });
  } });
  const promise = execute({ config: { ...config, mode: 'api', baseURL: 'https://example.com/v1' }, system: 'Translate', text: 'Hello', onProgress: text => observed.push(text) });
  await tick(); assert.ok(observed.some(text => text.includes('你好'))); gate.resolve(); assert.equal((await promise).text, content);
});

test('an interrupted SSE translation cannot be mistaken for a completed result', async () => {
  const execute = createExecutor({ credentials: { resolve: async () => ({ value: 'server-only-key' }) }, fetcher: async () => new Response('data: {"choices":[{"delta":{"content":"partial"}}]}\n\ndata: [DONE]\n\n', { headers: { 'content-type': 'text/event-stream' } }) });
  await assert.rejects(execute({ config: { ...config, mode: 'api', baseURL: 'https://example.com/v1' }, system: '', text: '', onProgress() {} }), { code: 'TRANSLATION_INCOMPLETE' });
});

test('native route text deltas publish incrementally without changing the requested model', async () => {
  const values = [];
  const execute = createExecutor({ makeMessage: value => value, dispatch: async function* (request) {
    assert.equal(request.model, 'qwen-flash'); yield { type: 'text-delta', index: 0, text: 'first' };
    yield { type: 'block-end', index: 0, block: { type: 'text', text: 'first final' } }; yield { type: 'finish', reason: { kind: 'stop' } };
  } });
  const result = await execute({ config, system: '', text: '', onProgress: value => values.push(value) });
  assert.equal(values[0], 'first'); assert.equal(result.text, 'first final');
});

test('watch notifications remain session-scoped, in memory, and cancellation removes listeners', async t => {
  const store = await fixture(t), controller = new AbortController(); let done = false;
  const waiting = store.waitForChange('session-first', 0, controller.signal).then(() => { done = true; });
  store.touch({ sessionId: 'session-other' }); await tick(); assert.equal(done, false);
  store.touch({ sessionId: 'session-first' }); await waiting; assert.equal(store.waiters.size, 0); assert.equal(store.metrics.detailReads, 0);
  const abort = new AbortController(); const cancelled = store.waitForChange('session-first', store.liveRevision('session-first'), abort.signal);
  abort.abort(); await assert.rejects(cancelled, { name: 'AbortError' }); assert.equal(store.waiters.size, 0);
  assert.throws(() => store.waitForChange('session-first', -1), { code: 'INVALID_BODY' });
});

test('the existing authenticated RPC transports live changes without reading full trace blobs', async t => {
  const store = await fixture(t);
  await store.saveConfig({ enabled: true });
  const run = { id: 'tr_1234', sessionId: 'session-live', purpose: 'conversation', status: 'running', startedAt: Date.now(), rawOutput: 'Hello', translatedOutput: '', meter: {} };
  store.active.set(run.id, run); await store.save(run);
  const rpc = createRpcHandler({ store, engine: {}, credentials: {}, llm: {} });
  const first = await rpc('chat', { session: run.sessionId });
  const controller = new AbortController(); const pending = rpc('watch', { session: run.sessionId, after: first.value.watchRevision, revision: first.value.revision }, controller.signal);
  await tick(); run.outputPreview = '你好'; store.touch(run);
  const response = await pending;
  assert.equal(response.ok, true); assert.equal(response.value.display[0].outputPreview, '你好'); assert.equal(store.metrics.detailReads, 0);
});

test('stable batching waits for sentence boundaries and never translates an unfinished fenced literal', () => {
  assert.equal(stablePrefix('A complete sentence. An unfinished phrase'), 'A complete sentence. ');
  assert.equal(stablePrefix('Start.\n```js\nconst x = "A sentence. More'), 'Start.\n');
  assert.equal(stablePrefix('Use `a. b` carefully. Next'), 'Use `a. b` carefully. ');
});

test('output begins before Claude finishes and catches up to final source with one request in flight', async () => {
  const gate = deferred(), seen = [], completed = [];
  const first = 'A complete sentence with enough useful detail for a stable translation batch, preserving every instruction and all original evidence. ';
  const run = { rawOutput: first + 'Still running', translatedOutput: '', meter: {} };
  const job = new OutputTranslation({ run, config, changed() {}, completed: result => completed.push(result), translator: { async translate(source, _direction, _config, _signal, _meter, progress) { seen.push(source); progress('中文增量'); if (seen.length === 1) await gate.promise; return '中文：' + source; } } });
  job.request(); await tick(); assert.equal(run.outputPreview, '中文增量'); assert.equal(seen.length, 1);
  run.rawOutput = first + 'The final sentence.'; job.request(true); gate.resolve(); await job.promise;
  assert.equal(seen.length, 2); assert.equal(seen.at(-1), run.rawOutput); assert.equal(completed[0].success, true); assert.equal(run.outputPreview, '');
});

test('output cancellation retains English and terminates the pending translation', async () => {
  const run = { rawOutput: 'The original English response.', meter: {} }, finished = [];
  const job = new OutputTranslation({ run, config, changed() {}, completed: value => finished.push(value), translator: { translate(_text, _direction, _config, signal) { return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true })); } } });
  job.request(true); await tick(); job.cancel(); await job.promise;
  assert.equal(run.rawOutput, 'The original English response.'); assert.equal(finished[0].interrupted, true); assert.equal(finished[0].success, false);
});

test('a rewritten English block discards obsolete Chinese before translating the final source', async () => {
  const run = { rawOutput: 'A complete sentence with enough useful detail for a stable translation batch, preserving every instruction and all original evidence. ', meter: {} };
  const job = new OutputTranslation({ run, config, changed() {}, completed() {}, translator: { async translate(source) { return '中文：' + source; } } });
  job.request(); await job.promise; assert.ok(run.translatedOutput);
  run.rawOutput = 'A corrected final reply.'; job.request(true); await job.promise; assert.equal(run.translatedOutput, '中文：A corrected final reply.');
});
