import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TextTranslator, protect, redact, translateRequest, snapshotRequest } from '../src/text.js';
import { Store, validateConfig } from '../src/store.js';
import { TranslationEngine } from '../src/engine.js';

const makeMessage = input => ({ ...input, id: crypto.randomUUID() });
const config = { enabled: true, mode: 'route', provider: 'qwen', model: 'qwen-turbo', targetProviders: ['claude-local'] };
const message = text => ({ id: 'original-message', role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text }] });
const request = () => ({ provider: 'claude-local', model: 'default', sessionId: 'session-test', system: '系统约束', messages: [message('你好')] });
const execute = async ({ text }) => { const data = JSON.parse(text); return { text: data.targetLanguage === 'English' ? data.text.replaceAll('系统约束', 'System rules').replaceAll('你好', 'Hello').replaceAll('插件上下文', 'Plugin context') : '你好，已完成。', usage: { inputTokens: 4, outputTokens: 3 } }; };

test('protects code, URLs and credentials without changing their bytes', () => {
  const original = '你好 `中文键` https://example.com/中文 ```js\nconst x="中文";\n``` sk-abcdefghijklmnop';
  const shield = protect(original);
  assert.equal(shield.restore(shield.text.replace('你好', 'Hello')), original.replace('你好', 'Hello'));
  assert.throws(() => shield.restore('missing'), { code: 'TRANSLATION_LITERAL_MISMATCH' });
});
test('English prose avoids a paid translation call', async () => {
  const translator = new TextTranslator(() => { throw Error('must not call'); });
  assert.equal(await translator.translate('Hello `中文数据`', 'en', config), 'Hello `中文数据`');
});
test('rejects Chinese remaining in translated prose', async () => {
  const translator = new TextTranslator(async () => '未翻译');
  await assert.rejects(translator.translate('你好', 'en', config), { code: 'TRANSLATION_NOT_ENGLISH' });
});
test('rejects invented end markers found during real provider acceptance', async () => {
  const translator = new TextTranslator(async () => 'Hello. DSHT_TRANSLATION_END');
  await assert.rejects(translator.translate('你好', 'en', config), { code: 'TRANSLATION_LITERAL_MISMATCH' });
});
test('caches repeated injection translations', async () => {
  let count = 0;
  const translator = new TextTranslator(async args => { count++; return execute(args); });
  assert.equal(await translator.translate('你好', 'en', config), 'Hello');
  assert.equal(await translator.translate('你好', 'en', config), 'Hello');
  assert.equal(count, 1);
});
test('translates system and plugin injection, preserves immutable source and images', async () => {
  const original = request();
  original.messages.push({ ...message('插件上下文'), id: 'injection', source: { kind: 'plugin', plugin: 'native-image-routing' } });
  original.messages[0].content.push({ type: 'image', attachment: { id: 'image-1', mediaType: 'image/png' } });
  const copy = structuredClone(original);
  Object.freeze(original); Object.freeze(original.messages);
  const { request: forwarded, mapping } = await translateRequest(original, new TextTranslator(execute), config, makeMessage);
  assert.deepEqual(original, copy);
  assert.match(forwarded.system, /System rules/);
  assert.equal(forwarded.messages[1].content[0].text, 'Plugin context');
  assert.deepEqual(forwarded.messages[0].content[1], copy.messages[0].content[1]);
  assert.notEqual(mapping[0].forwardedId, original.messages[0].id);
});
test('tool call arguments and tool results stay byte-for-byte unchanged', async () => {
  const original = request();
  original.messages[0].content = [{ type: 'tool-call', name: 'Read', id: 'call-1', arguments: '{"path":"/tmp/中文"}' }, { type: 'tool-result', toolCallId: 'call-1', content: [{ type: 'text', text: '{"真实数据":"你好"}' }] }];
  const result = await translateRequest(original, new TextTranslator(execute), config, makeMessage);
  assert.deepEqual(result.request.messages[0].content, original.messages[0].content);
});
test('configuration rejects recursive routing and unsafe endpoint credentials', () => {
  assert.throws(() => validateConfig({ ...config, provider: 'claude-local' }));
  assert.throws(() => validateConfig({ ...config, baseURL: 'https://key:secret@api.example.com/v1' }));
  assert.throws(() => validateConfig({ ...config, apiKey: 'not-in-config' }));
});
test('raw snapshots omit image bytes and redact known credential formats', () => {
  const original = request();
  original.messages[0].content = [{ type: 'text', text: 'sk-abcdefghijklmnop' }, { type: 'image', data: 'PRIVATE-IMAGE' }];
  const json = JSON.stringify(snapshotRequest(original));
  assert.ok(!json.includes('sk-abcdefghijklmnop'));
  assert.ok(!json.includes('PRIVATE-IMAGE'));
  assert.match(json, /imageDataOmitted/);
});
test('redacts JSON credential fields and bearer tokens without breaking JSON', () => {
  const parsed = JSON.parse(redact(JSON.stringify({ password: 'private-value', authorization: 'Bearer abcdefghijklmnop', apiKey: 'unprefixed-secret' })));
  assert.equal(parsed.password, '[REDACTED]'); assert.equal(parsed.apiKey, '[REDACTED]');
  assert.ok(!redact('Authorization: Bearer abcdefghijklmnop').includes('abcdefghijklmnop'));
});
test('preserves Chinese paths and structured JSON as literal data', async () => {
  const translator = new TextTranslator(execute);
  assert.equal(await translator.translate('你好 /tmp/中文.html', 'en', config), 'Hello /tmp/中文.html');
  const original = request(); original.messages[0].content[0].text = '{"中文键":"真实数据"}';
  const result = await translateRequest(original, translator, config, makeMessage);
  assert.equal(result.request.messages[0].content[0].text, original.messages[0].content[0].text);
});

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-translate-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const store = new Store(directory); await store.init(); await store.saveConfig(config);
  return store;
}
async function collect(stream) { const values = []; for await (const value of stream) values.push(value); return values; }
async function* englishReply() {
  yield { type: 'block-start', index: 0, blockType: 'text' };
  yield { type: 'text-delta', index: 0, text: 'Hello.' };
  yield { type: 'block-end', index: 0, block: { type: 'text', text: 'Hello.' } };
  yield { type: 'finish', reason: { kind: 'stop' } };
}
test('forwards translated input once and retains the exact English response', async t => {
  const store = await fixture(t); let dispatched = 0;
  const engine = new TranslationEngine({ store, execute, makeMessage, dispatch: options => { dispatched++; assert.equal(options.messages[0].content[0].text, 'Hello'); assert.equal(engine.enabled(options), false); return englishReply(); } });
  const chunks = await collect(engine.stream(request(), () => { throw Error('original must not dispatch'); }));
  assert.equal(dispatched, 1);
  assert.equal(chunks.at(-1).type, 'finish');
  const [run] = await store.list('session-test');
  assert.equal(run.status, 'succeeded'); assert.equal(run.rawOutput, 'Hello.'); assert.equal(run.translatedOutput, '你好，已完成。');
  assert.equal(run.original.messages[0].content[0].text, '你好');
  assert.equal(run.forwarded.messages[0].content[0].text, 'Hello');
  assert.equal((await stat(join(store.runs, `${run.id}.json`))).mode & 0o777, 0o600);
});
test('input translation failure blocks Claude and saves a useful failed trace', async t => {
  const store = await fixture(t); let dispatched = false;
  const engine = new TranslationEngine({ store, makeMessage, execute: async () => { throw Error('provider down'); }, dispatch: () => { dispatched = true; return englishReply(); } });
  await assert.rejects(collect(engine.stream(request(), () => englishReply())));
  assert.equal(dispatched, false);
  const [run] = await store.list('session-test'); assert.equal(run.status, 'failed'); assert.equal(run.forwarded, undefined);
});
test('output translation failure does not discard a successful Claude answer', async t => {
  const store = await fixture(t);
  const engine = new TranslationEngine({ store, makeMessage, execute: args => JSON.parse(args.text).targetLanguage === 'English' ? execute(args) : Promise.reject(Error('display translator down')), dispatch: englishReply });
  await collect(engine.stream(request(), () => englishReply()));
  const [run] = await store.list('session-test'); assert.equal(run.status, 'partial'); assert.equal(run.rawOutput, 'Hello.');
});
test('other model routes and disabled sessions are untouched', async t => {
  const store = await fixture(t); let called = 0;
  const engine = new TranslationEngine({ store, makeMessage, execute: () => { throw Error('unexpected'); }, dispatch: () => { throw Error('unexpected'); } });
  await collect(engine.stream({ ...request(), provider: 'qwen' }, () => { called++; return englishReply(); }));
  await store.saveConfig({ sessions: { 'session-test': false } });
  await collect(engine.stream(request(), () => { called++; return englishReply(); }));
  assert.equal(called, 2); assert.deepEqual(await store.list('session-test'), []);
});
test('cancelled input translation never dispatches Claude', async t => {
  const store = await fixture(t); const controller = new AbortController(); controller.abort();
  const engine = new TranslationEngine({ store, makeMessage, execute, dispatch: () => { throw Error('unexpected'); } });
  await assert.rejects(collect(engine.stream({ ...request(), signal: controller.signal }, englishReply)));
  assert.equal((await store.list('session-test'))[0].status, 'cancelled');
});
test('history survives restart without changing session ownership', async t => {
  const store = await fixture(t);
  const run = { id: 'tr_1234', sessionId: 'session-first', startedAt: Date.now(), status: 'succeeded' };
  await store.save(run); const reopened = new Store(store.directory); await reopened.init();
  assert.equal((await reopened.list('session-first'))[0].id, run.id);
  assert.deepEqual(await reopened.list('session-second'), []);
  await assert.rejects(reopened.list('../config'));
});
