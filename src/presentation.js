import { failure } from './text.js';

export const DEFAULT_PRESENTATION = Object.freeze({ mode: 'zh', layout: 'parallel' });
export function validatePresentation(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !['mode', 'layout'].includes(k)) || !['zh', 'en', 'bilingual'].includes(value.mode) || !['parallel', 'stacked', 'collapsed'].includes(value.layout)) throw failure('INVALID_CONFIG', 'Invalid reply presentation.');
  return { mode: value.mode, layout: value.layout };
}

// Correlate by the native step identity, never by an answer string alone.
export function currentPosition(events = []) {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    if (event.type === 'step/end' || event.type === 'turn/end') return undefined;
    if (event.type === 'step/start') return { turn: event.data.turn, step: event.data.step };
  }
}
export function legacyPosition(run, events = []) {
  const lastId = run.original?.messages?.at(-1)?.id;
  if (!lastId || !run.rawOutput) return undefined;
  let previous;
  const matches = [];
  for (const event of events) {
    if (event.type === 'assistant/message') {
      const text = event.data.message.content.filter(b => b.type === 'text').map(b => b.text).join('\n\n');
      if (previous === lastId && text === run.rawOutput) matches.push({ turn: event.data.turn, step: event.data.step });
      previous = event.data.message.id;
    } else if (event.type === 'user/message') previous = event.data.id;
    else if (event.type === 'tool/result' && event.data.message?.id) previous = event.data.message.id;
  }
  return matches.length === 1 ? matches[0] : undefined;
}
