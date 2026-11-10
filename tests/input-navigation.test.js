import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import vm from 'node:vm';
import { lastUserText, userInputIdentity } from '../src/presentation.js';
import { Store } from '../src/store.js';
import { TranslationEngine } from '../src/engine.js';

async function client() {
  let plugin;
  const source = (await readFile(new URL('../client/index.js', import.meta.url), 'utf8')).replace("return { name: NS, inject: ['slots', 'locale'], apply };", "return { name: NS, inject: ['slots', 'locale'], apply, navigationAfterSend, indexUserInputs, followChatStore };");
  vm.runInNewContext(source, { window: { __ModuleLoader__: { load: m => { plugin = m.factory(() => ({ createElement() {} })); } } } });
  return plugin;
}
const input = (draft, draftRev, phase = 'plain', imageIds = []) => ({ draft, draftRev, phase, imageIds });

test('navigation hook follows native chat store even when it registers later', async () => {
  const p = await client(); let entries = [], notify, registrations = 0, disposed = 0;
  const slots = {
    entries: () => entries,
    subscribe: (_key, fn) => { notify = fn; return () => { notify = undefined; }; },
    register: options => { assert.equal(options.store, entries[0].store); registrations++; return () => { disposed++; }; },
  };
  const stop = p.followChatStore(slots);
  assert.equal(registrations, 0);
  entries = [{ options: {}, store: {} }]; notify(); notify();
  assert.equal(registrations, 1);
  entries = [{ options: {}, store: {} }]; notify();
  assert.equal(registrations, 2); assert.equal(disposed, 1);
  stop(); assert.equal(disposed, 2); assert.equal(notify, undefined);
});

test('accepted sends switch once; typing, history and rejected sends do not', async () => {
  const p = await client();
  let state = p.navigationAfterSend(undefined, 's1', input('Weekend checklist', 1)).state;
  let next = p.navigationAfterSend(state, 's1', input('Weekend checklist', 1, 'submitting'));
  assert.equal(next.showChat, false); state = next.state;
  next = p.navigationAfterSend(state, 's1', input('', 2));
  assert.equal(next.showChat, true);
  assert.equal(p.navigationAfterSend(next.state, 's1', input('', 2)).showChat, false);
  assert.equal(p.navigationAfterSend(state, 's1', input('Weekend checklist', 1), { message: 'Rejected' }).showChat, false);
  assert.equal(p.navigationAfterSend(state, 's2', input('', 2)).showChat, false);
  assert.equal(p.navigationAfterSend(undefined, 's1', input('', 100)).showChat, false);
});

test('image-only commit navigates, manual image removal does not', async () => {
  const p = await client();
  const state = p.navigationAfterSend(undefined, 's1', input('', 4, 'plain', ['image1'])).state;
  assert.equal(p.navigationAfterSend(state, 's1', input('', 5)).showChat, true);
  assert.equal(p.navigationAfterSend(state, 's1', input('', 4)).showChat, false);
});

test('actual input identity uses durable user id and event seq, not equal text', () => {
  const message = id => ({ id, source: { kind: 'user' }, content: [{ type: 'text', text: 'Same request' }, { type: 'image', id: 'img' }, { type: 'text', text: 'Keep file names' }] });
  const events = [{ type: 'user/message', seq: 4, data: message('old') }, { type: 'user/message', seq: 8, data: message('new') }];
  assert.deepEqual(userInputIdentity({ messages: [message('new')] }, events), { messageId: 'new', seq: 8 });
  assert.equal(userInputIdentity({ messages: [message('unknown')] }, events), undefined);
  assert.equal(lastUserText({ messages: [message('new')] }), 'Same request\n\nKeep file names');
});

test('client indexes conversation inputs by seq and prefers the newest trace', async () => {
  const p = await client();
  const runs = [{ id: 'old', purpose: 'conversation', startedAt: 1, inputIdentity: { seq: 4 } }, { id: 'new', purpose: 'conversation', startedAt: 2, inputIdentity: { seq: 4 } }, { id: 'aux', purpose: 'session-title', startedAt: 3, inputIdentity: { seq: 4 } }];
  assert.equal(p.indexUserInputs(runs).get(4).id, 'new');
  assert.equal(p.indexUserInputs(runs).size, 1);
});

test('captured English remains session scoped and survives restart without blob reads', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'dct-input-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const store = new Store(dir); await store.init();
  await store.saveConfig({ enabled: true, provider: 'qwen', model: 'qwen-flash' });
  const request = { sessionId: 'session-input', provider: 'claude-local', model: 'default', messages: [{ id: 'user-1', source: { kind: 'user' }, content: [{ type: 'text', text: 'Weekend checklist' }] }] };
  const answer = async function* () { yield { type: 'finish', reason: { kind: 'stop' } }; };
  const engine = new TranslationEngine({ store, makeMessage: m => ({ ...m, id: crypto.randomUUID() }), inputIdentity: () => ({ messageId: 'user-1', seq: 12 }), dispatch: answer, execute: async () => { throw new Error('English input should not translate'); } });
  for await (const chunk of engine.stream(request, answer)) void chunk;
  await engine.idle();
  const meta = store.displayPage('session-input')[0];
  assert.deepEqual(meta.inputIdentity, { messageId: 'user-1', seq: 12 });
  assert.equal(meta.purpose, 'conversation'); assert.ok(meta.forwardedAt);
  assert.equal(meta.forwardedInput, undefined);
  const next = new Store(dir); await next.init();
  const reads = next.metrics.detailReads;
  assert.equal(next.displayRuns('session-input', [meta.id])[0].forwardedInput, 'Weekend checklist');
  assert.deepEqual(next.displayRuns('another-session', [meta.id]), []);
  assert.equal(next.metrics.detailReads, reads);
});
