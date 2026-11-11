import { failure } from './text.js';

function providerFailure(status, message = '', code = '') {
  if (status === 401 || status === 403) return failure('TRANSLATION_AUTH', 'The translation source rejected authentication. Check its sign-in or API key.');
  if (status === 402 || /quota|insufficient.balance/i.test(message + code)) return failure('TRANSLATION_QUOTA', 'The translation source has insufficient balance or quota.');
  if (status === 429) return failure('TRANSLATION_RATE_LIMIT', 'The translation source is rate-limited. Try again shortly.');
  if (/model_not_found|model[^\n]{0,120}(?:not supported|not available|does not exist)/i.test(message + code)) return failure('TRANSLATION_MODEL_UNAVAILABLE', 'This model is not available to the signed-in account. Choose another model or source.');
  return failure('TRANSLATION_PROVIDER_ERROR', 'The translation source failed. Check its model, network and service status.');
}

export function translationSignal(signal, timeoutMs) {
  return signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs);
}

export function createExecutor({ dispatch, makeMessage, credentials, fetcher = fetch }) {
  return async ({ system, text, config, signal, onProgress }) => {
    const bounded = translationSignal(signal, config.timeoutMs);
    let lastProgress = 0;
    const progress = (value, force = false) => { if (onProgress && (force || Date.now() - lastProgress >= 50)) { lastProgress = Date.now(); onProgress(value); } };
    if (config.mode === 'api') {
      const resolved = await credentials.resolve('DSH_CLAUDE_TRANSLATE_API_KEY');
      const key = resolved?.value?.trim();
      if (!key) throw failure('MISSING_CREDENTIAL', 'Configure the translation API key.');
      const response = await fetcher(config.baseURL.replace(/\/+$/, '') + '/chat/completions', {
        method: 'POST', redirect: 'error', signal: bounded,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: config.model, stream: !!onProgress, temperature: 0, messages: [{ role: 'system', content: system }, { role: 'user', content: text }] }),
      });
      if (!response.ok) throw providerFailure(response.status);
      if (response.headers.get('content-type')?.includes('text/event-stream')) {
        let buffer = '', output = '', usage = null, complete = false, bytes = 0;
        const decoder = new TextDecoder();
        const consume = line => {
          if (!line.startsWith('data:')) return;
          const raw = line.slice(5).trim(); if (!raw || raw === '[DONE]') return;
          const data = JSON.parse(raw);
          if (data.error) throw providerFailure(data.error.status, '', data.error.code);
          usage = data.usage ?? usage;
          for (const choice of data.choices ?? []) {
            if (choice.delta?.tool_calls?.length) throw failure('TRANSLATION_TOOL_CALL', 'A translation source requested tools.');
            if (typeof choice.delta?.content === 'string') { output += choice.delta.content; progress(output); }
            if (choice.finish_reason) {
              if (choice.finish_reason !== 'stop') throw failure('TRANSLATION_INCOMPLETE', 'The translation source stopped before completion.');
              complete = true;
            }
          }
        };
        for await (const part of response.body) {
          bounded.throwIfAborted(); bytes += part.length;
          if (bytes > 2 * 1024 * 1024) throw failure('TRANSLATION_TOO_LARGE', 'Translation response exceeds 2 MiB.');
          buffer += decoder.decode(part, { stream: true });
          let end; while ((end = buffer.indexOf('\n')) !== -1) { consume(buffer.slice(0, end).trim()); buffer = buffer.slice(end + 1); }
        }
        bounded.throwIfAborted(); buffer += decoder.decode(); if (buffer.trim()) consume(buffer.trim());
        if (!complete) throw failure('TRANSLATION_INCOMPLETE', 'The translation stream ended without completion.');
        progress(output, true); return { text: output, usage };
      }
      const body = await response.text();
      if (body.length > 2 * 1024 * 1024) throw failure('TRANSLATION_TOO_LARGE', 'Translation response exceeds 2 MiB.');
      const data = JSON.parse(body);
      const choice = data.choices?.[0];
      if (choice?.finish_reason && choice.finish_reason !== 'stop') throw failure('TRANSLATION_INCOMPLETE', 'Translation response did not complete normally.');
      if (typeof choice?.message?.content !== 'string') throw failure('TRANSLATION_EMPTY', 'Translation provider returned no text.');
      progress(choice.message.content, true); return { text: choice.message.content, usage: data.usage ?? null };
    }
    const request = { provider: config.provider, model: config.model, system, messages: [makeMessage({ role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text }] })], tools: [], signal: bounded, ...(/codex/i.test(config.provider) ? {} : { temperature: 0 }) };
    const blocks = new Map(); let usage = null; let complete = false;
    for await (const chunk of dispatch(request)) {
      bounded.throwIfAborted();
      if (chunk.type === 'text-delta') { blocks.set(chunk.index, (blocks.get(chunk.index) ?? '') + chunk.text); progress([...blocks.values()].join('\n\n')); }
      if (chunk.type === 'block-end' && chunk.block.type === 'text') { blocks.set(chunk.index, chunk.block.text); progress([...blocks.values()].join('\n\n'), true); }
      if (chunk.type === 'usage') usage = chunk.usage;
      if ([...blocks.values()].reduce((n, value) => n + value.length, 0) > 2 * 1024 * 1024) throw failure('TRANSLATION_TOO_LARGE', 'Translation response exceeds 2 MiB.');
      if (chunk.type === 'tool-call-delta' || (chunk.type === 'block-end' && chunk.block.type === 'tool-call')) throw failure('TRANSLATION_TOOL_CALL', 'A translation model requested tools instead of returning a translation.');
      if (chunk.type === 'finish') {
        if (chunk.reason.kind === 'error') throw providerFailure(chunk.reason.failure?.status, chunk.reason.failure?.message, chunk.reason.failure?.code);
        if (chunk.reason.kind !== 'stop') throw failure('TRANSLATION_INCOMPLETE', 'The translation model did not complete normally.');
        complete = true;
      }
    }
    if (!complete) throw failure('TRANSLATION_INCOMPLETE', 'The translation stream ended without completion.');
    progress([...blocks.values()].join('\n\n'), true);
    return { text: [...blocks.values()].join('\n\n'), usage };
  };
}
