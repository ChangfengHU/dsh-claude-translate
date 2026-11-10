import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialDisplay } from '../src/chat-display.js';
test('initial display is session scoped, bounded and does not read disk', () => {
  const runs = Array.from({ length: 100 }, (_, i) => ({ id: String(i) }));
  const calls = [];
  const store = { displayRuns(session, ids) { calls.push([session, ids]); return [{ id: ids[0], translatedOutput: '中文'.repeat(20000) }]; } };
  const result = initialDisplay(store, 's', runs);
  assert.ok(Buffer.byteLength(JSON.stringify(result)) <= 65536);
  assert.equal(calls.length, 8); assert.ok(calls.every(c => c[0] === 's'));
});
test('cached complete bodies accompany metadata without omitting small newer responses', () => {
  const store = { displayRuns: (_, [id]) => [{ id, revision: id, translatedOutput: id === 'big' ? 'x'.repeat(70000) : 'ready' }] };
  assert.deepEqual(initialDisplay(store, 's', [{ id: 'big' }, { id: 'small' }]).map(r => r.id), ['small']);
});
