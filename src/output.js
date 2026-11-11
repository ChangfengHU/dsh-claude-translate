import { stablePrefix } from './incremental.js';
import { redact } from './text.js';

export class OutputTranslation {
  constructor({ run, translator, config, changed, completed }) {
    Object.assign(this, { run, translator, config, changed, completed });
    this.controller = new AbortController(); this.promise = Promise.resolve();
    this.busy = false; this.final = false; this.stopped = false; this.done = false;
    this.source = ''; this.updates = 0; this.lastStarted = 0;
  }
  request(final = false) {
    this.final ||= final;
    if (this.busy || this.done) return;
    this.promise = this.drain();
    this.promise.catch(error => console.warn('[dsh-claude-translate] display save failed:', error.code ?? 'STORAGE_ERROR'));
  }
  cancel() { this.stopped = true; this.controller.abort(); this.request(true); }
  async drain() {
    this.busy = true;
    let error;
    try {
      while (!this.stopped) {
        const source = this.final ? this.run.rawOutput : stablePrefix(this.run.rawOutput);
        if (this.source && !this.run.rawOutput.startsWith(this.source)) {
          this.source = ''; this.run.translatedOutput = ''; this.run.outputPreview = ''; this.changed();
        }
        if (source === this.source) break;
        if (!this.final && (source.length < 120 || source.length - this.source.length < 80 || this.updates >= 6 || Date.now() - this.lastStarted < 900)) break;
        if (!source) break;
        this.lastStarted = Date.now(); this.updates++;
        this.run.outputStartedAt ??= Date.now();
        this.changed();
        try {
          const translated = await this.translator.translate(source, 'zh', this.config, this.controller.signal, this.run.meter, preview => {
            if (this.stopped || !this.run.rawOutput.startsWith(source)) return;
            this.run.outputPreview = redact(preview);
            if (preview) this.run.firstChineseAt ??= Date.now();
            this.changed();
          });
          if (this.run.rawOutput.startsWith(source)) {
            this.source = source; this.run.translatedOutput = redact(translated); this.run.outputPreview = '';
            this.run.translatedSourceChars = source.length; this.run.firstChineseAt ??= Date.now(); this.changed();
          }
        } catch (failure) {
          this.run.outputPreview = ''; this.changed();
          if (this.final || this.stopped) { error = failure; break; }
          // A speculative prefix failure never interrupts Claude. The final source gets one fresh attempt.
          break;
        }
        if (!this.final) break;
      }
    } finally {
      this.busy = false;
      if (this.final || this.stopped) {
        this.done = true;
        const success = !error && !this.stopped && this.source === this.run.rawOutput;
        await this.completed({ success, interrupted: this.stopped });
      }
    }
  }
}
