import { randomUUID } from 'node:crypto';
import { TextTranslator, translateRequest, snapshotRequest, hash, failure, redact } from './text.js';

export class TranslationEngine {
  constructor({ store, execute, makeMessage, dispatch }) {
    this.store = store;
    this.translator = new TextTranslator(execute);
    this.makeMessage = makeMessage;
    this.dispatch = dispatch;
    this.nested = new WeakSet();
  }
  enabled(options) {
    const c = this.store.config;
    return !this.nested.has(options) && c.targetProviders.includes(options.provider) && (c.sessions[options.sessionId] ?? c.enabled);
  }
  async *stream(options, next) {
    if (!this.enabled(options)) { yield* next(); return; }
    const config = structuredClone(this.store.config);
    if (!config.model || (config.mode === 'route' && !config.provider)) throw failure('TRANSLATION_NOT_CONFIGURED', 'Configure a translation model before calling Claude Code.');
    if (this.store.active.size >= 8) throw failure('TRANSLATION_BUSY', 'Translation concurrency limit reached. Try again shortly.');
    const run = {
      version: 1, id: `tr_${randomUUID()}`, sessionId: options.sessionId ?? '_unscoped', startedAt: Date.now(), status: 'translating',
      original: snapshotRequest(options), rawOutput: '', translatedOutput: '',
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
          run.status = chunk.reason.kind === 'error' ? 'failed' : chunk.reason.kind === 'aborted' ? 'cancelled' : 'succeeded';
          if (run.status === 'succeeded' && config.translateOutput && run.rawOutput) {
            run.status = 'translating-output';
            try { run.translatedOutput = redact(await this.translator.translate(run.rawOutput, 'zh', config, options.signal, run.meter)); run.status = 'succeeded'; }
            catch (error) { run.status = 'partial'; run.outputTranslationError = { code: error.code ?? 'TRANSLATION_FAILED', message: 'Claude completed, but the display translation failed. The original answer is retained.' }; }
            run.outputTranslationMs = Date.now() - run.claudeFinishedAt;
          }
          run.finishedAt = Date.now();
          await this.store.save(run);
          finished = true;
        }
        // Canonical English model output remains lossless in DSH history.
        yield chunk;
      }
      if (!finished) throw failure('INCOMPLETE_STREAM', 'Claude stream ended without a terminal event.');
    } catch (error) {
      run.status = options.signal?.aborted ? 'cancelled' : 'failed';
      run.error = { code: error.code ?? 'TRANSLATION_FAILED', message: run.forwardedAt ? 'The forwarded Claude request did not complete.' : 'Input translation failed. Claude Code was not called.' };
      run.finishedAt = Date.now();
      await this.store.save(run);
      throw error;
    } finally {
      if (!finished && !run.finishedAt) { run.status = 'cancelled'; run.finishedAt = Date.now(); await this.store.save(run); }
      this.store.active.delete(run.id);
      await this.store.prune();
    }
  }
}
