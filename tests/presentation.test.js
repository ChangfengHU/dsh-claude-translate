import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { Store, validateConfig } from '../src/store.js';
import { TranslationEngine } from '../src/engine.js';
import { validatePresentation, currentPosition, legacyPosition } from '../src/presentation.js';
import { PIPELINE } from '../src/text.js';

const config = { enabled: true, mode: 'route', provider: 'qwen', model: 'qwen-flash' };
const makeMessage = input => ({ ...input, id: crypto.randomUUID() });
const request = () => ({ sessionId: 'session-demo', provider: 'claude-local', model: 'default', system: '保持只读。', messages: [{ id: 'user-1', role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: '帮我整理今天的工作。' }] }] });
const execute = async ({ text }) => { const data = JSON.parse(text); return JSON.stringify({ translations: data.segments.map(s => ({ id: s.id, text: data.targetLanguage === 'English' ? s.text.replace('保持只读。', 'Keep files read-only.').replace('帮我整理今天的工作。', 'Help organize my work for today.') : '今天有三项工作。' })) }); };
async function fixture(t) { const dir = await mkdtemp(join(tmpdir(), 'dct-present-')); const store = new Store(dir); await store.init(); await store.saveConfig(config); t.after(() => rm(dir, { recursive: true, force: true })); return store; }
async function collect(stream) { const result = []; for await (const chunk of stream) result.push(chunk); return result; }
async function* answer() { yield { type: 'block-end', index: 0, block: { type: 'text', text: 'Three tasks for today.' } }; yield { type: 'finish', reason: { kind: 'stop' } }; }

