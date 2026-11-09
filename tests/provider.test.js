import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createExecutor } from '../src/provider.js';
const config = { mode: 'api', baseURL: 'https://example.com/v1', model: 'qwen-turbo', timeoutMs: 1000 };
const credentials = { resolve: async () => ({ value: 'private-api-value' }) };
const makeMessage = input => ({ ...input, id: 'translation-only' });
test('API key stays in the server header and requests refuse redirects', async () => {
  const execute = createExecutor({ credentials, makeMessage, fetcher: async (url, request) => {
    assert.equal(url, 'https://example.com/v1/chat/completions'); assert.equal(request.redirect, 'error');
    assert.equal(request.headers.authorization, 'Bearer private-api-value');
    assert.ok(!request.body.includes('private-api-value'));
    return new Response(JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: 'Hello' } }] }));
  } });
  assert.equal((await execute({ config, system: 'Translate only', text: 'data' })).text, 'Hello');
});
test('missing translation credentials fail before network I/O', async () => {
  const execute = createExecutor({ credentials: { resolve: async () => undefined }, makeMessage, fetcher: () => { throw Error('must not fetch'); } });
  await assert.rejects(execute({ config, system: '', text: '' }), { code: 'MISSING_CREDENTIAL' });
});
test('truncated API translations are rejected', async () => {
  const execute = createExecutor({ credentials, makeMessage, fetcher: async () => new Response(JSON.stringify({ choices: [{ finish_reason: 'length', message: { content: 'part' } }] })) });
  await assert.rejects(execute({ config, system: '', text: '' }), { code: 'TRANSLATION_INCOMPLETE' });
});
test('existing DSH route supports local Codex or Qwen without an extra key', async () => {
  const execute = createExecutor({ credentials, makeMessage, dispatch: async function* (request) {
    assert.equal(request.provider, 'codex-local'); assert.deepEqual(request.tools, []); assert.equal(request.sessionId, undefined);
    yield { type: 'text-delta', index: 0, text: 'Hello' };
    yield { type: 'block-end', index: 0, block: { type: 'text', text: 'Hello' } };
    yield { type: 'finish', reason: { kind: 'stop' } };
  } });
  assert.equal((await execute({ config: { ...config, mode: 'route', provider: 'codex-local' }, system: 'Translate only', text: 'source' })).text, 'Hello');
});
test('translation route cannot return a tool call', async () => {
  const execute = createExecutor({ credentials, makeMessage, dispatch: async function* () { yield { type: 'tool-call-delta', index: 0, name: 'Bash', argumentsDelta: '{}' }; } });
  await assert.rejects(execute({ config: { ...config, mode: 'route', provider: 'qwen' }, system: '', text: '' }), { code: 'TRANSLATION_TOOL_CALL' });
});

test('Qwen translation uses deterministic temperature; local Codex receives no unsupported sampling option', async () => {
  let got;
  const executor = createExecutor({ credentials: {}, makeMessage: input => input, dispatch: request => { got = request; return (async function* () { yield { type: 'block-end', index: 0, block: { type: 'text', text: '{"translations":[]}' } }; yield { type: 'finish', reason: { kind: 'stop' } }; })(); } });
  await executor({ system: 'Translate literally.', text: 'Hello', config: { mode: 'route', provider: 'qwen', model: 'qwen-flash', timeoutMs: 1000 } });
  assert.equal(got.temperature, 0);
  await executor({ system: 'Translate literally.', text: 'Hello', config: { mode: 'route', provider: 'codex-local', model: 'default', timeoutMs: 1000 } });
  assert.equal(got.temperature, undefined);
});
