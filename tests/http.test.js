import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/store.js';
import { createHandler } from '../src/http.js';
import { StreamBypass } from '../src/bypass.js';

async function fixture(t, admit = () => ({})) {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-translate-http-'));
  const store = new Store(directory); await store.init(); let secret;
  const credentials = { describe: async () => ({ configured: !!secret }), set: async (_, value) => { secret = value; }, unset: async () => { secret = undefined; } };
  const engine = { translator: { cache: new Map(), translate: async () => 'Hello, connection verified.' } };
  const llm = { listProviders: () => [{ id: 'qwen', name: 'Qwen' }], listModels: async () => [{ id: 'qwen-turbo' }] };
  const server = createServer(createHandler({ store, engine, credentials, llm, admit })); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  t.after(async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); });
  const post = (path, value, origin = base) => fetch(base + '/api/claude-translate' + path, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(value) });
  return { store, base, post };
}
test('connection admission fails closed', async t => {
  const { base } = await fixture(t, () => ({ rejection: 401 }));
  assert.equal((await fetch(base + '/api/claude-translate/state')).status, 401);
});
test('same-origin required for configuration writes', async t => {
  const { post } = await fixture(t);
  assert.equal((await post('/config', { model: 'qwen-turbo' }, 'https://attacker.example')).status, 403);
});
test('configuration stores keys through credentials without returning them', async t => {
  const { post, base, store } = await fixture(t);
  const response = await post('/config', { provider: 'qwen', model: 'qwen-turbo', apiKey: 'private-test-key' });
  assert.equal(response.status, 200);
  assert.ok(!(await response.text()).includes('private-test-key'));
  const state = await (await fetch(base + '/api/claude-translate/state')).json();
  assert.equal(state.credentialConfigured, true); assert.equal(store.config.apiKey, undefined);
});
test('invalid configuration cannot mutate a credential first', async t => {
  const { post, base } = await fixture(t);
  assert.equal((await post('/config', { apiKey: 'private-test-key', unknown: true })).status, 400);
  const state = await (await fetch(base + '/api/claude-translate/state')).json(); assert.equal(state.credentialConfigured, false);
});
test('session toggles preserve other sessions', async t => {
  const { post, store } = await fixture(t);
  await Promise.all([post('/session', { sessionId: 'session-a', enabled: true }), post('/session', { sessionId: 'session-b', enabled: false })]);
  assert.deepEqual(store.config.sessions, { 'session-a': true, 'session-b': false });
});
test('model discovery refuses Claude translation routes', async t => {
  const { base } = await fixture(t);
  assert.equal((await fetch(base + '/api/claude-translate/models?provider=claude-local')).status, 400);
});
test('run retrieval is bound to the requested session', async t => {
  const { base, store } = await fixture(t);
  await store.save({ id: 'tr_1234', sessionId: 'session-a', startedAt: Date.now(), status: 'succeeded', original: { model: 'default', messages: [] } });
  assert.equal((await fetch(base + '/api/claude-translate/run?session=session-b&id=tr_1234')).status, 404);
  assert.equal((await fetch(base + '/api/claude-translate/run?session=session-a&id=tr_1234')).status, 200);
});
test('Chat metadata, display batches and preferences stay session scoped', async t => {
  const { post, base, store } = await fixture(t);
  await store.save({ id: 'tr_ab12', sessionId: 'session-a', purpose: 'conversation', startedAt: Date.now(), status: 'succeeded', rawOutput: 'Three tasks.', translatedOutput: '三件事。', displayStatus: 'ready', position: { turn: 2, step: 1 } });
  assert.equal((await post('/presentation', { sessionId: 'session-a', presentation: { mode: 'bilingual', layout: 'collapsed' } })).status, 200);
  const a = await (await fetch(base + '/api/claude-translate/chat?session=session-a')).json();
  assert.equal(a.presentation.layout, 'collapsed'); assert.equal(a.runs[0].rawOutput, undefined);
  const unchanged = await (await fetch(base + '/api/claude-translate/chat?session=session-a&revision=' + a.revision)).json(); assert.equal(unchanged.unchanged, true);
  const b = await (await fetch(base + '/api/claude-translate/chat?session=session-b')).json(); assert.equal(b.presentation.mode, 'zh'); assert.equal(b.runs.length, 0);
  assert.deepEqual((await (await fetch(base + '/api/claude-translate/display?session=session-b&ids=tr_ab12')).json()).runs, []);
  assert.equal((await (await fetch(base + '/api/claude-translate/display?session=session-a&ids=tr_ab12')).json()).runs[0].translatedOutput, '三件事。');
  assert.equal((await post('/presentation', { sessionId: 'session-a', presentation: { mode: 'zh', layout: 'bad' } })).status, 400);
  assert.equal((await post('/presentation', { sessionId: 'session-a', presentation: { mode: 'en', layout: 'stacked' } }, 'https://attacker.example')).status, 403);
});
test('translation connection test never calls Claude', async t => {
  const { post } = await fixture(t);
  const response = await post('/test', {}); assert.equal(response.status, 200); assert.equal((await response.json()).output, 'Hello, connection verified.');
});
test('async-local bypass survives cloned options and iterator cleanup', async () => {
  const bypass = new StreamBypass(); let cleaned = false; let calls = 0;
  const dispatch = request => { assert.equal(bypass.active, true); return (async function* () { try { assert.equal(bypass.active, true); const clone = structuredClone(request); assert.notEqual(clone, request); calls++; yield clone; } finally { cleaned = true; } })(); };
  for await (const item of bypass.stream(dispatch, { message: 'Hello' })) { assert.equal(bypass.active, false); assert.equal(item.message, 'Hello'); break; }
  assert.equal(calls, 1); assert.equal(cleaned, true); assert.equal(bypass.active, false);
});
