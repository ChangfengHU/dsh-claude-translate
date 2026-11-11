import { failure, redact } from './text.js';
import { validateConfig } from './store.js';
import { validatePresentation } from './presentation.js';
import { hash } from './text.js';
import { initialDisplay } from './chat-display.js';
import { claudeRoutes, selectTranslationModel, translationModels, validateSelection } from './catalog.js';

export const PREFIX = '/api/claude-translate';
export async function readJson(req, maxBytes = 20000) {
  if (!String(req.headers['content-type'] ?? '').startsWith('application/json')) throw failure('INVALID_BODY', 'Use application/json.');
  let bytes = 0; const parts = [];
  for await (const part of req) { bytes += part.length; if (bytes > maxBytes) throw failure('INVALID_BODY', 'Request body exceeds its limit.'); parts.push(part); }
  const value = JSON.parse(Buffer.concat(parts).toString('utf8'));
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw failure('INVALID_BODY', 'A JSON object is required.');
  return value;
}

export function createHandler({ store, engine, credentials, llm, admit, reconcile = async () => {} }) {
  return async (req, res) => {
    function json(status, value) {
      const body = JSON.stringify(value);
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'content-length': Buffer.byteLength(body) });
      res.end(body);
    }
    try {
      const admission = await admit(req);
      if (!admission || typeof admission !== 'object' || 'rejection' in admission) { json(typeof admission?.rejection === 'number' ? admission.rejection : 403, { error: 'Access denied.' }); return; }
      const url = new URL(req.url, 'http://localhost');
      const action = url.pathname.slice(PREFIX.length);
      const session = url.searchParams.get('session');
      if (req.method === 'POST') {
        let origin;
        try { origin = new URL(req.headers.origin).host; } catch {}
        if (!origin || origin !== req.headers.host) { json(403, { error: 'Same-origin configuration requests are required.' }); return; }
      }
      if (req.method === 'GET' && action === '/state') {
        const info = await credentials.describe('DSH_CLAUDE_TRANSLATE_API_KEY');
        const providers = await Promise.all(llm.listProviders().map(async p => {
          const models = await llm.listModels?.(p.id).catch(() => []) ?? [];
          return { ...p, models: models.map(m => ({ id: m.id, name: m.name })), name: models.length && models.every(m => /^qwen(?:[-_.]|$)/i.test(m.id)) ? 'Qwen' : p.id === 'codex-local' ? 'Codex' : p.name };
        }));
        const targets = claudeRoutes(providers);
        const config = { ...store.config, targetProviders: targets, sessions: session && Object.hasOwn(store.config.sessions, session) ? { [session]: store.config.sessions[session] } : {}, sessionPresentation: session && store.config.sessionPresentation[session] ? { [session]: store.config.sessionPresentation[session] } : {} };
        const qwen = providers.find(p => p.name === 'Qwen' && p.models.some(m => m.id === 'qwen-flash'));
        json(200, { version: '0.3.6', config, recommendation: qwen ? { provider: qwen.id, model: 'qwen-flash' } : null, credentialConfigured: info.configured ?? info.present ?? false, providers, active: store.active.size, displayJobs: engine.jobs?.size ?? 0,
          environment: { claudeRoute: targets.length > 0, codexRoute: providers.some(p => /codex/i.test(p.id)) },
          history: { maxRuns: store.maxRuns, maxBytes: store.maxBytes } });
      } else if (req.method === 'GET' && (action === '/chat' || action === '/watch')) {
        store.session(session ?? '');
        if (action === '/watch') await store.waitForChange(session, Number(url.searchParams.get('after')), req.signal);
        else await reconcile(session);
        const runs = store.displayPage(session);
        const presentation = store.config.sessionPresentation[session] ?? store.config.presentation;
        const enabled = store.config.sessions[session] ?? store.config.enabled;
        const revision = hash(JSON.stringify([runs, presentation, enabled]));
        const watchRevision = store.liveRevision(session);
        json(200, revision === url.searchParams.get('revision') ? { unchanged: true, revision, watchRevision } : { revision, watchRevision, runs, presentation, enabled, display: enabled ? initialDisplay(store, session, runs) : [] });
      } else if (req.method === 'GET' && action === '/display') {
        const ids = (url.searchParams.get('ids') ?? '').split(',').filter(Boolean);
        json(200, { runs: store.displayRuns(session ?? '', ids) });
      } else if (req.method === 'POST' && action === '/presentation') {
        const body = await readJson(req);
        store.session(body.sessionId ?? '');
        const preference = validatePresentation(body.presentation);
        await store.saveConfig(c => ({ sessionPresentation: { ...c.sessionPresentation, [body.sessionId]: preference } }));
        json(200, { ok: true, presentation: preference });
      } else if (req.method === 'GET' && action === '/runs') {
        const page = store.page(session ?? '', { cursor: url.searchParams.get('cursor'), limit: Number(url.searchParams.get('limit') ?? 20), includeAux: url.searchParams.get('includeAux') === 'true', query: url.searchParams.get('query') ?? '' });
        json(200, url.searchParams.get('revision') === page.revision ? { unchanged: true, revision: page.revision, total: page.total } : page);
      } else if (req.method === 'GET' && action === '/run') {
        const run = await store.get(session ?? '', url.searchParams.get('id'), { full: url.searchParams.get('full') === 'true' });
        if (!run) json(404, { error: 'Run not found for this session.' }); else json(200, { run });
      } else if (req.method === 'GET' && action === '/models') {
        const provider = url.searchParams.get('provider');
        const models = await translationModels(llm, provider);
        json(200, { provider, models, selectedModel: selectTranslationModel(models, url.searchParams.get('current') ?? '') });
      } else if (req.method === 'POST' && action === '/config') {
        const body = await readJson(req);
        const { apiKey, clearApiKey, ...patch } = body;
        if (Object.hasOwn(patch, 'targetProviders')) throw failure('INVALID_CONFIG', 'Claude Code targets are discovered automatically and cannot be edited here.');
        const next = validateConfig({ ...store.config, ...patch });
        await validateSelection(llm, next);
        if (clearApiKey !== undefined && typeof clearApiKey !== 'boolean') throw failure('INVALID_CONFIG', 'Invalid credential clearing flag.');
        if (apiKey !== undefined && clearApiKey) throw failure('INVALID_CONFIG', 'Cannot set and clear a credential together.');
        if (apiKey !== undefined) {
          if (typeof apiKey !== 'string' || apiKey.trim().length < 8 || apiKey.length > 4000 || /[\r\n\0]/.test(apiKey)) throw failure('INVALID_CONFIG', 'Invalid translation API key.');
          await credentials.set('DSH_CLAUDE_TRANSLATE_API_KEY', apiKey.trim());
        }
        if (clearApiKey === true) await credentials.unset('DSH_CLAUDE_TRANSLATE_API_KEY');
        await store.saveConfig(patch);
        engine.translator.cache.clear();
        engine.translator.segmentCache?.clear();
        json(200, { ok: true, config: store.config });
      } else if (req.method === 'POST' && action === '/session') {
        const body = await readJson(req);
        if (typeof body.sessionId !== 'string' || !/^[A-Za-z0-9_-]{1,160}$/.test(body.sessionId) || typeof body.enabled !== 'boolean') throw failure('INVALID_CONFIG', 'Invalid session toggle.');
        await store.saveConfig(c => ({ sessions: { ...c.sessions, [body.sessionId]: body.enabled } }));
        json(200, { ok: true });
      } else if (req.method === 'POST' && action === '/test') {
        const body = await readJson(req);
        const text = body.text ?? '帮我列出明天出门前需要检查的三件事。';
        if (typeof text !== 'string' || text.length > 4000 || !text.trim()) throw failure('INVALID_BODY', 'Translation test text must be between 1 and 4000 characters.');
        const meter = { requests: 0, cacheHits: 0, usage: [] }; const started = Date.now();
        const overrides = body.overrides ?? {};
        if (typeof overrides !== 'object' || !overrides || Array.isArray(overrides) || Object.keys(overrides).some(k => !['mode', 'provider', 'model', 'baseURL'].includes(k))) throw failure('INVALID_CONFIG', 'Invalid test overrides.');
        const config = validateConfig({ ...store.config, ...overrides });
        await validateSelection(llm, config);
        const output = await engine.translator.translate(text, 'en', config, req.signal, meter);
        json(200, { ok: true, input: text, output, durationMs: Date.now() - started, meter });
      } else json(404, { error: 'Unknown translation endpoint.' });
    } catch (error) {
      console.warn('[dsh-claude-translate]', redact(error.stack ?? String(error)));
      const invalid = ['INVALID_CONFIG', 'INVALID_BODY', 'INVALID_SESSION', 'TRANSLATION_MODEL_MISMATCH', 'TRANSLATION_CATALOG_EMPTY', 'TRANSLATION_RECURSION'].includes(error.code);
      const safe = invalid || ['TRANSLATION_AUTH', 'TRANSLATION_QUOTA', 'TRANSLATION_RATE_LIMIT', 'TRANSLATION_MODEL_UNAVAILABLE', 'TRANSLATION_PROVIDER_ERROR'].includes(error.code);
      json(invalid ? 400 : 503, { code: error.code ?? 'TRANSLATION_ERROR', error: safe ? error.message : 'Translation operation failed. Check the selected provider, model and credentials.' });
    }
  };
}
