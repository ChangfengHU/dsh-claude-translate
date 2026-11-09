import { Readable } from 'node:stream';
import { createHandler, PREFIX } from './http.js';

export const CHANNEL = '/claude-translate';

/** Adapt the validated endpoint logic only after DSH Connection admits its RPC channel. */
export function createRpcHandler(ports) {
  const handler = createHandler({ ...ports, admit: () => ({}) });
  return async (endpoint, payload, signal) => {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) || Buffer.byteLength(JSON.stringify(payload)) > 20000) return { ok: false, error: { code: 'bad-request', message: 'Invalid translation request.', details: {} } };
    const reads = new Set(['state', 'runs', 'run', 'models', 'chat', 'display']);
    const writes = new Set(['config', 'session', 'test', 'presentation']);
    if (!reads.has(endpoint) && !writes.has(endpoint)) return { ok: false, error: { code: 'not-found', message: 'Unknown translation endpoint.', details: {} } };
    const query = reads.has(endpoint) ? '?' + new URLSearchParams(payload).toString() : '';
    const request = Readable.from(reads.has(endpoint) ? [] : [Buffer.from(JSON.stringify(payload))]);
    request.url = PREFIX + '/' + endpoint + query;
    request.method = reads.has(endpoint) ? 'GET' : 'POST';
    request.headers = { 'content-type': 'application/json', origin: 'http://connection.internal', host: 'connection.internal' };
    request.signal = signal;
    let status;
    let body;
    await handler(request, { writeHead(code) { status = code; }, end(value) { body = value; } });
    const result = JSON.parse(body);
    if (status >= 200 && status < 300) return { ok: true, value: result };
    return { ok: false, error: { code: status === 400 ? 'bad-request' : status === 404 ? 'not-found' : 'internal', message: result.error, details: { pluginCode: result.code } } };
  };
}
