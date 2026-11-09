import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRpcHandler } from '../src/rpc.js';
const store = { config: { enabled: false }, active: new Map(), list: async session => session === 'session-a' ? [{ id: 'tr_12', original: { model: 'default', messages: [] } }] : [] };
const ports = { store, credentials: { describe: async () => ({ configured: false }) }, llm: { listProviders: () => [] }, engine: {} };
test('native Connection RPC carries state without depending on connection.admit', async () => {
  const result = await createRpcHandler(ports)('state', {}, new AbortController().signal);
  assert.equal(result.ok, true); assert.equal(result.value.credentialConfigured, false);
});
test('native Connection RPC rejects large and unknown endpoint payloads', async () => {
  assert.equal((await createRpcHandler(ports)('state', { x: 'x'.repeat(21000) })).ok, false);
  assert.equal((await createRpcHandler(ports)('unknown', {})).ok, false);
});
test('native Connection RPC preserves session-bound retrieval', async () => {
  const result = await createRpcHandler(ports)('run', { session: 'session-b', id: 'tr_12' });
  assert.equal(result.ok, false); assert.equal(result.error.code, 'not-found');
});
