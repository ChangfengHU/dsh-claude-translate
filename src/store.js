import { mkdir, readdir, readFile, writeFile, rename, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { failure, redact } from './text.js';

export const DEFAULT_CONFIG = Object.freeze({ enabled: false, mode: 'route', provider: '', model: '', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', targetProviders: ['claude-local'], translateOutput: true, timeoutMs: 45000, retentionDays: 7, sessions: {} });
export function validateConfig(value) {
  const c = { ...DEFAULT_CONFIG, ...value };
  const allowed = Object.keys(DEFAULT_CONFIG);
  if (Object.keys(value).some(k => !allowed.includes(k))) throw failure('INVALID_CONFIG', 'Unknown configuration field.');
  if (typeof c.enabled !== 'boolean' || typeof c.translateOutput !== 'boolean' || !['route', 'api'].includes(c.mode)) throw failure('INVALID_CONFIG', 'Invalid translation mode.');
  if (![c.provider, c.model, c.baseURL].every(x => typeof x === 'string' && x.length < 1000 && !/[\r\n\0]/.test(x))) throw failure('INVALID_CONFIG', 'Invalid provider or model.');
  if (c.provider.includes('claude')) throw failure('TRANSLATION_RECURSION', 'Claude Code cannot translate its own input. Choose Qwen, DeepSeek or local Codex.');
  if (!Array.isArray(c.targetProviders) || !c.targetProviders.length || c.targetProviders.length > 10 || !c.targetProviders.every(p => /^[a-z0-9][a-z0-9._-]{0,79}$/.test(p))) throw failure('INVALID_CONFIG', 'Invalid Claude provider route.');
  if (c.targetProviders.includes(c.provider)) throw failure('TRANSLATION_RECURSION', 'The translation route must differ from the Claude route.');
  let url;
  try { url = new URL(c.baseURL); } catch { throw failure('INVALID_CONFIG', 'Invalid translation endpoint URL.'); }
  if (url.username || url.password || url.search || url.hash || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) throw failure('INVALID_CONFIG', 'Use an HTTPS provider endpoint or explicit localhost endpoint.');
  if (!Number.isInteger(c.timeoutMs) || c.timeoutMs < 1000 || c.timeoutMs > 120000 || !Number.isInteger(c.retentionDays) || c.retentionDays < 1 || c.retentionDays > 30) throw failure('INVALID_CONFIG', 'Invalid timeout or retention.');
  if (!c.sessions || typeof c.sessions !== 'object' || Array.isArray(c.sessions) || Object.keys(c.sessions).length > 500 || Object.entries(c.sessions).some(([id,on]) => !/^[A-Za-z0-9_-]{1,160}$/.test(id) || typeof on !== 'boolean')) throw failure('INVALID_CONFIG', 'Invalid session settings.');
  return c;
}

export class Store {
  constructor(directory) { this.directory = directory; this.runs = join(directory, 'runs'); this.active = new Map(); this.config = { ...DEFAULT_CONFIG, sessions: {} }; this.queue = Promise.resolve(); }
  async init() {
    await mkdir(this.runs, { recursive: true, mode: 0o700 });
    try { this.config = validateConfig(JSON.parse(await readFile(join(this.directory, 'config.json'), 'utf8'))); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    await this.prune();
  }
  async atomic(file, value) {
    const temporary = `${file}.${randomUUID()}.tmp`;
    try { await writeFile(temporary, JSON.stringify(value, null, 2), { mode: 0o600, flag: 'wx' }); await rename(temporary, file); }
    finally { await rm(temporary, { force: true }); }
  }
  saveConfig(patch) {
    const job = this.queue.then(async () => { const next = validateConfig({ ...this.config, ...(typeof patch === 'function' ? patch(this.config) : patch) }); await this.atomic(join(this.directory, 'config.json'), next); this.config = next; return next; });
    this.queue = job.catch(() => {}); return job;
  }
  async save(run) {
    const clean = JSON.parse(redact(JSON.stringify(run)));
    if (Buffer.byteLength(JSON.stringify(clean)) > 2 * 1024 * 1024) throw failure('TRACE_TOO_LARGE', 'The translation trace exceeds its 2 MiB limit.');
    await this.atomic(join(this.runs, `${run.id}.json`), clean);
  }
  async list(sessionId) {
    if (!/^[A-Za-z0-9_-]{1,160}$/.test(sessionId)) throw failure('INVALID_SESSION', 'Invalid session identifier.');
    const names = (await readdir(this.runs)).filter(n => /^tr_[a-f0-9-]+\.json$/.test(n));
    const values = [];
    for (const name of names) { try { const item = JSON.parse(await readFile(join(this.runs, name), 'utf8')); if (item.sessionId === sessionId) values.push(item); } catch (error) { if (error.code !== 'ENOENT') throw error; } }
    for (const item of this.active.values()) if (item.sessionId === sessionId) { const i = values.findIndex(r => r.id === item.id); if (i >= 0) values.splice(i, 1); values.push(JSON.parse(redact(JSON.stringify(item)))); }
    return values.sort((a,b) => b.startedAt - a.startedAt).slice(0, 50);
  }
  async prune() {
    const files = [];
    for (const name of await readdir(this.runs)) {
      if (!/^tr_[a-f0-9-]+\.json$/.test(name)) continue;
      const file = join(this.runs, name);
      try { const info = await stat(file); files.push({ file, time: info.mtimeMs, size: info.size }); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    files.sort((a,b) => b.time - a.time);
    let bytes = 0;
    for (let i = 0; i < files.length; i++) { const f = files[i]; bytes += f.size; if (i >= 250 || bytes > 25 * 1024 * 1024 || f.time < Date.now() - this.config.retentionDays * 86400000) await rm(f.file, { force: true }); }
  }
}
