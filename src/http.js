import { failure, redact } from './text.js';
import { validateConfig } from './store.js';
import { validatePresentation } from './presentation.js';
import { hash } from './text.js';

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
        const config = { ...store.config, sessions: session && Object.hasOwn(store.config.sessions, session) ? { [session]: store.config.sessions[session] } : {}, sessionPresentation: session && store.config.sessionPresentation[session] ? { [session]: store.config.sessionPresentation[session] } : {} };
        const providers = llm.listProviders();
        json(200, { version: '0.3.1', config, credentialConfigured: info.configured ?? info.present ?? false, providers, active: store.active.size, displayJobs: engine.jobs?.size ?? 0,
          environment: { claudeRoute: providers.some(p => store.config.targetProviders.includes(p.id)), codexRoute: providers.some(p => /codex/i.test(p.id)) },
          history: { maxRuns: store.maxRuns, maxBytes: store.maxBytes } });
      } else if (req.method === 'GET' && action === '/chat') {
        store.session(session ?? '');
        await reconcile(session);
        const runs = store.displayPage(session);
        const presentation = store.config.sessionPresentation[session] ?? store.config.presentation;
        const enabled = store.config.sessions[session] ?? store.config.enabled;
        const revision = hash(JSON.stringify([runs, presentation, enabled]));
        json(200, revision === url.searchParams.get('revision') ? { unchanged: true, revision } : { revision, runs, presentation, enabled });
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
        if (!provider || store.config.targetProviders.includes(provider) || /claude/i.test(provider)) throw failure('INVALID_CONFIG', 'Choose a non-Claude translation provider.');
        json(200, { models: await llm.listModels(provider) });
      } else if (req.method === 'POST' && action === '/config') {
        const body = await readJson(req);
        const { apiKey, clearApiKey, ...patch } = body;
        validateConfig({ ...store.config, ...patch });
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
        const text = body.text ?? '你好，请确认翻译连接正常。';
        if (typeof text !== 'string' || text.length > 4000 || !text.trim()) throw failure('INVALID_BODY', 'Translation test text must be between 1 and 4000 characters.');
        const meter = { requests: 0, cacheHits: 0, usage: [] }; const started = Date.now();
        const overrides = body.overrides ?? {};
        if (typeof overrides !== 'object' || !overrides || Array.isArray(overrides) || Object.keys(overrides).some(k => !['mode', 'provider', 'model', 'baseURL'].includes(k))) throw failure('INVALID_CONFIG', 'Invalid test overrides.');
        const config = validateConfig({ ...store.config, ...overrides });
        const output = await engine.translator.translate(text, 'en', config, req.signal, meter);
        json(200, { ok: true, input: text, output, durationMs: Date.now() - started, meter });
      } else json(404, { error: 'Unknown translation endpoint.' });
    } catch (error) {
      console.warn('[dsh-claude-translate]', redact(error.stack ?? String(error)));
      json(error.code === 'INVALID_CONFIG' || error.code === 'INVALID_BODY' || error.code === 'INVALID_SESSION' ? 400 : 503, { code: error.code ?? 'TRANSLATION_ERROR', error: error.code?.startsWith('INVALID') ? error.message : 'Translation operation failed. Check the selected provider, model and credentials.' });
    }
  };
}
