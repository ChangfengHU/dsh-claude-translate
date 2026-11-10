window.__ModuleLoader__.load({
  id: 'dsh-claude-translate',
  factory: require => {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useRef } = React;
    const NS = 'dsh-claude-translate';
    const ROOT = '/claude-translate';
    const states = { translating: 'Translating input', running: 'Running Claude', 'translating-output': 'Translating response', succeeded: 'Completed', partial: 'Translation failed', failed: 'Failed', cancelled: 'Cancelled' };
    const css = `
.dct{font:inherit;font-size:14px;line-height:1.6;letter-spacing:0;color:var(--dsw-alias-label-primary,#25272d);padding:16px 24px 24px;width:100%;max-width:none;margin:0;min-width:0;box-sizing:border-box;container-type:inline-size}
.dct *{box-sizing:border-box;letter-spacing:0}.dct button,.dct input,.dct select{font:inherit;color:inherit}.dct button{cursor:pointer;border:1px solid var(--dsw-alias-border-l2,#e2e5ea);border-radius:5px;background:var(--dsw-alias-bg-primary,#fff);padding:5px 10px;white-space:nowrap}.dct button:hover:not(:disabled){background:var(--dsw-alias-markdown-code-block,#f5f6f8)}.dct button:disabled{opacity:.45;cursor:default}.dct button:focus-visible,.dct input:focus-visible,.dct select:focus-visible{outline:2px solid #5b76d4;outline-offset:2px}.dct .primary{background:#4262c6;color:#fff;border-color:#4262c6}.dct .primary:hover:not(:disabled){background:#3554b0}
.dct-head{width:100%;display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:0 0 12px}.dct-head h2{font-size:16px;margin:0;font-weight:650}.dct-muted{color:var(--dsw-alias-label-secondary,#77808b);font-size:12px}.dct-grow{flex:1}.dct-toggle{display:inline-flex;align-items:center;gap:7px;font-size:12px;white-space:nowrap}.dct input[type=checkbox]{accent-color:#4965c5}
.dct-nav{width:100%;display:flex;gap:18px;border-bottom:1px solid var(--dsw-alias-border-l2,#e6e8ec);margin-bottom:14px;align-items:center}.dct-nav button{border:0;border-radius:0;padding:7px 0 9px;background:transparent!important;color:var(--dsw-alias-label-secondary,#78808c);border-bottom:2px solid transparent}.dct-nav button[aria-pressed=true]{color:#4865cf;border-color:#4865cf}.dct-count{font-variant-numeric:tabular-nums;padding-left:6px;color:var(--dsw-alias-label-secondary,#8c929d);font-size:12px}
.dct-filter{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 12px}.dct-search{width:260px;max-width:100%;border:1px solid var(--dsw-alias-border-l2,#e1e4e9);border-radius:5px;background:var(--dsw-alias-bg-primary,#fff);padding:6px 10px}.dct-follow{font-size:12px;color:#4965c5}
.dct-timeline{border-top:1px solid var(--dsw-alias-border-l2,#e5e8ed)}.dct-turn{border-bottom:1px solid var(--dsw-alias-border-l2,#e5e8ed);position:relative}.dct-turn[data-open=true]{background:var(--dsw-alias-markdown-code-block,#f8f9fc)}
.dct .dct-row{border:0;border-radius:0;background:transparent!important;width:100%;text-align:left;display:grid;grid-template-columns:22px minmax(160px,1fr) 240px 92px;gap:12px;align-items:center;padding:13px 8px;min-height:72px;white-space:normal}.dct-row:hover .dct-title{color:#4965c5}.dct-caret{font-size:17px;color:#8b93a0;transition:transform .16s ease;width:20px;text-align:center}.dct-turn[data-open=true] .dct-caret{transform:rotate(90deg);color:#4965c5}.dct-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.65;max-width:100%;font-size:13px;font-weight:550}.dct-subline{display:flex;gap:9px;align-items:center;font-size:11px;color:var(--dsw-alias-label-secondary,#878e9a);margin-top:3px;flex-wrap:wrap}.dct-clock{font-variant-numeric:tabular-nums}.dct-status{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#4f7f68;white-space:nowrap}.dct-dot{width:7px;height:7px;border-radius:50%;background:currentColor;flex:none}.dct-status[data-state=failed],.dct-status[data-state=partial]{color:#b65b50}.dct-status[data-state=cancelled]{color:#8c929b}.dct-status[data-state=translating],.dct-status[data-state=running],.dct-status[data-state=translating-output]{color:#4869cb}
.dct-phases{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.dct-phase{font-size:10px;color:var(--dsw-alias-label-secondary,#949aa6);border-bottom:2px solid var(--dsw-alias-border-l2,#e7e9ee);padding-bottom:4px;position:relative;font-variant-numeric:tabular-nums}.dct-phase[data-done=true]{border-color:#a4b5dd;color:var(--dsw-alias-label-primary,#677388)}.dct-phase[data-active=true]{border-color:#4f70d2;color:#4f70d2}
.dct-inspector{padding:0 18px 16px 42px;min-width:0}.dct-inspector-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;border-bottom:1px solid var(--dsw-alias-border-l2,#e5e8ed);padding:0 0 9px;margin-bottom:14px}.dct-inspector-head button{border:0;padding:2px 0;border-radius:0;background:transparent}.dct-inspector-head button[aria-pressed=true]{color:#4865c5}.dct .dct-icon{font-size:16px;padding:0 6px;border:0;background:transparent;line-height:24px;min-width:28px}.dct-pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px;margin-bottom:18px}.dct-pane{min-width:0}.dct-pane-head{display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--dsw-alias-border-l2,#e4e7ee);padding-bottom:6px;margin-bottom:8px}.dct-pane-head h3{font-size:12px;margin:0;font-weight:550}.dct-pane-head .dct-icon{margin-left:auto}.dct-tag{font-size:10px;color:var(--dsw-alias-label-secondary,#8c94a1);margin-left:3px}.dct pre{white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;font:inherit;font-size:13px;line-height:1.85;margin:0;max-height:300px;overflow:auto}.dct pre.code{font-family:ui-monospace,SFMono-Regular,monospace;font-size:11px;padding:12px;background:var(--dsw-alias-bg-primary,#fff);border:1px solid var(--dsw-alias-border-l2,#e5e8ed);line-height:1.6;max-height:380px}.dct details summary{cursor:pointer;font-size:12px;padding:8px 0}
.dct-empty{min-height:190px;display:grid;place-content:center;gap:5px;color:var(--dsw-alias-label-secondary,#7c8491);text-align:center;font-size:13px}.dct-alert{padding:9px 12px;margin:10px 0;border-left:3px solid #bd7167;background:var(--dsw-alias-markdown-code-block,#fcf4f3);font-size:12px;overflow-wrap:anywhere}.dct-footer{display:flex;gap:10px;align-items:center;justify-content:flex-end;padding:14px 0;flex-wrap:wrap}.dct-footer span{margin-right:auto}.dct-live{width:6px;height:6px;background:#6383d5;display:inline-block;border-radius:50%;margin-right:5px}
.dct-form{max-width:720px;min-width:0;margin:0;border:0;padding:4px 0 16px;display:grid;grid-template-columns:135px minmax(0,1fr);gap:14px 16px;align-items:center}.dct-form input:not([type=checkbox]),.dct-form select{width:100%;min-width:0;border:1px solid var(--dsw-alias-border-l2,#d5dde4);background:var(--dsw-alias-bg-primary,#fff);color:inherit;padding:7px 9px;border-radius:5px}.dct-inline{display:flex;gap:8px;align-items:center;min-width:0}.dct-inline input{flex:1}.dct-feedback{padding:8px 0;font-size:13px;color:#287359}.dct-environment{font-size:12px;padding:6px 0 18px;color:var(--dsw-alias-label-secondary,#747e89)}
@media(max-width:850px){.dct{padding:10px 12px 16px}.dct .dct-row{grid-template-columns:18px minmax(0,1fr) 78px;gap:8px}.dct-row .dct-phases{display:none}.dct-inspector{padding:0 12px 12px 28px}.dct-pair{grid-template-columns:minmax(0,1fr);gap:16px}.dct-form{grid-template-columns:minmax(0,1fr);gap:6px}.dct-form label{margin-top:9px}.dct-search{width:100%}.dct-filter .dct-grow{display:none}.dct-model{max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dct-head{gap:8px}.dct-nav{gap:18px}}
@media(prefers-reduced-motion:no-preference){.dct-inspector{animation:dct-reveal .18s ease-out}@keyframes dct-reveal{from{opacity:.4;transform:translateY(-3px)}to{opacity:1;transform:translateY(0)}}.dct-phase[data-active=true]:after{content:'';position:absolute;bottom:-2px;height:2px;width:30%;left:0;background:#93a9e5;animation:dct-progress 1.3s infinite ease-in-out}@keyframes dct-progress{to{left:70%;opacity:.2}}.dct-status[data-state=running] .dct-dot,.dct-status[data-state=translating] .dct-dot,.dct-status[data-state=translating-output] .dct-dot{animation:dct-pulse 1.5s infinite}@keyframes dct-pulse{50%{opacity:.3}}}
`;
    async function api(path, body, signal) {
      const parsed = new URL(path, 'http://connection.internal');
      const endpoint = parsed.pathname.slice(1);
      const payload = body === undefined ? Object.fromEntries(parsed.searchParams) : body;
      const response = await fetch(ROOT + '/' + endpoint, { signal, credentials: 'same-origin', method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'client-request', rpcId: crypto.randomUUID(), method: endpoint, payload }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? `HTTP ${response.status}`);
      if (!result.result?.ok) {
        const message = result.result?.error?.message ?? 'Translation RPC failed.';
        const code = result.result?.error?.details?.pluginCode;
        throw new Error(message + (code ? ' (' + code + ')' : ''));
      }
      return result.result.value;
    }
    function lastUser(request) { return request?.messages?.filter(m => m.source.kind === 'user').flatMap(m => m.content.filter(b => b.type === 'text').map(b => b.text)).at(-1) ?? ''; }
    const ms = n => typeof n === 'number' ? (n / 1000).toFixed(2) + 's' : '--';
    function Copy({ text }) { const [done, setDone] = useState(false); return h('button', { type: 'button', title: 'Copy text', 'aria-label': 'Copy text', className: 'dct-icon', disabled: !text, onClick: async () => { try { await navigator.clipboard.writeText(text); setDone(true); } catch { setDone(false); } } }, done ? '✓' : '⧉'); }
    function Pane({ title, text, empty }) { return h('section', { className: 'dct-pane' }, h('div', { className: 'dct-pane-head' }, h('h3', null, title), h(Copy, { text })), h('pre', null, text || empty || 'Waiting for output')); }
    function Settings({ state, onSaved }) {
      const [form, setForm] = useState(() => state.config.provider || !state.recommendation ? state.config : { ...state.config, ...state.recommendation }), [key, setKey] = useState(''), [models, setModels] = useState([]);
      const [loadingModels, setLoadingModels] = useState(false), [modelError, setModelError] = useState(''), [adjusted, setAdjusted] = useState(false);
      const [busy, setBusy] = useState(''), [note, setNote] = useState(''), [error, setError] = useState(''), [refreshModels, setRefreshModels] = useState(0);
      const [testText, setTestText] = useState('帮我列出明天出门前需要检查的三件事。'), [result, setResult] = useState(null);
      const generation = useRef(0), lock = useRef(false);
      const set = (field, value) => { setForm(old => ({ ...old, [field]: value })); setNote(''); setResult(null); };
      const providers = state.providers.filter(p => !state.config.targetProviders.includes(p.id) && !/claude/i.test(p.id));
      useEffect(() => {
        const id = ++generation.current, abort = new AbortController();
        setModels([]); setModelError(''); setAdjusted(false);
        if (form.mode !== 'route' || !form.provider) { setLoadingModels(false); return () => abort.abort(); }
        setLoadingModels(true);
        api('/models?provider=' + encodeURIComponent(form.provider), undefined, abort.signal).then(r => {
          if (abort.signal.aborted || generation.current !== id) return;
          setModels(r.models);
          setAdjusted(!!form.model && !r.models.some(m => m.id === form.model));
          setForm(old => {
            if (old.mode !== 'route' || old.provider !== r.provider || r.models.some(m => m.id === old.model)) return old;
            return { ...old, model: r.selectedModel };
          });
        }).catch(e => { if (!abort.signal.aborted && generation.current === id) setModelError(e.message); })
          .finally(() => { if (!abort.signal.aborted && generation.current === id) setLoadingModels(false); });
        return () => { abort.abort(); generation.current++; };
      }, [form.mode, form.provider, refreshModels]);
      const validModel = form.mode === 'api' ? !!form.model.trim() : models.some(m => m.id === form.model);
      async function perform(kind, action) {
        if (lock.current) return;
        lock.current = true; setBusy(kind); setNote(''); setError('');
        try { await action(); } catch (e) { setError(e.message); } finally { lock.current = false; setBusy(''); }
      }
      const input = (field, props = {}) => h('input', { value: form[field], onChange: e => set(field, e.target.value), ...props });
      const save = () => perform('save', async () => {
        const patch = { enabled: form.enabled, mode: form.mode, provider: form.provider, model: form.model, baseURL: form.baseURL, translateOutput: form.translateOutput, timeoutMs: Number(form.timeoutMs), retentionDays: Number(form.retentionDays) };
        if (key.trim()) patch.apiKey = key.trim();
        await api('/config', patch); setKey(''); setAdjusted(false); setNote('Settings saved.'); await onSaved();
      });
      const test = () => perform('test', async () => {
        setResult(null);
        setResult(await api('/test', { text: testText, overrides: { mode: form.mode, provider: form.provider, model: form.model, baseURL: form.baseURL } }));
      });
      return h('div', { className: 'dct-settings' },
        h('section', { className: 'dct-config', 'aria-label': 'Translation configuration' },
          h('header', { className: 'dct-section-head' }, h('h3', null, 'Configuration')),
          h('fieldset', { className: 'dct-form', disabled: !!busy },
            h('label', { htmlFor: 'dct-mode' }, 'Translation source'),
            h('select', { id: 'dct-mode', value: form.mode, onChange: e => set('mode', e.target.value) }, h('option', { value: 'route' }, 'Existing DSH source'), h('option', { value: 'api' }, 'Separate API key')),
            ...(form.mode === 'route' ? [
              h('label', { key: 'provider-label', htmlFor: 'dct-provider' }, 'Provider'),
              h('select', { key: 'provider', id: 'dct-provider', value: form.provider, onChange: e => { setForm(old => ({ ...old, provider: e.target.value, model: '' })); setNote(''); setResult(null); } },
                h('option', { value: '' }, 'Select a source'),
                ...providers.map(p => h('option', { key: p.id, value: p.id, title: p.id }, providers.filter(other => other.name === p.name).length > 1 ? p.name + ' · ' + p.id : p.name === 'deepseek' ? 'DeepSeek' : p.name))),
            ] : [
              h('label', { key: 'url-label', htmlFor: 'dct-url' }, 'API Base URL'), input('baseURL', { key: 'url', id: 'dct-url', autoComplete: 'off' }),
              h('label', { key: 'key-label', htmlFor: 'dct-key' }, 'API Key'), h('input', { key: 'key', id: 'dct-key', type: 'password', autoComplete: 'new-password', value: key, placeholder: state.credentialConfigured ? 'Saved; leave blank to keep' : 'Enter an API key', onChange: e => setKey(e.target.value) }),
            ]),
            h('label', { htmlFor: 'dct-model' }, 'Model'), h('div', { className: 'dct-inline' },
              form.mode === 'route' ? h('select', { id: 'dct-model', value: models.some(m => m.id === form.model) ? form.model : '', disabled: loadingModels || !!modelError || !form.provider, onChange: e => set('model', e.target.value) },
                h('option', { value: '', disabled: true }, loadingModels ? 'Loading models…' : modelError ? 'Models unavailable' : 'Select a model'),
                ...models.map(m => h('option', { key: m.id, value: m.id }, m.name && m.name !== m.id ? m.name + ' · ' + m.id : m.id))) : input('model', { id: 'dct-model', placeholder: 'Exact model ID' }),
              form.mode === 'route' ? h('button', { type: 'button', disabled: loadingModels || !form.provider, title: 'Refresh models', 'aria-label': 'Refresh models', onClick: () => setRefreshModels(n => n + 1) }, '↻') : null),
            h('label', { className: 'dct-toggle dct-setting-check' }, h('input', { type: 'checkbox', checked: form.translateOutput, onChange: e => set('translateOutput', e.target.checked) }), 'Translate responses'),
            h('label', { className: 'dct-toggle' }, h('input', { type: 'checkbox', checked: form.enabled, onChange: e => set('enabled', e.target.checked) }), 'Enable for new sessions')),
          h('details', { className: 'dct-advanced' }, h('summary', null, 'Advanced'),
            h('fieldset', { className: 'dct-form', disabled: !!busy },
              h('label', { htmlFor: 'dct-timeout' }, 'Timeout (ms)'), input('timeoutMs', { id: 'dct-timeout', type: 'number', min: 1000, max: 120000 }),
              h('label', { htmlFor: 'dct-retention' }, 'Retention (days)'), input('retentionDays', { id: 'dct-retention', type: 'number', min: 1, max: 30 }),
              h('span', { className: 'dct-muted', title: state.config.targetProviders.join(', ') }, state.config.targetProviders.length ? 'Claude Code · Detected automatically' : 'Claude Code · Not detected'))),
          h('div', { className: 'dct-config-actions' }, note ? h('span', { className: 'dct-feedback', role: 'status' }, note) : null,
            h('button', { type: 'button', className: 'primary', disabled: !!busy || loadingModels || !validModel, onClick: save }, busy === 'save' ? 'Saving…' : 'Save settings')),
          adjusted ? h('div', { className: 'dct-alert', role: 'status' }, 'The previous model was not in this source. A valid draft is selected; save to apply it.') : null,
          modelError ? h('div', { className: 'dct-alert', role: 'alert' }, modelError) : null,
          error ? h('div', { className: 'dct-alert', role: 'alert' }, error) : null),
        h('section', { className: 'dct-test', 'aria-label': 'Translation test' },
          h('header', { className: 'dct-section-head' }, h('h3', null, 'Translation test'),
            h('button', { type: 'button', disabled: !!busy || loadingModels || !validModel || !testText.trim() || !!key.trim(), onClick: test }, busy === 'test' ? 'Testing…' : 'Test selection')),
          h('label', { htmlFor: 'dct-test-text' }, 'Input'),
          h('textarea', { id: 'dct-test-text', value: testText, rows: 5, disabled: !!busy, maxLength: 4000, onChange: e => { setTestText(e.target.value); setResult(null); } }),
          h('div', { className: 'dct-output-head' }, h('span', null, 'English output'), h('span', { className: 'dct-muted' }, result ? ms(result.durationMs) : form.model), result ? h(Copy, { text: result.output }) : null),
          result ? h('div', { className: 'dct-test-result', role: 'status' }, h('pre', { lang: 'en' }, result.output)) : h('div', { className: 'dct-test-empty' }, busy === 'test' ? 'Translating…' : 'No test run yet.'),
          key.trim() ? h('span', { className: 'dct-muted' }, 'Save the new key before testing.') : null));
    }

    function Badge({ status }) { return h('span', { className: 'dct-status', 'data-state': status }, h('span', { className: 'dct-dot', 'aria-hidden': true }), states[status] ?? status); }
    function Phases({ run }) {
      return h('div', { className: 'dct-phases', 'aria-label': 'Phase durations' }, ...[['Input', run.inputTranslationMs, 'translating'], ['Claude', run.claudeMs, 'running'], ['Response', run.outputTranslationMs, 'translating-output']].map(([label, time, state]) => h('div', { key: label, className: 'dct-phase', 'data-done': typeof time === 'number', 'data-active': run.status === state }, label + ' ' + ms(time))));
    }
    function Raw({ run, sessionId }) {
      const [full, setFull] = useState(null); const [error, setError] = useState(''); const [opened, setOpened] = useState('forwarded');
      useEffect(() => { const abort = new AbortController(); api('/run?session=' + encodeURIComponent(sessionId) + '&id=' + run.id + '&full=true', undefined, abort.signal).then(r => setFull(r.run)).catch(e => { if (!abort.signal.aborted) setError(e.message); }); return () => abort.abort(); }, [run.id, sessionId, run.status]);
      return h('div', null, error ? h('div', { className: 'dct-alert', role: 'alert' }, error) : null,
        !full ? h('div', { className: 'dct-muted', role: 'status' }, 'Loading full request…') :
          h('div', null, ...[['forwarded', 'English request sent to Claude'], ['original', 'Original DSH request']].map(([key, title]) =>
            h('details', { key, open: opened === key, onToggle: e => { if (e.currentTarget.open) setOpened(key); else setOpened(old => old === key ? '' : old); } }, h('summary', null, title), opened === key ? h('pre', { className: 'code' }, JSON.stringify(full[key] ?? null, null, 2).slice(0, 64000)) : null)),
            h('div', { className: 'dct-muted' }, 'Preview limited to 64K characters. Images and hidden reasoning are excluded.'),
            full.forwardedSnapshotSha256 ? h('pre', { className: 'dct-muted' }, 'SHA-256 ' + full.forwardedSnapshotSha256) : null));
    }
    function Inspector({ item, sessionId, cache }) {
      const [run, setRun] = useState(cache.current.get(item.id)?.run ?? null); const [view, setView] = useState('compare'); const [error, setError] = useState(''); const [downloading, setDownloading] = useState(false);
      useEffect(() => {
        const abort = new AbortController(); const hit = cache.current.get(item.id);
        if (hit?.revision === item.revision) { setRun(hit.run); return () => abort.abort(); }
        api('/run?session=' + encodeURIComponent(sessionId) + '&id=' + item.id, undefined, abort.signal).then(r => {
          if (abort.signal.aborted) return; setRun(r.run); setError(''); cache.current.set(item.id, { run: r.run, revision: item.revision });
          while (cache.current.size > 5) cache.current.delete(cache.current.keys().next().value);
        }).catch(e => { if (!abort.signal.aborted) setError(e.message); });
        return () => abort.abort();
      }, [sessionId, item.id, item.revision]);
      async function download() {
        setDownloading(true);
        try { const { run: full } = await api('/run?session=' + encodeURIComponent(sessionId) + '&id=' + item.id + '&full=true');
          const url = URL.createObjectURL(new Blob([JSON.stringify(full, null, 2)], { type: 'application/json' }));
          const a = document.createElement('a'); a.href = url; a.download = item.id + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (e) { setError(e.message); } finally { setDownloading(false); }
      }
      return h('div', { className: 'dct-inspector', id: 'dct-detail-' + item.id },
        h('div', { className: 'dct-inspector-head' }, ...[['compare', 'Bilingual'], ['raw', 'Full request']].map(([key, title]) => h('button', { key, type: 'button', 'aria-pressed': view === key, onClick: () => setView(key) }, title)),
          h('span', { className: 'dct-grow' }), run ? h('span', { className: 'dct-muted' }, run.meter ? run.meter.requests + ' requests / ' + run.meter.cacheHits + ' cache hits' + (run.meter.repairs ? ' / repairs ' + run.meter.repairs + '' : '') : '') : null,
          h('button', { type: 'button', className: 'dct-icon', title: 'Download full record', 'aria-label': 'Download full record', disabled: downloading || !run, onClick: download }, '↓')),
        error ? h('div', { className: 'dct-alert', role: 'alert' }, error) : null,
        !run ? h('div', { className: 'dct-muted', role: 'status' }, 'Loading run…') : h('div', null,
          run.error || run.outputTranslationError ? h('div', { className: 'dct-alert', role: 'alert' }, (run.error ?? run.outputTranslationError).message + ' · ' + (run.error ?? run.outputTranslationError).code) : null,
          view === 'raw' ? h(Raw, { run, sessionId }) : h('div', null,
            h('div', { className: 'dct-pair' }, h(Pane, { title: 'Original input', text: run.input }), h(Pane, { title: 'Forwarded English', text: run.forwardedInput, empty: run.status === 'failed' && !run.forwardedAt ? 'Not sent to Claude' : 'Waiting for input translation' })),
            h('div', { className: 'dct-pair' }, h(Pane, { title: 'Claude response', text: run.rawOutput, empty: 'Waiting for Claude' }), h(Pane, { title: 'Chinese translation', text: run.translatedOutput, empty: run.status === 'translating-output' ? 'Translating…' : 'No translation' })),
            run.truncated ? h('div', { className: 'dct-muted' }, 'Preview truncated; download the full record.') : null),
          h('div', { className: 'dct-subline' }, h('code', null, item.id), h('span', null, run.translation?.model), item.purpose !== 'conversation' ? h('span', null, 'Auxiliary requests · ' + item.purpose) : null)));
    }
    function View({ sessionId }) {
      const [state, setState] = useState(null); const [page, setPage] = useState({ runs: [], total: 0 }); const [selected, setSelected] = useState(null);
      const [view, setView] = useState('timeline'); const [error, setError] = useState(''); const [rev, setRev] = useState(0); const [includeAux, setIncludeAux] = useState(false);
      const [search, setSearch] = useState(''); const [query, setQuery] = useState(''); const [cursors, setCursors] = useState(['']); const [loading, setLoading] = useState(true);
      const cache = useRef(new Map()); const cursor = cursors.at(-1); const scope = '?session=' + encodeURIComponent(sessionId ?? '');
      async function refresh() { const result = await api('/state' + scope); setState(result); return result; }
      useEffect(() => { const abort = new AbortController(); setState(null); api('/state' + scope, undefined, abort.signal).then(setState).catch(e => { if (!abort.signal.aborted) setError(e.message); }); return () => abort.abort(); }, [sessionId, rev]);
      useEffect(() => { const timer = setTimeout(() => { setQuery(search.trim()); setCursors(['']); }, 250); return () => clearTimeout(timer); }, [search]);
      useEffect(() => { setCursors(['']); setSelected(null); setSearch(''); setQuery(''); cache.current.clear(); }, [sessionId, includeAux]);
      useEffect(() => {
        const abort = new AbortController(); let timer; let revision = ''; let first = true;
        setLoading(true); setError(''); setPage({ runs: [], total: 0 });
        async function poll() {
          try {
            if ((!document.hidden || first) && sessionId) {
              const result = await api('/runs' + scope + '&limit=20&includeAux=' + includeAux + '&query=' + encodeURIComponent(query) + '&cursor=' + encodeURIComponent(cursor) + '&revision=' + revision, undefined, abort.signal);
              if (abort.signal.aborted) return;
              if (!result.unchanged) { revision = result.revision; setPage(result); if (first) setSelected(old => result.runs.some(r => r.id === old) ? old : result.runs[0]?.id ?? null); }
              setError(''); setLoading(false);
            }
          } catch (e) { if (!abort.signal.aborted) { setError(e.message); setLoading(false); } }
          first = false;
          if (!abort.signal.aborted && !cursor && view === 'timeline') timer = setTimeout(poll, 2000);
        }
        poll(); return () => { abort.abort(); clearTimeout(timer); };
      }, [sessionId, includeAux, query, cursor, rev, view]);
      const enabled = state ? state.config.sessions[sessionId] ?? state.config.enabled : false;
      async function toggle() { try { await api('/session', { sessionId, enabled: !enabled }); await refresh(); } catch (e) { setError(e.message); } }
      const firstItem = (cursors.length - 1) * 20;
      return h('div', { className: 'dct', 'data-version': '0.3.3' },
        h('header', { className: 'dct-head' }, h('h2', null, 'Translation runs'), h('span', { className: 'dct-muted dct-model', title: state?.config.model }, state?.config.model || 'No translation model'),
          h('span', { className: 'dct-grow' }), h('label', { className: 'dct-toggle' }, h('input', { type: 'checkbox', checked: enabled, disabled: !state, onChange: toggle }), 'Enabled for this session'),
          h('button', { type: 'button', className: 'dct-icon', title: 'Refresh runs', 'aria-label': 'Refresh runs', onClick: () => setRev(n => n + 1) }, '↻')),
        h('nav', { className: 'dct-nav', 'aria-label': 'Translation views' }, h('button', { type: 'button', 'aria-pressed': view === 'timeline', onClick: () => setView('timeline') }, 'Timeline', h('span', { className: 'dct-count' }, page.total || '0')),
          h('button', { type: 'button', 'aria-pressed': view === 'settings', onClick: () => setView('settings') }, 'Settings')),
        error ? h('div', { className: 'dct-alert', role: 'alert' }, error, ' ', h('button', { type: 'button', onClick: () => setRev(n => n + 1) }, 'Retry')) : null,
        view === 'settings' ? state ? h('div', null, h('div', { className: 'dct-environment' },
          state.environment?.claudeRoute ? 'Claude Code detected' : 'Claude Code adapter not detected',
          ' · ', state.environment?.codexRoute ? 'Codex available' : 'API sources supported'),
          h(Settings, { key: state.version + state.config.model, state, onSaved: refresh })) : h('div', { className: 'dct-empty' }, 'Loading settings…') :
          h('div', null, h('div', { className: 'dct-filter' }, h('input', { className: 'dct-search', type: 'search', value: search, onChange: e => setSearch(e.target.value), placeholder: 'Search input, run ID or status', 'aria-label': 'Search runs' }),
            h('label', { className: 'dct-toggle dct-muted' }, h('input', { type: 'checkbox', checked: includeAux, onChange: e => setIncludeAux(e.target.checked) }), 'Auxiliary requests', page.auxiliaryCount ? ' (' + page.auxiliaryCount + ')' : ''),
            h('span', { className: 'dct-grow' }), h('span', { className: 'dct-muted' }, cursor ? 'History' : h(React.Fragment, null, h('span', { className: 'dct-live' }), 'Live'))),
            loading ? h('div', { className: 'dct-empty', role: 'status' }, 'Loading runs…') : !page.runs.length ? h('div', { className: 'dct-empty' }, query ? 'No matching runs' : 'No translation runs in this session') :
              h('div', { className: 'dct-timeline', 'aria-label': 'Translation timeline' }, ...page.runs.map(item => h('article', { key: item.id, className: 'dct-turn', 'data-open': selected === item.id },
                h('button', { type: 'button', className: 'dct-row', 'aria-expanded': selected === item.id, 'aria-controls': 'dct-detail-' + item.id, onClick: () => setSelected(old => old === item.id ? null : item.id) },
                  h('span', { className: 'dct-caret', 'aria-hidden': true }, '›'),
                  h('div', { style: { minWidth: 0 } }, h('div', { className: 'dct-title', title: item.preview }, item.preview || 'Auxiliary request'),
                    h('div', { className: 'dct-subline' }, h('time', { className: 'dct-clock', dateTime: new Date(item.startedAt).toISOString() }, new Date(item.startedAt).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })),
                      h('span', null, item.translation?.model), item.purpose !== 'conversation' ? h('span', null, item.purpose) : null)),
                  h(Phases, { run: item }), h(Badge, { status: item.status })),
                selected === item.id ? h(Inspector, { item, sessionId, cache }) : null))),
            h('footer', { className: 'dct-footer' }, h('span', { className: 'dct-muted' }, page.total ? (firstItem + 1) + '–' + (firstItem + page.runs.length) + ' / ' + page.total + ' records · latest 100 retained' : '0 records'),
              h('button', { type: 'button', disabled: cursors.length <= 1 || loading, onClick: () => setCursors(old => old.slice(0, -1)) }, 'Previous'),
              h('button', { type: 'button', disabled: !page.nextCursor || loading, onClick: () => setCursors(old => [...old, page.nextCursor]) }, 'Next'))));
    }

    const chatCSS = `
.dct-controls{position:relative;flex:0 0 auto;min-width:0;font:inherit;font-size:12px;letter-spacing:0}.dct-controls summary{cursor:pointer;display:flex;align-items:center;gap:6px;height:30px;width:124px;padding:3px 6px;list-style:none;white-space:nowrap;color:var(--dsw-alias-label-secondary,#77808b);border-radius:5px}.dct-controls summary::-webkit-details-marker{display:none}.dct-controls summary:hover,.dct-controls[open] summary{background:var(--dsw-alias-markdown-code-block,#f3f5f8)}.dct-control-dot{width:5px;height:5px;border-radius:50%;background:#a1a7af;flex:none}.dct-control-dot[data-enabled=true]{background:#59937b}.dct-control-language{font-size:10px;margin-left:auto;color:var(--dsw-alias-label-primary,#343b46)}.dct-control-panel{position:absolute;bottom:calc(100% + 10px);left:auto;right:0;width:252px;max-width:calc(100vw - 32px);padding:14px;display:grid;gap:12px;background:var(--dsw-alias-bg-primary,#fff);border:1px solid var(--dsw-alias-border-l2,#e2e5ea);border-radius:8px;box-shadow:0 8px 28px #0002;z-index:100}.dct-control-panel label{display:grid;gap:6px;font-size:12px}.dct-control-panel .dct-control-switch{display:flex;align-items:center;gap:8px}.dct-controls input{accent-color:#4e6cc9}.dct-controls select{width:100%;font:inherit;color:inherit;background:var(--dsw-alias-bg-primary,#fff);border:1px solid var(--dsw-alias-border-l2,#e2e5ea);border-radius:5px;padding:6px}.dct-controls :focus-visible{outline:2px solid #5b76d4;outline-offset:2px}.dct-controls [role=alert]{color:#b45b50;font-size:11px;overflow-wrap:anywhere}
.dct-test{max-width:720px;border-top:1px solid var(--dsw-alias-border-l2,#e2e5ea);padding:16px 0;display:grid;gap:10px}.dct-test h3{font-size:14px;margin:0}.dct-test>label{font-size:12px}.dct-test textarea{width:100%;border:1px solid var(--dsw-alias-border-l2,#d5dde4);background:var(--dsw-alias-bg-primary,#fff);color:inherit;padding:9px;border-radius:5px;font:inherit;resize:vertical;min-height:76px}.dct-test-result{border-left:2px solid #84af9b;padding:6px 12px}.dct-inline select{flex:1;min-width:0}.dct-test-result pre{max-height:300px;overflow:auto}
.dct-settings{display:grid;grid-template-columns:minmax(280px,420px) minmax(0,1fr);gap:28px;width:100%;align-items:start}.dct-config{min-width:0}.dct-section-head{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:34px;margin-bottom:14px}.dct-section-head h3{font-size:14px;font-weight:600;margin:0}.dct-settings .dct-form{max-width:none;grid-template-columns:112px minmax(0,1fr);gap:14px 12px;padding:0;align-items:center}.dct-settings .dct-form>.dct-toggle{grid-column:1/-1}.dct-settings{padding-bottom:150px}.dct-settings .dct-form>label:not(.dct-toggle){margin-top:0;font-size:12px;color:var(--dsw-alias-label-secondary,#77808b)}.dct-setting-check{margin-top:12px}.dct-advanced{border-top:1px solid var(--dsw-alias-border-l2,#e5e8ed);margin-top:16px;padding-top:6px}.dct-advanced summary{font-size:12px;cursor:pointer;padding:6px 0;color:var(--dsw-alias-label-secondary,#77808b)}.dct-advanced .dct-form{padding:8px 0 14px}.dct-config-actions{display:flex;gap:12px;align-items:center;justify-content:flex-end;margin-top:14px}.dct-config-actions .dct-feedback{margin-right:auto;padding:0}.dct-settings .dct-test{max-width:none;margin:0;border-top:0;border-left:1px solid var(--dsw-alias-border-l2,#e5e8ed);padding:0 0 0 28px;gap:10px}.dct-test .dct-section-head{margin-bottom:2px}.dct-output-head{display:flex;gap:10px;align-items:center;margin-top:8px;font-size:12px}.dct-output-head .dct-muted{margin-left:auto}.dct-test-empty{min-height:144px;display:grid;place-content:center;color:var(--dsw-alias-label-secondary,#8b939e);font-size:12px;border-top:1px solid var(--dsw-alias-border-l2,#e5e8ed)}.dct-user{min-width:0}.dct-input-english{max-width:760px;margin:4px 0 16px auto;font-size:12px;color:var(--dsw-alias-label-secondary,#77808b)}.dct-input-english summary{cursor:pointer;list-style-position:inside;text-align:right;padding:4px 0}.dct-input-body{border-left:2px solid var(--dsw-alias-border-l2,#dce3eb);padding:8px 12px;margin-top:5px}.dct-input-meta{display:flex;align-items:center;justify-content:space-between;font-size:11px;margin-bottom:5px}.dct-input-body pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;font-size:13px;line-height:1.7;margin:0;color:var(--dsw-alias-label-primary,#303742);max-height:240px;overflow:auto}.dct-input-body .dct-icon,.dct-output-head .dct-icon{border:0;background:transparent;color:inherit;cursor:pointer;font-size:15px;padding:0 4px}
@container(max-width:480px){.dct-settings .dct-form{grid-template-columns:minmax(0,1fr);gap:7px}.dct-settings .dct-form>label:not(.dct-toggle){margin-top:8px}}
@container(max-width:840px){.dct-settings{grid-template-columns:minmax(0,1fr);gap:22px}.dct-settings .dct-test{border-left:0;border-top:1px solid var(--dsw-alias-border-l2,#e5e8ed);padding:16px 0 0}}
.dct-reply{min-width:0;width:100%;letter-spacing:0;container-type:inline-size}.dct-reply-head{display:flex;gap:10px;align-items:center;margin:4px 0 9px;font-size:11px;line-height:22px;color:var(--dsw-alias-label-secondary,#828a98)}.dct-reply-head button{border:0;background:transparent;color:inherit;font:inherit;padding:0 3px;cursor:pointer}.dct-reply-head button:hover{color:#4965c5}.dct-reply-grid{display:grid;gap:20px;grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.dct-reply[data-layout=stacked] .dct-reply-grid{grid-template-columns:minmax(0,1fr);gap:16px}.dct-language{font-size:11px;font-weight:550;color:var(--dsw-alias-label-secondary,#828a98);padding-bottom:7px;margin-bottom:10px;border-bottom:1px solid var(--dsw-alias-border-l2,#e4e7ed)}.dct-language[data-lang=zh]{border-color:#83b8a3;color:#3d8068}.dct-language[data-lang=en]{border-color:#a0b2d5;color:#617cae}.dct-reply-pane{min-width:0;overflow-wrap:anywhere}.dct-reply details{border-top:1px solid var(--dsw-alias-border-l2,#e4e7ed);margin-top:14px;padding-top:8px}.dct-reply summary{cursor:pointer;font-size:12px;color:var(--dsw-alias-label-secondary,#7b8491);padding:4px 0}.dct-pending{color:var(--dsw-alias-label-secondary,#7b8491);font-size:13px;padding:8px 0}.dct-reply-error{border-left:2px solid #b87967;padding:5px 10px;margin:6px 0 10px;font-size:12px;color:#a26453}
@container(max-width:560px){.dct-reply-grid{grid-template-columns:minmax(0,1fr);gap:16px}}
`;
    function indexUserInputs(runs) {
      const result = new Map();
      for (const run of runs) {
        const seq = run.inputIdentity?.seq;
        if (!Number.isSafeInteger(seq) || run.purpose !== 'conversation') continue;
        const previous = result.get(seq);
        if (!previous || run.startedAt > previous.startedAt) result.set(seq, run);
      }
      return result;
    }
    function navigationAfterSend(previous, sessionId, input, promptError) {
      const current = { sessionId, phase: input.phase, rev: input.draftRev, draft: input.draft, images: input.imageIds.length, pending: input.phase === 'submitting', pendingRev: input.draftRev };
      if (!previous || previous.sessionId !== sessionId) return { state: current, showChat: false };
      const pending = previous.pending || current.pending;
      const pendingRev = previous.pending ? previous.pendingRev : previous.rev;
      const textAccepted = pending && current.phase === 'plain' && current.draft === '' && current.rev > pendingRev;
      const imageAccepted = previous.phase === 'plain' && current.phase === 'plain' && previous.draft === '' && current.draft === '' && previous.images > current.images && current.rev > previous.rev;
      current.pending = pending && current.phase !== 'plain';
      current.pendingRev = pendingRev;
      return { state: current, showChat: !promptError && (textAccepted || imageAccepted) };
    }
    function followChatStore(slots) {
      let store, dispose;
      const sync = () => {
        const owner = slots.entries('conversation.session').slice().sort((a, b) => (a.options.priority ?? 0) - (b.options.priority ?? 0))[0];
        const next = owner?.store;
        if (next === store) return;
        dispose?.(); dispose = undefined; store = next;
        if (store) dispose = slots.register({ name: 'conversation.input.dock', id: 'claude-translate-auto-chat', order: -100, store }, AutoChat);
      };
      const unsubscribe = slots.subscribe('conversation.session', sync);
      sync();
      return () => { unsubscribe(); dispose?.(); };
    }
    function AutoChat({ sessionId, session, input, actions }) {
      const previous = useRef(null);
      useEffect(() => {
        const next = navigationAfterSend(previous.current, sessionId, input, session.promptError);
        previous.current = next.state;
        if (next.showChat && !session.removed) actions.setView('chat');
      }, [sessionId, input, session.promptError, session.removed, actions]);
      return null;
    }
    function CapturedUser({ baseEntry, originalT, ...props }) {
      const { node, sessionId } = props;
      const [bus, state] = useChannel(sessionId), [open, setOpen] = useState(false);
      const meta = state.inputRuns.get(node.data.seq);
      useEffect(() => open && meta ? bus.watch(meta.id) : undefined, [bus, open, meta?.id, meta?.revision]);
      const run = meta && bus.detail(meta.id);
      const original = h(baseEntry.component, { ...props, t: originalT });
      if (!meta) return original;
      const forwarded = !!meta.forwardedAt;
      const stopped = ['failed', 'cancelled'].includes(meta.status) && !forwarded;
      return h('div', { className: 'dct-user' }, original,
        h('details', { className: 'dct-input-english', open, 'data-input-seq': node.data.seq, onToggle: e => setOpen(e.currentTarget.open) },
          h('summary', null, forwarded ? 'English sent to Claude' : stopped ? 'English input · Not sent' : 'English input · Translating'),
          open ? h('div', { className: 'dct-input-body' },
            forwarded && run?.forwardedInput ? h(React.Fragment, null, h('div', { className: 'dct-input-meta' }, h('span', null, 'Forwarded English'), h(Copy, { text: run.forwardedInput })), h('pre', { lang: 'en' }, run.forwardedInput)) :
              h('div', { className: 'dct-muted', role: 'status' }, stopped ? 'Input translation failed. Claude was not called.' : forwarded ? 'Loading captured English…' : 'Translating input…')) : null));
    }

    const channels = new Map();
    function channel(sessionId) {
      if (channels.has(sessionId)) return channels.get(sessionId);
      const listeners = new Set(), wanted = new Set(), details = new Map();
      let snapshot = { runs: [], inputRuns: new Map(), presentation: { mode: 'zh', layout: 'parallel' }, enabled: false, loaded: false };
      let timer, batchTimer, refs = 0, busy = false, stopped = false, revision = '', pendingConfig = 0, configEpoch = 0;
      const abort = new AbortController();
      const emit = value => { snapshot = { ...snapshot, ...value, ...(value.runs ? { inputRuns: indexUserInputs(value.runs) } : {}) }; for (const fn of listeners) fn(); };
      function trim() {
        const retained = new Set(snapshot.runs.map(r => r.id));
        for (const id of details.keys()) if (!retained.has(id)) details.delete(id);
        for (const id of details.keys()) if (details.size > 30 && !wanted.has(id)) details.delete(id);
      }
      async function batch() {
        batchTimer = undefined;
        const ids = snapshot.runs.filter(r => wanted.has(r.id) && details.get(r.id)?.revision !== r.revision).slice(0, 20).map(r => r.id);
        if (!ids.length || stopped) return;
        try {
          const result = await api('/display?session=' + encodeURIComponent(sessionId) + '&ids=' + ids.join(','), undefined, abort.signal);
          for (const run of result.runs) details.set(run.id, run);
          trim(); emit({ detailRevision: (snapshot.detailRevision ?? 0) + 1, error: '' });
        } catch (e) { if (!abort.signal.aborted) emit({ error: e.message }); }
      }
      function scheduleBatch() { if (!batchTimer) batchTimer = setTimeout(batch, 25); }
      async function poll() {
        clearTimeout(timer);
        if (busy || stopped || !refs) return;
        busy = true;
        try {
          if (!document.hidden) {
            const epoch = configEpoch;
            const result = await api('/chat?session=' + encodeURIComponent(sessionId) + '&revision=' + revision, undefined, abort.signal);
            if (!result.unchanged) {
              for (const run of result.display ?? []) details.set(run.id, run);
              const staleConfig = pendingConfig > 0 || epoch !== configEpoch;
              revision = staleConfig ? '' : result.revision;
              emit({ ...result, ...(staleConfig ? { enabled: snapshot.enabled, presentation: snapshot.presentation } : {}), loaded: true, error: '' }); trim();
            }
            scheduleBatch();
          }
        } catch (e) { if (!abort.signal.aborted) emit({ error: e.message }); }
        finally { busy = false; if (!stopped && refs) timer = setTimeout(poll, snapshot.runs.some(r => ['translating', 'running', 'translating-output'].includes(r.status) && r.displayStatus !== 'interrupted') ? 900 : 3500); }
      }
      const result = {
        getSnapshot: () => snapshot,
        subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
        connect() { refs++; stopped = false; poll(); return () => { refs--; if (!refs) { clearTimeout(timer); clearTimeout(batchTimer); } }; },
        watch(id) { wanted.add(id); scheduleBatch(); return () => wanted.delete(id); },
        detail: id => details.get(id),
        async preference(preference) { const previous = snapshot.presentation; pendingConfig++; configEpoch++; emit({ presentation: preference }); try { await api('/presentation', { sessionId, presentation: preference }); } catch (e) { emit({ presentation: previous }); throw e; } finally { pendingConfig--; revision = ''; poll(); } },
        async toggle() { const previous = snapshot.enabled; pendingConfig++; configEpoch++; emit({ enabled: !previous }); try { await api('/session', { sessionId, enabled: !previous }); } catch (e) { emit({ enabled: previous }); throw e; } finally { pendingConfig--; revision = ''; poll(); } },
        dispose() { stopped = true; abort.abort(); clearTimeout(timer); clearTimeout(batchTimer); listeners.clear(); details.clear(); },
      };
      channels.set(sessionId, result);
      if (channels.size > 6) for (const [id, old] of channels) { if (id !== sessionId && old.unused()) { old.dispose(); channels.delete(id); break; } }
      result.unused = () => !refs;
      return result;
    }
    function useChannel(sessionId) {
      const bus = React.useMemo(() => channel(sessionId), [sessionId]);
      const state = React.useSyncExternalStore(bus.subscribe, bus.getSnapshot);
      useEffect(() => bus.connect(), [bus]);
      return [bus, state];
    }
    function ReplyControls({ sessionId }) {
      const [bus, state] = useChannel(sessionId);
      const [busy, setBusy] = useState(false), [error, setError] = useState('');
      const root = useRef(null);
      useEffect(() => {
        const close = event => { if (root.current && !root.current.contains(event.target)) root.current.open = false; };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
      }, []);
      async function save(fn) { setBusy(true); setError(''); try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); } }
      const language = { zh: 'ZH', en: 'EN', bilingual: 'ZH + EN' }[state.presentation.mode];
      return h('details', { ref: root, className: 'dct-controls', 'data-translate-controls': '0.3.3', onKeyDown: e => { if (e.key === 'Escape') { e.currentTarget.open = false; e.currentTarget.querySelector('summary')?.focus(); } } },
        h('summary', { title: 'Translation options', 'aria-label': 'Translation options' }, h('span', { className: 'dct-control-dot', 'data-enabled': state.enabled }), 'Translate', h('span', { className: 'dct-control-language' }, state.enabled ? language : 'Off')),
        h('div', { className: 'dct-control-panel', role: 'dialog', 'aria-label': 'Translation options' },
          h('label', { className: 'dct-control-switch' }, h('input', { type: 'checkbox', checked: state.enabled, disabled: busy || !state.loaded, onChange: () => save(() => bus.toggle()) }), 'Enabled'),
          h('label', null, 'Response language', h('select', { 'aria-label': 'Response language', value: state.presentation.mode, disabled: busy || !state.loaded, onChange: e => save(() => bus.preference({ ...state.presentation, mode: e.target.value })) },
            h('option', { value: 'zh' }, 'Chinese'), h('option', { value: 'en' }, 'English'), h('option', { value: 'bilingual' }, 'Bilingual'))),
          state.presentation.mode === 'bilingual' ? h('label', null, 'Bilingual layout', h('select', { 'aria-label': 'Bilingual layout', value: state.presentation.layout, disabled: busy, onChange: e => save(() => bus.preference({ ...state.presentation, layout: e.target.value })) },
            h('option', { value: 'parallel' }, 'Side by side'), h('option', { value: 'stacked' }, 'Stacked'), h('option', { value: 'collapsed' }, 'Chinese + collapsed English'))) : null,
          error || state.error ? h('span', { role: 'alert' }, error || state.error) : null));
    }
    function projectText(node, text, { textOnly = false, omitText = false } = {}) {
      let inserted = false;
      const blocks = node.data.blocks.flatMap(block => {
        if (block.kind !== 'text') return textOnly ? [] : [block];
        if (omitText || inserted) return [];
        inserted = true; return [{ ...block, text }];
      });
      return { ...node, data: { ...node.data, blocks } };
    }
    function TranslatedAssistant({ baseEntry, originalT, ...props }) {
      const { node, sessionId } = props;
      const [bus, state] = useChannel(sessionId);
      const ref = useRef(null), [visible, setVisible] = useState(false);
      useEffect(() => {
        if (!ref.current) return;
        const observer = new IntersectionObserver(entries => { for (const entry of entries) setVisible(entry.isIntersecting); }, { rootMargin: '200px' });
        observer.observe(ref.current); return () => observer.disconnect();
      }, []);
      const meta = state.runs.find(r => r.position?.turn === node.data.turn && r.position?.step === node.data.step);
      useEffect(() => visible && meta ? bus.watch(meta.id) : undefined, [bus, visible, meta?.id, meta?.revision]);
      const run = meta && bus.detail(meta.id);
      const base = (projected = node) => h(baseEntry.component, { ...props, t: originalT, node: projected });
      if (!meta || state.presentation.mode === 'en') return h('div', { ref, 'data-dct-original': true }, base());
      const raw = node.data.blocks.filter(b => b.kind === 'text').map(b => b.text).join('\n\n');
      if (!raw) return h('div', { ref }, base());
      const zh = run?.translatedOutput;
      const failed = ['failed', 'interrupted', 'unavailable'].includes(run?.displayStatus ?? meta.displayStatus);
      const bilingual = state.presentation.mode === 'bilingual';
      const primary = zh ? base(projectText(node, zh, { textOnly: bilingual })) : bilingual ? null : base(projectText(node, '', { omitText: true }));
      const english = () => base(projectText(node, raw, { textOnly: true }));
      const languagePane = (lang, content) => h('section', { className: 'dct-reply-pane', lang: lang === 'zh' ? 'zh-CN' : 'en' }, h('div', { className: 'dct-language', 'data-lang': lang }, lang === 'zh' ? 'Chinese' : 'English'), content);
      const chinese = h(React.Fragment, null, primary, !zh ? h('div', { className: 'dct-pending', role: 'status' }, failed ? 'Chinese translation unavailable' : meta.displayStatus === 'ready' ? 'Loading Chinese response…' : node.data.status === 'running' ? 'Claude is running…' : 'Translating response…') : null);
      const mode = state.presentation.mode, layout = state.presentation.layout;
      return h('div', { ref, className: 'dct-reply', 'data-mode': mode, 'data-layout': layout, 'data-run': meta.id },
        bilingual ? base(projectText(node, '', { omitText: true })) : null,
        h('div', { className: 'dct-reply-head' }, h('span', null, mode === 'zh' ? 'Chinese' : 'Bilingual'), zh ? h('button', { type: 'button', title: 'Copy Chinese response', onClick: () => navigator.clipboard.writeText(zh).catch(() => {}) }, 'Copy Chinese') : null),
        failed && !zh ? h('div', { className: 'dct-reply-error', role: 'alert' }, 'Translation did not complete. The original English response is retained.') : null,
        mode === 'bilingual' && layout !== 'collapsed' ? h('div', { className: 'dct-reply-grid' }, languagePane('zh', chinese), languagePane('en', english())) :
          h(React.Fragment, null, chinese, mode === 'bilingual' || failed ? h('details', { open: failed || undefined }, h('summary', null, 'English · Original response'), english()) : null));
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh: { tab: 'Translation' }, en: { tab: 'Translation' } }), 'claude-translate: labels');
      ctx.effect(() => { const style = document.createElement('style'); style.dataset.claudeTranslate = ''; style.textContent = css + chatCSS; document.head.appendChild(style); return () => style.remove(); }, 'claude-translate: scoped style');
      ctx.slots.inject('conversation.input.left', () => ctx.slots.register({ name: 'conversation.input.left', id: 'claude-translate-controls', order: 40 }, ReplyControls));
      ctx.slots.inject('conversation.input.dock', () => followChatStore(ctx.slots));
      function User(props) {
        React.useSyncExternalStore(fn => ctx.slots.subscribe('conversation.chat.node', fn), () => ctx.slots.getVersion('conversation.chat.node'));
        const baseEntry = ctx.slots.entries('conversation.chat.node').filter(e => e.options.key === props.node.kind && e.component !== User).sort((a, b) => (a.options.priority ?? 0) - (b.options.priority ?? 0))[0];
        return baseEntry ? h(CapturedUser, { ...props, baseEntry, originalT: baseEntry.locale ? ctx.locale.bind(baseEntry.locale) : props.t }) : null;
      }
      for (const key of ['user', 'steering']) ctx.slots.inject('conversation.chat.node', () => ctx.slots.register({ name: 'conversation.chat.node', key, priority: -20, locale: NS }, User));
      function Assistant(props) {
        React.useSyncExternalStore(fn => ctx.slots.subscribe('conversation.chat.node', fn), () => ctx.slots.getVersion('conversation.chat.node'));
        const baseEntry = ctx.slots.entries('conversation.chat.node').filter(e => e.options.key === 'assistant-step' && e.component !== Assistant).sort((a, b) => (a.options.priority ?? 0) - (b.options.priority ?? 0))[0];
        return baseEntry ? h(TranslatedAssistant, { ...props, baseEntry, originalT: baseEntry.locale ? ctx.locale.bind(baseEntry.locale) : props.t }) : null;
      }
      ctx.slots.inject('conversation.chat.node', () => ctx.slots.register({ name: 'conversation.chat.node', key: 'assistant-step', priority: -20, locale: NS }, Assistant));
      ctx.effect(() => () => { for (const bus of channels.values()) bus.dispose(); channels.clear(); }, 'claude-translate: chat subscriptions');
      const t = ctx.locale.bind(NS);
      ctx.slots.inject('conversation.view', () => ctx.slots.register({ name: 'conversation.view', id: 'claude-translate', order: 25, locale: NS, label: () => t('tab') }, props => h(View, props)));
    }
    return { name: NS, inject: ['slots', 'locale'], apply };
  },
});
