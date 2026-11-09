import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Store, validateConfig } from '../src/store.js';
import { TextTranslator } from '../src/text.js';

test('1000 histories paginate without any list disk reads, survive restart and isolate sessions', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'dct-1000-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const store = new Store(dir, { maxRuns: 5000 }); await store.init(); const start = performance.now(); const now = Date.now();
  for (let i = 0; i < 1000; i++) await store.save({ id: 'tr_' + i.toString(16).padStart(8, '0'), sessionId: 'session-large', startedAt: now + i, status: 'succeeded', rawOutput: 'English result.',
    original: { model: 'default', system: 'Shared context. '.repeat(200), messages: [{ id: 'input-' + i, role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: 'Hello' }] }] },
    forwarded: { model: 'default', system: 'Shared context. '.repeat(200), messages: [{ id: 'output-' + i, role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: 'Hello' }] }] } });
  const writeMs = performance.now() - start; const readStart = performance.now(); const seen = new Set(); let cursor; let pages = 0;
  do { const page = store.page('session-large', { cursor, limit: 20 }); assert.equal(page.total, 1000); assert.ok(Buffer.byteLength(JSON.stringify(page)) < 18000); for (const r of page.runs) { assert.ok(!seen.has(r.id)); seen.add(r.id); } cursor = page.nextCursor; pages++; } while (cursor);
  const readMs = performance.now() - readStart;
  assert.equal(seen.size, 1000); assert.equal(pages, 50); assert.equal(store.metrics.detailReads, 0); assert.equal(store.metrics.listReads, 0);
  assert.equal(store.page('another-session').total, 0);
  const first = store.page('session-large'); assert.throws(() => store.page('another-session', { cursor: first.nextCursor }), { code: 'INVALID_BODY' });
  assert.equal((await store.get('session-large', first.runs[0].id)).forwarded.messages[0].id, 'output-999');
  const compact = await store.get('session-large', first.runs[0].id, { full: false }); assert.equal(compact.input, 'Hello'); assert.equal(compact.original, undefined);
  await store.prune(); const reopenStart = performance.now(); const reopened = new Store(dir, { maxRuns: 5000 }); await reopened.init();
  assert.equal(reopened.page('session-large').total, 1000);
  const blobNames = await readdir(store.blobs); assert.equal(blobNames.length, 3);
  let diskBytes = 0; for (const base of [store.runs, store.blobs]) for (const name of await readdir(base)) diskBytes += (await stat(join(base, name))).size;
  assert.ok(diskBytes < 3 * 1024 * 1024); assert.ok(readMs < 3000);
  console.log(JSON.stringify({ benchmark: '1000-runs', writeMs: Math.round(writeMs), all50PagesMs: Math.round(readMs), restartMs: Math.round(performance.now() - reopenStart), listDiskReads: store.metrics.listReads, blobFiles: blobNames.length, diskBytes }));
});
test('1000 independent session settings are supported', () => {
  const config = validateConfig({ sessions: Object.fromEntries(Array.from({ length: 1000 }, (_, i) => ['session-' + i, true])) });
  assert.equal(Object.keys(config.sessions).length, 1000);
});
test('segment cache reuses static Chinese when nearby English metadata changes', async () => {
  let calls = 0;
  const translator = new TextTranslator(async ({ text }) => { calls++; const data = JSON.parse(text); return JSON.stringify({ translations: data.segments.map(s => ({ id: s.id, text: 'Keep the workspace read-only.' })) }); });
  const config = { mode: 'route', provider: 'qwen', model: 'qwen-flash' };
  const a = await translator.translate('工作区保持只读。\nSession: a', 'en', config);
  const b = await translator.translate('工作区保持只读。\nSession: b', 'en', config);
  assert.match(a, /Session: a/); assert.match(b, /Session: b/); assert.equal(calls, 1);
});
test('active runs update list revisions without persisting token deltas', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'dct-active-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const store = new Store(dir); await store.init(); const run = { id: 'tr_abc', sessionId: 'session-a', startedAt: Date.now(), status: 'running', rawOutput: 'A' };
  store.active.set(run.id, run); const old = store.page('session-a').revision; run.rawOutput += 'B'; assert.notEqual(store.page('session-a').revision, old);
});

test('default retention automatically keeps exactly the most recent 100 and removes orphan blobs', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'dct-retention-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const store = new Store(dir); await store.init(); const now = Date.now();
  for (let i = 0; i < 105; i++) await store.save({ id: 'tr_' + i.toString(16).padStart(8, '0'), sessionId: 'session-one', startedAt: now + i, status: 'succeeded',
    original: { model: 'default', system: 'Context ' + i, messages: [] } });
  assert.equal(store.index.size, 100); assert.equal((await readdir(store.runs)).length, 100);
  assert.equal(await store.get('session-one', 'tr_00000000'), undefined);
  assert.ok(await store.get('session-one', 'tr_00000068'));
  assert.equal((await readdir(store.blobs)).length, 101);
  const reopened = new Store(dir); await reopened.init(); assert.equal(reopened.index.size, 100);
  console.log(JSON.stringify({ benchmark: 'retention-100', created: 105, retained: 100, oldTracesAndUnreferencedBlobs: 'removed' }));
});
test('concurrent save and prune operations preserve all surviving request references', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'dct-concurrent-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const store = new Store(dir, { maxRuns: 5 }); await store.init(); const now = Date.now();
  const jobs = [];
  for (let i = 0; i < 20; i++) { jobs.push(store.save({ id: 'tr_' + i.toString(16), sessionId: 'session-one', startedAt: now + i, status: 'succeeded', original: { system: 'Shared context', messages: [], model: 'default' } })); jobs.push(store.prune()); }
  await Promise.all(jobs);
  assert.equal(store.index.size, 5);
  for (const r of store.page('session-one').runs) assert.equal((await store.get('session-one', r.id)).original.system, 'Shared context');
});
