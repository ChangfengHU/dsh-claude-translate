import { randomUUID } from 'node:crypto';
import { TextTranslator, translateRequest, snapshotRequest, hash, failure, redact, PIPELINE, ENGLISH_POLICY } from './text.js';
import { claudeRoutes, validateSelection } from './catalog.js';

export class TranslationEngine {
  constructor({ store, execute, makeMessage, dispatch, catalog, position = () => undefined }) {
    this.store = store;
    this.translator = new TextTranslator(execute);
    this.makeMessage = makeMessage;
    this.dispatch = dispatch;
    this.nested = new WeakSet();
    this.position = position;
    this.catalog = catalog;
    this.jobs = new Map();
    this.closed = false;
  }
  async idle() { await Promise.allSettled([...this.jobs.values()].map(j => j.promise)); }
  async dispose() { this.closed = true; for (const job of this.jobs.values()) job.controller.abort(); await this.idle(); }
  async seed(sessionId, config) {
    if (!sessionId) return;
    const latest = this.store.page(sessionId, { limit: 1 }).runs[0];
    if (!latest || this.store.active.has(latest.id)) return;
    const r = await this.store.get(sessionId, latest.id);
    const fingerprint = hash(JSON.stringify([PIPELINE, config.mode, config.provider, config.model, config.baseURL]));
    if (r?.pipeline !== PIPELINE || r.configFingerprint !== fingerprint || !r.forwarded) return;
    const suffix = '\n\n' + ENGLISH_POLICY;
    if (r.forwarded.system.endsWith(suffix)) this.translator.remember(r.original.system, r.forwarded.system.slice(0, -suffix.length), 'en', config);
    for (const pair of r.messageMapping ?? []) {
      const a = r.original.messages.find(m => m.id === pair.originalId);
      const b = r.forwarded.messages.find(m => m.id === pair.forwardedId);
      if (!a || !b || a.content.length !== b.content.length) continue;
      for (let i = 0; i < a.content.length; i++) if (a.content[i].type === 'text' && b.content[i].type === 'text') this.translator.remember(a.content[i].text, b.content[i].text, 'en', config);
    }
  }
  output(run, config) {
    const controller = new AbortController();
    const promise = (async () => {
      try {
        controller.signal.throwIfAborted();
        run.translatedOutput = redact(await this.translator.translate(run.rawOutput, 'zh', config, controller.signal, run.meter));
        run.status = 'succeeded'; run.displayStatus = 'ready';
      } catch (error) {
        run.status = 'partial'; run.displayStatus = controller.signal.aborted ? 'interrupted' : 'failed';
        run.outputTranslationError = { code: error.code ?? 'TRANSLATION_FAILED', message: 'Claude completed, but the display translation failed. The original answer is retained.' };
      } finally {
        run.outputTranslationMs = Date.now() - run.claudeFinishedAt; run.finishedAt = Date.now();
        try { await this.store.save(run); }
        finally { this.store.active.delete(run.id); this.jobs.delete(run.id); await this.store.prune(); }
      }
    })();
    this.jobs.set(run.id, { controller, promise });
    promise.catch(error => console.warn('[dsh-claude-translate] display save failed:', error.code ?? 'STORAGE_ERROR'));
  }
  enabled(options) {
    const c = this.store.config;
    const targets = this.catalog ? claudeRoutes(this.catalog.listProviders()) : c.targetProviders;
    return !this.nested.has(options) && targets.includes(options.provider) && (c.sessions[options.sessionId] ?? c.enabled);
  }
  async *stream(options, next) {
    if (!this.enabled(options)) { yield* next(); return; }
    if (this.closed) throw failure('TRANSLATION_STOPPED', 'The translation service is stopping.');
    const config = structuredClone(this.store.config);
    if (!config.model || (config.mode === 'route' && !config.provider)) throw failure('TRANSLATION_NOT_CONFIGURED', 'Configure a translation model before calling Claude Code.');
    if (this.catalog) await validateSelection(this.catalog, config);
    if (this.store.active.size >= 8) throw failure('TRANSLATION_BUSY', 'Translation concurrency limit reached. Try again shortly.');
    await this.seed(options.sessionId, config);
    const run = {
      version: 1, purpose: options.purpose ?? 'conversation', id: `tr_${randomUUID()}`, sessionId: options.sessionId ?? '_unscoped', startedAt: Date.now(), status: 'translating',
      original: snapshotRequest(options), rawOutput: '', translatedOutput: '',
      position: options.purpose ? undefined : this.position(options.sessionId), pipeline: PIPELINE, configFingerprint: hash(JSON.stringify([PIPELINE, config.mode, config.provider, config.model, config.baseURL])), displayStatus: 'pending',
      translation: { mode: config.mode, provider: config.mode === 'api' ? new URL(config.baseURL).host : config.provider, model: config.model },
      meter: { requests: 0, cacheHits: 0, usage: [] },
      scope: 'Exact DSH request forwarded to the registered Claude adapter. Native CLI-internal context and hidden reasoning are not captured. Images and credentials are omitted from inspection.',
    };
    this.store.active.set(run.id, run);
    const textBlocks = new Map();
    let finished = false;
    try {
      await this.store.save(run);
      const prepared = await translateRequest(options, this.translator, config, this.makeMessage, run.meter);
      options.signal?.throwIfAborted();
      run.forwarded = snapshotRequest(prepared.request);
      run.forwardedSnapshotSha256 = hash(JSON.stringify(run.forwarded));
      run.messageMapping = prepared.mapping;
      run.translatedBlocks = prepared.translatedBlocks;
      run.forwardedAt = Date.now();
      run.inputTranslationMs = run.forwardedAt - run.startedAt;
      run.status = 'running';
      await this.store.save(run);
      this.nested.add(prepared.request);
      // Dispatch a new immutable request; never mutate the loop-owned request or log.
      for await (const chunk of this.dispatch(prepared.request)) {
        if (chunk.type === 'text-delta') textBlocks.set(chunk.index, (textBlocks.get(chunk.index) ?? '') + chunk.text);
        if (chunk.type === 'block-end' && chunk.block.type === 'text') textBlocks.set(chunk.index, chunk.block.text);
        run.rawOutput = redact([...textBlocks.values()].join('\n\n'));
        if (chunk.type === 'usage') run.claudeUsage = chunk.usage;
        if (chunk.type === 'finish') {
          run.claudeFinishedAt = Date.now();
          run.claudeMs = run.claudeFinishedAt - run.forwardedAt;
          run.finishReason = chunk.reason.kind;
          if (chunk.reason.failure) run.error = { code: chunk.reason.failure.code ?? 'CLAUDE_ERROR', message: redact(chunk.reason.failure.message ?? 'Claude did not complete the request.') };
          run.status = chunk.reason.kind === 'error' ? 'failed' : chunk.reason.kind === 'aborted' ? 'cancelled' : 'succeeded';
          run.executionStatus = run.status;
          if (run.status === 'succeeded' && config.translateOutput && run.rawOutput) {
            run.status = 'translating-output'; run.displayStatus = 'pending';
          } else { run.displayStatus = 'unavailable'; run.finishedAt = Date.now(); }
          await this.store.save(run);
          finished = true;
          if (run.status === 'translating-output') this.output(run, config);
        }
        // Canonical English model output remains lossless in DSH history.
        yield chunk;
      }
      if (!finished) throw failure('INCOMPLETE_STREAM', 'Claude stream ended without a terminal event.');
    } catch (error) {
      run.status = options.signal?.aborted ? 'cancelled' : 'failed';
      run.executionStatus = run.status; run.displayStatus = 'unavailable';
      run.error = { code: error.code ?? 'TRANSLATION_FAILED', message: run.forwardedAt ? 'The forwarded Claude request did not complete.' : 'Input translation failed. Claude Code was not called.' };
      run.finishedAt = Date.now();
      await this.store.save(run);
      throw error;
    } finally {
      if (!finished && !run.finishedAt) { run.status = 'cancelled'; run.executionStatus = 'cancelled'; run.displayStatus = 'unavailable'; run.finishedAt = Date.now(); await this.store.save(run); }
      if (!this.jobs.has(run.id)) { this.store.active.delete(run.id); await this.store.prune(); }
    }
  }
}
