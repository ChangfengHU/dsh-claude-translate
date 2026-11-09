import { mkdir, readdir, readFile, writeFile, rename, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { failure, redact, hash } from './text.js';
import { DEFAULT_PRESENTATION, validatePresentation } from './presentation.js';

export const DEFAULT_CONFIG = Object.freeze({ enabled: false, mode: 'route', provider: '', model: '', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', targetProviders: ['claude-local'], translateOutput: true, timeoutMs: 45000, retentionDays: 7, sessions: {}, presentation: DEFAULT_PRESENTATION, sessionPresentation: {} });
export function validateConfig(value) {
  const c = { ...DEFAULT_CONFIG, ...value };
  const allowed = Object.keys(DEFAULT_CONFIG);
  if (Object.keys(value).some(k => !allowed.includes(k))) throw failure('INVALID_CONFIG', 'Unknown configuration field.');
  c.presentation = validatePresentation(c.presentation);
  if (!c.sessionPresentation || typeof c.sessionPresentation !== 'object' || Array.isArray(c.sessionPresentation) || Object.keys(c.sessionPresentation).length > 10000) throw failure('INVALID_CONFIG', 'Invalid presentation sessions.');
  for (const [id, preference] of Object.entries(c.sessionPresentation)) { if (!/^[A-Za-z0-9_-]{1,160}$/.test(id)) throw failure('INVALID_CONFIG', 'Invalid presentation session.'); validatePresentation(preference); }
  if (typeof c.enabled !== 'boolean' || typeof c.translateOutput !== 'boolean' || !['route', 'api'].includes(c.mode)) throw failure('INVALID_CONFIG', 'Invalid translation mode.');
  if (![c.provider, c.model, c.baseURL].every(x => typeof x === 'string' && x.length < 1000 && !/[\r\n\0]/.test(x))) throw failure('INVALID_CONFIG', 'Invalid provider or model.');
  if (c.provider.includes('claude')) throw failure('TRANSLATION_RECURSION', 'Claude Code cannot translate its own input. Choose Qwen, DeepSeek or local Codex.');
  if (!Array.isArray(c.targetProviders) || !c.targetProviders.length || c.targetProviders.length > 10 || !c.targetProviders.every(p => /^[a-z0-9][a-z0-9._-]{0,79}$/.test(p))) throw failure('INVALID_CONFIG', 'Invalid Claude provider route.');
  if (c.targetProviders.includes(c.provider)) throw failure('TRANSLATION_RECURSION', 'The translation route must differ from the Claude route.');
  let url;
  try { url = new URL(c.baseURL); } catch { throw failure('INVALID_CONFIG', 'Invalid translation endpoint URL.'); }
  if (url.username || url.password || url.search || url.hash || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) throw failure('INVALID_CONFIG', 'Use an HTTPS provider endpoint or explicit localhost endpoint.');
  if (!Number.isInteger(c.timeoutMs) || c.timeoutMs < 1000 || c.timeoutMs > 120000 || !Number.isInteger(c.retentionDays) || c.retentionDays < 1 || c.retentionDays > 30) throw failure('INVALID_CONFIG', 'Invalid timeout or retention.');
  if (!c.sessions || typeof c.sessions !== 'object' || Array.isArray(c.sessions) || Object.keys(c.sessions).length > 10000 || Object.entries(c.sessions).some(([id,on]) => !/^[A-Za-z0-9_-]{1,160}$/.test(id) || typeof on !== 'boolean')) throw failure('INVALID_CONFIG', 'Invalid session settings.');
  return c;
}


export function runSummary(r) {
  const user = request => request?.messages?.filter(m => m.source?.kind === 'user').flatMap(m => m.content?.filter(b => b.type === 'text').map(b => b.text) ?? []).at(-1) ?? '';
  return { id: r.id, sessionId: r.sessionId, purpose: r.purpose ?? (r.original?.system?.startsWith('Create a concise title') ? 'session-title' : 'conversation'),
    status: r.status, startedAt: r.startedAt, finishedAt: r.finishedAt, model: r.original?.model, position: r.position, displayStatus: r.displayStatus,
    translation: r.translation, inputTranslationMs: r.inputTranslationMs, claudeMs: r.claudeMs, outputTranslationMs: r.outputTranslationMs,
    preview: user(r.original).slice(0, 140), input: user(r.original), forwardedInput: user(r.forwarded),
    error: r.error, revision: [r.status, r.updatedAt ?? 0, r.rawOutput?.length ?? 0, r.translatedOutput?.length ?? 0].join(':') };
}
export function compactRun(r) {
  const { original, forwarded, messageMapping, ...small } = r;
  const value = { ...small, input: runSummary(r).input, forwardedInput: runSummary(r).forwardedInput, model: original?.model };
  value.truncated = false;
  for (const key of ['input', 'forwardedInput', 'rawOutput', 'translatedOutput']) if (value[key]?.length > 32000) { value[key] = value[key].slice(0, 32000); value.truncated = true; }
  return value;
}

export class Store {
  constructor(directory, { maxRuns = 100, maxBytes = 64 * 1024 * 1024 } = {}) {
    this.directory = directory; this.runs = join(directory, 'runs'); this.blobs = join(directory, 'blobs');
    this.active = new Map(); this.index = new Map(); this.sessions = new Map(); this.blobInfo = new Map(); this.display = new Map();
    this.config = { ...DEFAULT_CONFIG, sessions: {} }; this.queue = Promise.resolve(); this.writeQueue = Promise.resolve();
    this.maxRuns = maxRuns; this.maxBytes = maxBytes; this.metrics = { listReads: 0, detailReads: 0 };
  }
  async init() {
    await mkdir(this.runs, { recursive: true, mode: 0o700 }); await mkdir(this.blobs, { recursive: true, mode: 0o700 });
    try { this.config = validateConfig(JSON.parse(await readFile(join(this.directory, 'config.json'), 'utf8'))); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    // Only startup scans files. List polling reads an in-memory summary index, never request bodies.
    for (const name of await readdir(this.blobs)) if (/^[a-f0-9]{64}\.json$/.test(name)) {
      const info = await stat(join(this.blobs, name)); this.blobInfo.set(name.slice(0, -5), { size: info.size, refs: 0 });
    }
    for (const name of await readdir(this.runs)) if (/^tr_[a-f0-9-]+\.json$/.test(name)) {
      const file = join(this.runs, name);
      try {
        const raw = await readFile(file, 'utf8'); const saved = JSON.parse(raw);
        const r = saved.format === 2 ? saved.run : saved;
        if (r.displayStatus === 'pending' && r.claudeFinishedAt) { r.displayStatus = 'interrupted'; r.outputTranslationError = { code: 'DISPLAY_INTERRUPTED', message: 'Display translation was interrupted by a restart. The original answer is retained.' }; }
        const summary = saved.format === 2 ? saved.summary : runSummary(r);
        this.putIndex(r.id, { summary, size: Buffer.byteLength(raw), refs: saved.refs ?? [] });
        this.putDisplay(r, summary);
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    await this.prune();
  }
  async atomic(file, value) {
    const temporary = file + '.' + randomUUID() + '.tmp';
    try { await writeFile(temporary, JSON.stringify(value), { mode: 0o600, flag: 'wx' }); await rename(temporary, file); }
    finally { await rm(temporary, { force: true }); }
  }
  saveConfig(patch) {
    const job = this.queue.then(async () => { const next = validateConfig({ ...this.config, ...(typeof patch === 'function' ? patch(this.config) : patch) }); await this.atomic(join(this.directory, 'config.json'), next); this.config = next; return next; });
    this.queue = job.catch(() => {}); return job;
  }
  session(id) { if (!/^[A-Za-z0-9_-]{1,160}$/.test(id)) throw failure('INVALID_SESSION', 'Invalid session identifier.'); }
  putDisplay(run, summary = runSummary(run)) {
    this.display.set(run.id, { id: run.id, sessionId: run.sessionId, purpose: summary.purpose, position: run.position, startedAt: run.startedAt, status: run.status, displayStatus: run.displayStatus ?? (run.translatedOutput ? 'ready' : run.status === 'translating-output' ? 'interrupted' : 'unavailable'), rawOutput: run.rawOutput ?? '', translatedOutput: run.translatedOutput ?? '', outputTranslationError: run.outputTranslationError, revision: summary.revision });
  }
  displayPage(session) {
    this.session(session);
    const records = new Map((this.sessions.get(session) ?? []).map(id => [id, this.display.get(id)]));
    for (const run of this.active.values()) if (run.sessionId === session) records.set(run.id, { ...run, displayStatus: run.displayStatus ?? 'pending', revision: runSummary(run).revision });
    return [...records.values()].filter(r => r && r.purpose === 'conversation').map(({ id, position, status, displayStatus, revision, startedAt }) => ({ id, position, status, displayStatus, revision, startedAt }));
  }
  displayRuns(session, ids) {
    this.session(session);
    if (!Array.isArray(ids) || ids.length > 20 || ids.some(id => !/^tr_[a-f0-9-]{1,80}$/.test(id))) throw failure('INVALID_BODY', 'Invalid display batch.');
    return ids.flatMap(id => {
      const r = this.active.get(id) ?? this.display.get(id);
      if (!r || r.sessionId !== session || (r.purpose ?? 'conversation') !== 'conversation') return [];
      return [{ id, position: r.position, status: r.status, displayStatus: r.displayStatus ?? (r.translatedOutput ? 'ready' : 'unavailable'), rawOutput: r.rawOutput, translatedOutput: r.translatedOutput, outputTranslationError: r.outputTranslationError, revision: r.revision ?? runSummary(r).revision }];
    });
  }
  putIndex(id, value) {
    const previous = this.index.get(id);
    if (previous) for (const ref of previous.refs) { const info = this.blobInfo.get(ref); if (info) info.refs--; }
    this.index.set(id, value);
    for (const ref of value.refs) { const info = this.blobInfo.get(ref); if (info) info.refs++; }
    const session = value.summary.sessionId;
    const ids = this.sessions.get(session) ?? [];
    if (!previous) ids.push(id);
    ids.sort((a, b) => this.index.get(b).summary.startedAt - this.index.get(a).summary.startedAt || b.localeCompare(a));
    this.sessions.set(session, ids);
  }
  async save(run) {
    const clean = JSON.parse(redact(JSON.stringify({ ...run, updatedAt: Date.now() })));
    if (Buffer.byteLength(JSON.stringify(clean)) > 2 * 1024 * 1024) throw failure('TRACE_TOO_LARGE', 'The translation trace exceeds its 2 MiB limit.');
    const job = this.writeQueue.then(async () => {
      const refs = new Set();
      const blob = async value => {
        const raw = JSON.stringify(value); const id = hash(raw); refs.add(id);
        if (!this.blobInfo.has(id)) { await this.atomic(join(this.blobs, id + '.json'), value); this.blobInfo.set(id, { size: Buffer.byteLength(raw), refs: 0 }); }
        return { blob: id };
      };
      const packed = { ...clean };
      for (const key of ['original', 'forwarded']) if (clean[key]) {
        packed[key] = { ...clean[key], system: await blob(clean[key].system ?? ''), tools: await blob(clean[key].tools ?? []),
          messages: await Promise.all((clean[key].messages ?? []).map(async m => { const { id, ...body } = m; return { ...await blob(body), id }; })) };
      }
      const summary = runSummary(clean); const { input, forwardedInput, ...metadata } = summary;
      const saved = { format: 2, run: packed, summary: metadata, refs: [...refs] };
      await this.atomic(join(this.runs, clean.id + '.json'), saved);
      this.putIndex(clean.id, { summary: metadata, refs: saved.refs, size: Buffer.byteLength(JSON.stringify(saved)) });
      this.putDisplay(clean);
      if (this.index.size > this.maxRuns) await this.pruneNow();
    });
    this.writeQueue = job.catch(() => {}); return job;
  }
  page(session, { cursor, limit = 20, includeAux = false, query = '' } = {}) {
    this.session(session);
    if (!Number.isInteger(limit) || limit < 1 || limit > 50 || typeof query !== 'string' || query.length > 200) throw failure('INVALID_BODY', 'Invalid history page.');
    const values = new Map((this.sessions.get(session) ?? []).map(id => [id, this.index.get(id).summary]));
    for (const r of this.active.values()) if (r.sessionId === session) {
      const { input, forwardedInput, ...metadata } = runSummary(r); values.set(r.id, metadata);
    }
    let all = [...values.values()].sort((a, b) => b.startedAt - a.startedAt || b.id.localeCompare(a.id));
    const auxiliaryCount = all.filter(r => r.purpose !== 'conversation').length;
    if (!includeAux) all = all.filter(r => r.purpose === 'conversation');
    if (query) all = all.filter(r => (r.preview + ' ' + r.id + ' ' + r.status).toLowerCase().includes(query.toLowerCase()));
    const total = all.length;
    const revision = hash(JSON.stringify(all.map(r => [r.id, r.revision])));
    if (cursor) {
      let c; try { c = JSON.parse(Buffer.from(cursor, 'base64url').toString()); } catch { throw failure('INVALID_BODY', 'Invalid history cursor.'); }
      if (c.session !== session || !Number.isFinite(c.time) || typeof c.id !== 'string') throw failure('INVALID_BODY', 'Invalid history cursor.');
      all = all.filter(r => r.startedAt < c.time || (r.startedAt === c.time && r.id.localeCompare(c.id) < 0));
    }
    const runs = all.slice(0, limit); const last = runs.at(-1);
    return { runs, total, auxiliaryCount, revision, nextCursor: all.length > limit ? Buffer.from(JSON.stringify({ session, time: last.startedAt, id: last.id })).toString('base64url') : null };
  }
  async get(session, id, { full = true } = {}) {
    this.session(session); if (!/^tr_[a-f0-9-]{1,80}$/.test(id ?? '')) return undefined;
    const active = this.active.get(id);
    if (active?.sessionId === session) return JSON.parse(redact(JSON.stringify(full ? active : compactRun(active))));
    const item = this.index.get(id); if (!item || item.summary.sessionId !== session) return undefined;
    this.metrics.detailReads++;
    let saved; try { saved = JSON.parse(await readFile(join(this.runs, id + '.json'), 'utf8')); } catch (e) { if (e.code === 'ENOENT') return undefined; throw e; }
    if (saved.format !== 2) return full ? saved : compactRun(saved);
    const run = saved.run;
    const readBlob = async ref => {
      if (!ref || !/^[a-f0-9]{64}$/.test(ref.blob ?? '')) throw failure('TRACE_CORRUPT', 'Invalid request reference.');
      const value = JSON.parse(await readFile(join(this.blobs, ref.blob + '.json'), 'utf8'));
      return ref.id === undefined ? value : { ...value, id: ref.id };
    };
    if (full) {
      for (const key of ['original', 'forwarded']) if (run[key]) run[key] = { ...run[key], system: await readBlob(run[key].system), tools: await readBlob(run[key].tools), messages: await Promise.all(run[key].messages.map(readBlob)) };
      return run;
    }
    const lastUser = async request => {
      for (const ref of [...(request?.messages ?? [])].reverse()) { const m = await readBlob(ref); if (m.source?.kind === 'user') return m.content.filter(c => c.type === 'text').map(c => c.text).at(-1) ?? ''; }
      return '';
    };
    const input = await lastUser(run.original); const forwardedInput = await lastUser(run.forwarded);
    return compactRun({ ...run, original: { model: run.original?.model, messages: [{ source: { kind: 'user' }, content: [{ type: 'text', text: input }] }] }, forwarded: { messages: [{ source: { kind: 'user' }, content: [{ type: 'text', text: forwardedInput }] }] } });
  }
  // Compatibility for tests and offline exports; never used by the browser's list endpoint.
  async list(session) { const page = this.page(session, { limit: 50, includeAux: true }); const values = []; for (const r of page.runs) values.push(await this.get(session, r.id)); return values; }
  async prune() {
    const job = this.writeQueue.then(() => this.pruneNow());
    this.writeQueue = job.catch(() => {}); return job;
  }
  async pruneNow() {
    const files = [...this.index.entries()].sort((a, b) => b[1].summary.startedAt - a[1].summary.startedAt);
    let bytes = [...this.index.values()].reduce((n, item) => n + item.size, 0) + [...this.blobInfo.values()].reduce((n, b) => n + b.size, 0);
    let count = files.length;
    for (const [id, item] of files.reverse()) {
      if (this.active.has(id)) continue;
      if (count <= this.maxRuns && bytes <= this.maxBytes && item.summary.startedAt >= Date.now() - this.config.retentionDays * 86400000) continue;
      await rm(join(this.runs, id + '.json'), { force: true }); this.index.delete(id); this.display.delete(id); count--; bytes -= item.size;
      const ids = this.sessions.get(item.summary.sessionId) ?? []; this.sessions.set(item.summary.sessionId, ids.filter(value => value !== id));
      for (const ref of item.refs) { const info = this.blobInfo.get(ref); if (info) { info.refs--; if (info.refs <= 0) bytes -= info.size; } }
    }
    for (const [id, info] of this.blobInfo) if (info.refs <= 0) { await rm(join(this.blobs, id + '.json'), { force: true }); this.blobInfo.delete(id); }
  }
}