test('Chinese default, English and all three bilingual layouts validate', () => {
  assert.equal(validateConfig({}).presentation.mode, 'zh');
  for (const mode of ['zh', 'en', 'bilingual']) for (const layout of ['parallel', 'stacked', 'collapsed']) assert.deepEqual(validatePresentation({ mode, layout }), { mode, layout });
  for (const value of [{ mode: 'fr', layout: 'parallel' }, { mode: 'zh', layout: 'injected' }, { mode: 'en', layout: 'stacked', apiKey: 'secret' }, null]) assert.throws(() => validatePresentation(value));
});
test('per-session presentation survives restart without changing another session', async t => {
  const store = await fixture(t); await store.saveConfig({ sessionPresentation: { 'session-demo': { mode: 'bilingual', layout: 'stacked' } } });
  const next = new Store(store.directory); await next.init(); assert.equal(next.config.sessionPresentation['session-demo'].layout, 'stacked'); assert.equal(next.config.sessionPresentation['session-other'], undefined);
  assert.throws(() => validateConfig({ sessionPresentation: { '../bad': { mode: 'en', layout: 'parallel' } } }));
});
test('correlation uses native turn and step, not the first equal answer', () => {
  const start = { type: 'step/start', data: { turn: 2, step: 3 } };
  assert.deepEqual(currentPosition([start]), { turn: 2, step: 3 }); assert.equal(currentPosition([start, { type: 'step/end' }]), undefined);
  const r = { rawOutput: 'OK', original: { messages: [{ id: 'u2' }] } };
  const reply = (turn, id) => ({ type: 'assistant/message', data: { turn, step: 0, message: { id, content: [{ type: 'text', text: 'OK' }] } } });
  assert.deepEqual(legacyPosition(r, [{ type: 'user/message', data: { id: 'u1' } }, reply(0, 'a1'), { type: 'user/message', data: { id: 'u2' } }, reply(1, 'a2')]), { turn: 1, step: 0 });
  assert.equal(legacyPosition({ ...r, original: { messages: [{ id: 'unknown' }] } }, [reply(0, 'a1')]), undefined);
});
test('Claude finishes before delayed display translation and keeps canonical English', async t => {
  const store = await fixture(t); let release;
  const wait = new Promise(resolve => { release = resolve; });
  const engine = new TranslationEngine({ store, makeMessage, position: () => ({ turn: 1, step: 0 }), dispatch: answer, execute: async args => { if (JSON.parse(args.text).targetLanguage !== 'English') await wait; return execute(args); } });
  const chunks = await collect(engine.stream(request(), answer));
  assert.equal(chunks.at(-1).type, 'finish'); assert.equal(engine.jobs.size, 1);
  const meta = store.displayPage('session-demo')[0]; assert.equal(meta.displayStatus, 'pending'); assert.deepEqual(meta.position, { turn: 1, step: 0 });
  release(); await engine.idle(); assert.equal(engine.jobs.size, 0);
  const display = store.displayRuns('session-demo', [meta.id])[0]; assert.equal(display.rawOutput, 'Three tasks for today.'); assert.equal(display.translatedOutput, '今天有三项工作。');
  assert.deepEqual(store.displayRuns('session-other', [meta.id]), []);
  assert.equal((await store.get('session-demo', meta.id)).executionStatus, 'succeeded');
});
test('cold restart reuses only matching retained pipeline and provider snapshots', async t => {
  const store = await fixture(t);
  const engine = new TranslationEngine({ store, makeMessage, execute, dispatch: answer });
  await collect(engine.stream(request(), answer)); await engine.idle();
  const next = new Store(store.directory); await next.init(); let inputs = 0;
  const reopened = new TranslationEngine({ store: next, makeMessage, execute: args => { if (JSON.parse(args.text).targetLanguage === 'English') inputs++; return execute(args); }, dispatch: answer });
  await collect(reopened.stream(request(), answer)); await reopened.idle(); assert.equal(inputs, 0);
  const latest = await next.get('session-demo', next.page('session-demo').runs[0].id); assert.equal(latest.pipeline, PIPELINE);
  await next.saveConfig({ model: 'another-qwen-model' });
  const changed = new TranslationEngine({ store: next, makeMessage, execute: args => { if (JSON.parse(args.text).targetLanguage === 'English') inputs++; return execute(args); }, dispatch: answer });
  await collect(changed.stream(request(), answer)); await changed.idle(); assert.equal(inputs, 2);
});
test('Chat display reads are batched and independent of full history blobs', async t => {
  const store = await fixture(t);
  await store.save({ id: 'tr_123', sessionId: 'session-demo', purpose: 'conversation', position: { turn: 1, step: 2 }, startedAt: Date.now(), status: 'succeeded', displayStatus: 'ready', rawOutput: 'Hello', translatedOutput: '你好' });
  const reads = store.metrics.detailReads;
  for (let i = 0; i < 1000; i++) { store.displayPage('session-demo'); store.displayRuns('session-demo', ['tr_123']); }
  assert.equal(store.metrics.detailReads, reads);
  assert.throws(() => store.displayRuns('session-demo', Array(21).fill('tr_123')));
  const next = new Store(store.directory); await next.init(); assert.equal(next.displayRuns('session-demo', ['tr_123'])[0].translatedOutput, '你好');
});
test('projection preserves native tool actions, images and reasoning without duplication', async () => {
  let plugin;
  const source = (await readFile(new URL('../client/index.js', import.meta.url), 'utf8')).replace("return { name: NS, inject: ['slots', 'locale'], apply };", "return { name: NS, inject: ['slots', 'locale'], apply, projectText };");
  vm.runInNewContext(source, { window: { __ModuleLoader__: { load: m => { plugin = m.factory(() => ({ createElement() {} })); } } } });
  const blocks = [{ kind: 'reasoning', text: 'private' }, { kind: 'text', text: 'Hello' }, { kind: 'other', block: { type: 'codex-action' } }, { kind: 'image', attachment: { id: 'image' } }, { kind: 'text', text: 'Again' }];
  const node = { data: { turn: 1, step: 0, blocks } };
  const projected = plugin.projectText(node, '你好'); assert.equal(projected.data.blocks[1].text, '你好'); assert.equal(projected.data.blocks.length, 4); assert.equal(node.data.blocks[1].text, 'Hello');
  const secondary = plugin.projectText(node, 'Hello Again', { textOnly: true }); assert.equal(secondary.data.blocks.length, 1);
  assert.equal(projected.data.blocks[0], blocks[0]); assert.equal(projected.data.blocks[2], blocks[2]); assert.equal(projected.data.blocks[3], blocks[3]);
});
test('long conversation client fetches metadata once and only visible reply text in a batch', async () => {
  let plugin; const calls = [];
  const runs = Array.from({ length: 1000 }, (_, i) => ({ id: 'tr_' + i, status: 'succeeded', revision: String(i), position: { turn: i, step: 1 } }));
  const source = (await readFile(new URL('../client/index.js', import.meta.url), 'utf8')).replace("return { name: NS, inject: ['slots', 'locale'], apply };", "return { name: NS, inject: ['slots', 'locale'], apply, channel };");
  vm.runInNewContext(source, {
    window: { __ModuleLoader__: { load: m => { plugin = m.factory(() => ({ createElement() {} })); } } },
    URL, URLSearchParams, AbortController, crypto, setTimeout, clearTimeout, document: { hidden: false },
    fetch: async (url, opts) => { const payload = JSON.parse(opts.body).payload; calls.push({ url, payload }); return { ok: true, json: async () => ({ result: { ok: true, value: url.endsWith('/chat') ? { runs, revision: 'one', enabled: true, presentation: { mode: 'zh', layout: 'parallel' } } : { runs: [{ id: 'tr_9', revision: '9', translatedOutput: '九件事' }] } } }) }; },
  });
  const bus = plugin.channel('session-long'); const disconnect = bus.connect();
  try {
    await new Promise(r => setTimeout(r, 40)); assert.equal(calls.length, 1); assert.equal(calls[0].url.endsWith('/chat'), true);
    const unwatch = bus.watch('tr_9'); await new Promise(r => setTimeout(r, 50));
    assert.equal(calls.length, 2); assert.equal(calls[1].payload.ids, 'tr_9'); assert.equal(bus.detail('tr_9').translatedOutput, '九件事'); unwatch();
  } finally { disconnect(); bus.dispose(); }
});
test('a stale metadata poll cannot overwrite a newly saved language or enable toggle', async () => {
  let plugin, release;
  const response = value => ({ ok: true, json: async () => ({ result: { ok: true, value } }) });
  const source = (await readFile(new URL('../client/index.js', import.meta.url), 'utf8')).replace("return { name: NS, inject: ['slots', 'locale'], apply };", "return { name: NS, inject: ['slots', 'locale'], apply, channel };");
  vm.runInNewContext(source, {
    window: { __ModuleLoader__: { load: m => { plugin = m.factory(() => ({ createElement() {} })); } } },
    URL, URLSearchParams, AbortController, crypto, setTimeout, clearTimeout, document: { hidden: false },
    fetch: async url => url.endsWith('/chat') ? new Promise(resolve => { release = () => resolve(response({ runs: [], revision: 'old', enabled: false, presentation: { mode: 'zh', layout: 'parallel' } })); }) : response({ ok: true }),
  });
  const bus = plugin.channel('session-race'); const disconnect = bus.connect();
  try {
    await bus.toggle(); await bus.preference({ mode: 'bilingual', layout: 'stacked' }); release();
    await new Promise(r => setTimeout(r, 10)); assert.equal(bus.getSnapshot().enabled, true); assert.equal(bus.getSnapshot().presentation.mode, 'bilingual');
  } finally { disconnect(); bus.dispose(); }
});
