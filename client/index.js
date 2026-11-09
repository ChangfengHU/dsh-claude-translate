window.__ModuleLoader__.load({
  id: 'dsh-claude-translate',
  factory: require => {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useRef } = React;
    const NS = 'dsh-claude-translate';
    const ROOT = '/claude-translate';
    const states = { translating: '翻译输入', running: 'Claude 执行中', 'translating-output': '翻译回复', succeeded: '已完成', partial: '译文失败', failed: '失败', cancelled: '已取消' };
    const css = `
.dct{font:inherit;font-size:14px;line-height:1.6;letter-spacing:0;color:var(--dsw-alias-label-primary,#25272d);padding:14px 24px 24px;max-width:1160px;margin:0 auto;min-width:0}
.dct *{box-sizing:border-box;letter-spacing:0}.dct button,.dct input,.dct select{font:inherit;color:inherit}.dct button{cursor:pointer;border:1px solid var(--dsw-alias-border-l2,#e2e5ea);border-radius:5px;background:var(--dsw-alias-bg-primary,#fff);padding:5px 10px;white-space:nowrap}.dct button:hover:not(:disabled){background:var(--dsw-alias-markdown-code-block,#f5f6f8)}.dct button:disabled{opacity:.45;cursor:default}.dct button:focus-visible,.dct input:focus-visible,.dct select:focus-visible{outline:2px solid #5b76d4;outline-offset:2px}.dct .primary{background:#4262c6;color:#fff;border-color:#4262c6}.dct .primary:hover:not(:disabled){background:#3554b0}
.dct-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:0 0 12px}.dct-head h2{font-size:16px;margin:0;font-weight:650}.dct-muted{color:var(--dsw-alias-label-secondary,#77808b);font-size:12px}.dct-grow{flex:1}.dct-toggle{display:inline-flex;align-items:center;gap:7px;font-size:12px;white-space:nowrap}.dct input[type=checkbox]{accent-color:#4965c5}
.dct-nav{display:flex;gap:18px;border-bottom:1px solid var(--dsw-alias-border-l2,#e6e8ec);margin-bottom:14px;align-items:center}.dct-nav button{border:0;border-radius:0;padding:7px 0 9px;background:transparent!important;color:var(--dsw-alias-label-secondary,#78808c);border-bottom:2px solid transparent}.dct-nav button[aria-pressed=true]{color:#4865cf;border-color:#4865cf}.dct-count{font-variant-numeric:tabular-nums;padding-left:6px;color:var(--dsw-alias-label-secondary,#8c929d);font-size:12px}
.dct-filter{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 12px}.dct-search{width:260px;max-width:100%;border:1px solid var(--dsw-alias-border-l2,#e1e4e9);border-radius:5px;background:var(--dsw-alias-bg-primary,#fff);padding:6px 10px}.dct-follow{font-size:12px;color:#4965c5}
.dct-timeline{border-top:1px solid var(--dsw-alias-border-l2,#e5e8ed)}.dct-turn{border-bottom:1px solid var(--dsw-alias-border-l2,#e5e8ed);position:relative}.dct-turn[data-open=true]{background:var(--dsw-alias-markdown-code-block,#f8f9fc)}
.dct .dct-row{border:0;border-radius:0;background:transparent!important;width:100%;text-align:left;display:grid;grid-template-columns:22px minmax(160px,1fr) 240px 92px;gap:12px;align-items:center;padding:13px 8px;min-height:72px;white-space:normal}.dct-row:hover .dct-title{color:#4965c5}.dct-caret{font-size:17px;color:#8b93a0;transition:transform .16s ease;width:20px;text-align:center}.dct-turn[data-open=true] .dct-caret{transform:rotate(90deg);color:#4965c5}.dct-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.65;max-width:100%;font-size:13px;font-weight:550}.dct-subline{display:flex;gap:9px;align-items:center;font-size:11px;color:var(--dsw-alias-label-secondary,#878e9a);margin-top:3px;flex-wrap:wrap}.dct-clock{font-variant-numeric:tabular-nums}.dct-status{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#4f7f68;white-space:nowrap}.dct-dot{width:7px;height:7px;border-radius:50%;background:currentColor;flex:none}.dct-status[data-state=failed],.dct-status[data-state=partial]{color:#b65b50}.dct-status[data-state=cancelled]{color:#8c929b}.dct-status[data-state=translating],.dct-status[data-state=running],.dct-status[data-state=translating-output]{color:#4869cb}
.dct-phases{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.dct-phase{font-size:10px;color:var(--dsw-alias-label-secondary,#949aa6);border-bottom:2px solid var(--dsw-alias-border-l2,#e7e9ee);padding-bottom:4px;position:relative;font-variant-numeric:tabular-nums}.dct-phase[data-done=true]{border-color:#a4b5dd;color:var(--dsw-alias-label-primary,#677388)}.dct-phase[data-active=true]{border-color:#4f70d2;color:#4f70d2}
.dct-inspector{padding:0 18px 16px 42px;min-width:0}.dct-inspector-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;border-bottom:1px solid var(--dsw-alias-border-l2,#e5e8ed);padding:0 0 9px;margin-bottom:14px}.dct-inspector-head button{border:0;padding:2px 0;border-radius:0;background:transparent}.dct-inspector-head button[aria-pressed=true]{color:#4865c5}.dct .dct-icon{font-size:16px;padding:0 6px;border:0;background:transparent;line-height:24px;min-width:28px}.dct-pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px;margin-bottom:18px}.dct-pane{min-width:0}.dct-pane-head{display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--dsw-alias-border-l2,#e4e7ee);padding-bottom:6px;margin-bottom:8px}.dct-pane-head h3{font-size:12px;margin:0;font-weight:550}.dct-pane-head .dct-icon{margin-left:auto}.dct-tag{font-size:10px;color:var(--dsw-alias-label-secondary,#8c94a1);margin-left:3px}.dct pre{white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;font:inherit;font-size:13px;line-height:1.85;margin:0;max-height:300px;overflow:auto}.dct pre.code{font-family:ui-monospace,SFMono-Regular,monospace;font-size:11px;padding:12px;background:var(--dsw-alias-bg-primary,#fff);border:1px solid var(--dsw-alias-border-l2,#e5e8ed);line-height:1.6;max-height:380px}.dct details summary{cursor:pointer;font-size:12px;padding:8px 0}
.dct-empty{min-height:190px;display:grid;place-content:center;gap:5px;color:var(--dsw-alias-label-secondary,#7c8491);text-align:center;font-size:13px}.dct-alert{padding:9px 12px;margin:10px 0;border-left:3px solid #bd7167;background:var(--dsw-alias-markdown-code-block,#fcf4f3);font-size:12px;overflow-wrap:anywhere}.dct-footer{display:flex;gap:10px;align-items:center;justify-content:flex-end;padding:14px 0;flex-wrap:wrap}.dct-footer span{margin-right:auto}.dct-live{width:6px;height:6px;background:#6383d5;display:inline-block;border-radius:50%;margin-right:5px}
.dct-form{max-width:720px;padding:4px 0 16px;display:grid;grid-template-columns:135px minmax(0,1fr);gap:14px 16px;align-items:center}.dct-form input:not([type=checkbox]),.dct-form select{width:100%;min-width:0;border:1px solid var(--dsw-alias-border-l2,#d5dde4);background:var(--dsw-alias-bg-primary,#fff);color:inherit;padding:7px 9px;border-radius:5px}.dct-inline{display:flex;gap:8px;align-items:center;min-width:0}.dct-inline input{flex:1}.dct-feedback{padding:8px 0;font-size:13px;color:#287359}.dct-environment{font-size:12px;padding:6px 0 18px;color:var(--dsw-alias-label-secondary,#747e89)}
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
      if (!result.result?.ok) throw new Error(result.result?.error?.message ?? 'Translation RPC failed.');
      return result.result.value;
    }
    function lastUser(request) { return request?.messages?.filter(m => m.source.kind === 'user').flatMap(m => m.content.filter(b => b.type === 'text').map(b => b.text)).at(-1) ?? ''; }
    const ms = n => typeof n === 'number' ? (n / 1000).toFixed(2) + 's' : '--';
    function Copy({ text }) { const [done, setDone] = useState(false); return h('button', { type: 'button', title: '复制文本', 'aria-label': '复制文本', className: 'dct-icon', disabled: !text, onClick: async () => { try { await navigator.clipboard.writeText(text); setDone(true); } catch { setDone(false); } } }, done ? '✓' : '⧉'); }
    function Pane({ title, text, empty }) { return h('section', { className: 'dct-pane' }, h('div', { className: 'dct-pane-head' }, h('h3', null, title), h(Copy, { text })), h('pre', null, text || empty || '等待结果')); }
    function Settings({ state, onSaved }) {
      const [form, setForm] = useState(state.config); const [key, setKey] = useState(''); const [models, setModels] = useState([]); const [busy, setBusy] = useState(false); const [note, setNote] = useState(''); const [error, setError] = useState('');
      const set = (field, value) => setForm(old => ({ ...old, [field]: value }));
      const providers = state.providers.filter(p => !form.targetProviders.includes(p.id) && !/claude/i.test(p.id));
      async function save() {
        setBusy(true); setNote(''); setError('');
        try { const patch = { enabled: form.enabled, mode: form.mode, provider: form.provider, model: form.model, baseURL: form.baseURL, translateOutput: form.translateOutput, targetProviders: form.targetProviders, timeoutMs: Number(form.timeoutMs), retentionDays: Number(form.retentionDays) }; if (key.trim()) patch.apiKey = key.trim(); await api('/config', patch); setKey(''); setNote('配置已保存'); await onSaved(); }
        catch (e) { setError(e.message); } finally { setBusy(false); }
      }
      async function test() {
        setBusy(true); setNote(''); setError('');
        try { const r = await api('/test', {}); setNote(`${r.output} · ${ms(r.durationMs)}`); } catch (e) { setError(e.message); } finally { setBusy(false); }
      }
      const input = (field, props = {}) => h('input', { value: form[field], onChange: e => set(field, e.target.value), ...props });
      return h('div', null,
        h('div', { className: 'dct-form' },
          h('label', { htmlFor: 'dct-mode' }, '翻译来源'), h('select', { id: 'dct-mode', value: form.mode, onChange: e => set('mode', e.target.value) }, h('option', { value: 'route' }, '现有 DSH 模型 / 本机 Codex'), h('option', { value: 'api' }, '独立 API Key')),
          ...(form.mode === 'route' ? [
            h('label', { key: 'provider-label', htmlFor: 'dct-provider' }, 'Provider'), h('select', { key: 'provider', id: 'dct-provider', value: form.provider, onChange: e => { set('provider', e.target.value); setModels([]); } }, h('option', { value: '' }, '选择翻译 Provider'), ...providers.map(p => h('option', { key: p.id, value: p.id }, `${p.name} · ${p.id}`))),
          ] : [
            h('label', { key: 'preset-label', htmlFor: 'dct-preset' }, '服务商'), h('select', { key: 'preset', id: 'dct-preset', value: form.baseURL.includes('dashscope') ? 'qwen' : form.baseURL.includes('deepseek') ? 'deepseek' : 'custom', onChange: e => { if (e.target.value === 'qwen') set('baseURL', 'https://dashscope.aliyuncs.com/compatible-mode/v1'); if (e.target.value === 'deepseek') set('baseURL', 'https://api.deepseek.com/v1'); if (e.target.value === 'custom') set('baseURL', 'https://'); } }, h('option', { value: 'qwen' }, '千问 Qwen'), h('option', { value: 'deepseek' }, 'DeepSeek'), h('option', { value: 'custom' }, 'OpenAI-compatible')),
            h('label', { key: 'url-label', htmlFor: 'dct-url' }, 'API Base URL'), input('baseURL', { key: 'url', id: 'dct-url', autoComplete: 'off' }),
            h('label', { key: 'key-label', htmlFor: 'dct-key' }, 'API Key'), h('div', { key: 'key', className: 'dct-inline' }, h('input', { id: 'dct-key', type: 'password', autoComplete: 'new-password', value: key, placeholder: state.credentialConfigured ? '已配置；留空保持不变' : '尚未配置', onChange: e => setKey(e.target.value) })),
          ]),
          h('label', { htmlFor: 'dct-model' }, '翻译模型'), h('div', { className: 'dct-inline' }, input('model', { id: 'dct-model', list: 'dct-models', placeholder: 'qwen-turbo / deepseek-chat / Codex model' }), form.mode === 'route' ? h('button', { type: 'button', disabled: !form.provider || busy, onClick: async () => { setBusy(true); setError(''); try { const r = await api('/models?provider=' + encodeURIComponent(form.provider)); setModels(r.models); if (!form.model && r.models[0]) set('model', r.models[0].id); } catch (e) { setError(e.message); } finally { setBusy(false); } } }, '读取模型') : null, h('datalist', { id: 'dct-models' }, ...models.map(m => h('option', { key: m.id, value: m.id }, m.name)))),
          h('label', { htmlFor: 'dct-target' }, 'Claude 路由'), h('input', { id: 'dct-target', value: form.targetProviders.join(', '), onChange: e => set('targetProviders', e.target.value.split(',').map(x => x.trim()).filter(Boolean)) }),
          h('label', { htmlFor: 'dct-timeout' }, '翻译超时 / ms'), input('timeoutMs', { id: 'dct-timeout', type: 'number', min: 1000, max: 120000 }),
          h('label', { htmlFor: 'dct-retention' }, '记录保留 / 天'), input('retentionDays', { id: 'dct-retention', type: 'number', min: 1, max: 30 }),
          h('span', null, '中文回复'), h('label', { className: 'dct-toggle' }, h('input', { type: 'checkbox', checked: form.translateOutput, onChange: e => set('translateOutput', e.target.checked) }), '生成中文对照'),
          h('span', null, '默认状态'), h('label', { className: 'dct-toggle' }, h('input', { type: 'checkbox', checked: form.enabled, onChange: e => set('enabled', e.target.checked) }), '默认对所有 Claude 会话启用'),
          h('span'), h('div', { className: 'dct-inline' }, h('button', { type: 'button', className: 'primary', disabled: busy, onClick: save }, busy ? '处理中…' : '保存配置'), h('button', { type: 'button', disabled: busy, onClick: test }, '测试已保存配置')),
        ), error ? h('div', { className: 'dct-alert', role: 'alert' }, error) : null, note ? h('div', { className: 'dct-feedback', role: 'status' }, note) : null,
      );
    }

    function Badge({ status }) { return h('span', { className: 'dct-status', 'data-state': status }, h('span', { className: 'dct-dot', 'aria-hidden': true }), states[status] ?? status); }
    function Phases({ run }) {
      return h('div', { className: 'dct-phases', 'aria-label': '阶段耗时' }, ...[['输入', run.inputTranslationMs, 'translating'], ['Claude', run.claudeMs, 'running'], ['译文', run.outputTranslationMs, 'translating-output']].map(([label, time, state]) => h('div', { key: label, className: 'dct-phase', 'data-done': typeof time === 'number', 'data-active': run.status === state }, label + ' ' + ms(time))));
    }
    function Raw({ run, sessionId }) {
      const [full, setFull] = useState(null); const [error, setError] = useState(''); const [opened, setOpened] = useState('forwarded');
      useEffect(() => { const abort = new AbortController(); api('/run?session=' + encodeURIComponent(sessionId) + '&id=' + run.id + '&full=true', undefined, abort.signal).then(r => setFull(r.run)).catch(e => { if (!abort.signal.aborted) setError(e.message); }); return () => abort.abort(); }, [run.id, sessionId, run.status]);
      return h('div', null, error ? h('div', { className: 'dct-alert', role: 'alert' }, error) : null,
        !full ? h('div', { className: 'dct-muted', role: 'status' }, '正在读取完整请求…') :
          h('div', null, ...[['forwarded', '实际发往 Claude 的英文请求'], ['original', '翻译前的 DSH 请求']].map(([key, title]) =>
            h('details', { key, open: opened === key, onToggle: e => { if (e.currentTarget.open) setOpened(key); else setOpened(old => old === key ? '' : old); } }, h('summary', null, title), opened === key ? h('pre', { className: 'code' }, JSON.stringify(full[key] ?? null, null, 2).slice(0, 64000)) : null)),
            h('div', { className: 'dct-muted' }, '大请求预览最多 64K 字符；下载包含完整记录。图片数据与隐藏推理不在捕获范围。'),
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
        h('div', { className: 'dct-inspector-head' }, ...[['compare', '双语对照'], ['raw', '完整请求']].map(([key, title]) => h('button', { key, type: 'button', 'aria-pressed': view === key, onClick: () => setView(key) }, title)),
          h('span', { className: 'dct-grow' }), run ? h('span', { className: 'dct-muted' }, run.meter ? run.meter.requests + ' 次翻译 / ' + run.meter.cacheHits + ' 次缓存' + (run.meter.repairs ? ' / 修正 ' + run.meter.repairs + ' 次' : '') : '') : null,
          h('button', { type: 'button', className: 'dct-icon', title: '下载完整调用记录', 'aria-label': '下载完整调用记录', disabled: downloading || !run, onClick: download }, '↓')),
        error ? h('div', { className: 'dct-alert', role: 'alert' }, error) : null,
        !run ? h('div', { className: 'dct-muted', role: 'status' }, '读取调用详情…') : h('div', null,
          run.error || run.outputTranslationError ? h('div', { className: 'dct-alert', role: 'alert' }, (run.error ?? run.outputTranslationError).message + ' · ' + (run.error ?? run.outputTranslationError).code) : null,
          view === 'raw' ? h(Raw, { run, sessionId }) : h('div', null,
            h('div', { className: 'dct-pair' }, h(Pane, { title: '用户原文', text: run.input }), h(Pane, { title: '实际转发英文', text: run.forwardedInput, empty: run.status === 'failed' && !run.forwardedAt ? '未发送给 Claude' : '等待输入翻译' })),
            h('div', { className: 'dct-pair' }, h(Pane, { title: 'Claude 原始回复', text: run.rawOutput, empty: '等待 Claude 回复' }), h(Pane, { title: '中文对照', text: run.translatedOutput, empty: run.status === 'translating-output' ? '正在生成译文…' : '暂无译文' })),
            run.truncated ? h('div', { className: 'dct-muted' }, '长文本已折叠截断；下载可查看完整内容。') : null),
          h('div', { className: 'dct-subline' }, h('code', null, item.id), h('span', null, run.translation?.model), item.purpose !== 'conversation' ? h('span', null, '辅助请求 · ' + item.purpose) : null)));
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
      return h('div', { className: 'dct', 'data-version': '0.3.1' },
        h('header', { className: 'dct-head' }, h('h2', null, '翻译调用'), h('span', { className: 'dct-muted dct-model', title: state?.config.model }, state?.config.model || '未配置翻译模型'),
          h('span', { className: 'dct-grow' }), h('label', { className: 'dct-toggle' }, h('input', { type: 'checkbox', checked: enabled, disabled: !state, onChange: toggle }), '本会话启用'),
          h('button', { type: 'button', className: 'dct-icon', title: '刷新调用记录', 'aria-label': '刷新调用记录', onClick: () => setRev(n => n + 1) }, '↻')),
        h('nav', { className: 'dct-nav', 'aria-label': '翻译视图' }, h('button', { type: 'button', 'aria-pressed': view === 'timeline', onClick: () => setView('timeline') }, '调用时间线', h('span', { className: 'dct-count' }, page.total || '0')),
          h('button', { type: 'button', 'aria-pressed': view === 'settings', onClick: () => setView('settings') }, '翻译设置')),
        error ? h('div', { className: 'dct-alert', role: 'alert' }, error, ' ', h('button', { type: 'button', onClick: () => setRev(n => n + 1) }, '重试')) : null,
        view === 'settings' ? state ? h('div', null, h('div', { className: 'dct-environment' },
          state.environment?.claudeRoute ? 'Claude 通道已发现' : '未发现 Claude 通道，请先安装本机 CLI 适配插件',
          ' · ', state.environment?.codexRoute ? 'Codex 翻译通道可选（需本机有效登录）' : '可配置千问或 DeepSeek Key'),
          h(Settings, { key: state.version + state.config.model, state, onSaved: refresh })) : h('div', { className: 'dct-empty' }, '读取翻译配置…') :
          h('div', null, h('div', { className: 'dct-filter' }, h('input', { className: 'dct-search', type: 'search', value: search, onChange: e => setSearch(e.target.value), placeholder: '搜索输入、调用 ID 或状态', 'aria-label': '搜索翻译调用' }),
            h('label', { className: 'dct-toggle dct-muted' }, h('input', { type: 'checkbox', checked: includeAux, onChange: e => setIncludeAux(e.target.checked) }), '辅助请求', page.auxiliaryCount ? ' (' + page.auxiliaryCount + ')' : ''),
            h('span', { className: 'dct-grow' }), h('span', { className: 'dct-muted' }, cursor ? '历史记录' : h(React.Fragment, null, h('span', { className: 'dct-live' }), '实时更新'))),
            loading ? h('div', { className: 'dct-empty', role: 'status' }, '读取调用记录…') : !page.runs.length ? h('div', { className: 'dct-empty' }, query ? '没有匹配的调用' : '本会话暂无翻译调用') :
              h('div', { className: 'dct-timeline', 'aria-label': '翻译调用时间线' }, ...page.runs.map(item => h('article', { key: item.id, className: 'dct-turn', 'data-open': selected === item.id },
                h('button', { type: 'button', className: 'dct-row', 'aria-expanded': selected === item.id, 'aria-controls': 'dct-detail-' + item.id, onClick: () => setSelected(old => old === item.id ? null : item.id) },
                  h('span', { className: 'dct-caret', 'aria-hidden': true }, '›'),
                  h('div', { style: { minWidth: 0 } }, h('div', { className: 'dct-title', title: item.preview }, item.preview || '辅助调用'),
                    h('div', { className: 'dct-subline' }, h('time', { className: 'dct-clock', dateTime: new Date(item.startedAt).toISOString() }, new Date(item.startedAt).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })),
                      h('span', null, item.translation?.model), item.purpose !== 'conversation' ? h('span', null, item.purpose) : null)),
                  h(Phases, { run: item }), h(Badge, { status: item.status })),
                selected === item.id ? h(Inspector, { item, sessionId, cache }) : null))),
            h('footer', { className: 'dct-footer' }, h('span', { className: 'dct-muted' }, page.total ? (firstItem + 1) + '–' + (firstItem + page.runs.length) + ' / ' + page.total + ' 条 · 最多保留100条' : '0 条记录'),
              h('button', { type: 'button', disabled: cursors.length <= 1 || loading, onClick: () => setCursors(old => old.slice(0, -1)) }, '上一页'),
              h('button', { type: 'button', disabled: !page.nextCursor || loading, onClick: () => setCursors(old => [...old, page.nextCursor]) }, '下一页'))));
    }

    const chatCSS = `
.dct-controls{display:flex;align-items:center;gap:7px;flex-wrap:wrap;min-width:0;font:inherit;font-size:12px;letter-spacing:0}.dct-controls label{display:flex;align-items:center;gap:5px;white-space:nowrap}.dct-controls input{accent-color:#4e6cc9}.dct-controls select{font:inherit;color:inherit;background:var(--dsw-alias-bg-primary,#fff);border:1px solid var(--dsw-alias-border-l2,#e2e5ea);border-radius:5px;max-width:124px;padding:3px 5px}.dct-controls select:focus-visible{outline:2px solid #5b76d4}.dct-controls [role=alert]{color:#b45b50;font-size:11px;max-width:240px}
.dct-reply{min-width:0;width:100%;letter-spacing:0;container-type:inline-size}.dct-reply-head{display:flex;gap:10px;align-items:center;margin:4px 0 9px;font-size:11px;line-height:22px;color:var(--dsw-alias-label-secondary,#828a98)}.dct-reply-head button{border:0;background:transparent;color:inherit;font:inherit;padding:0 3px;cursor:pointer}.dct-reply-head button:hover{color:#4965c5}.dct-reply-grid{display:grid;gap:20px;grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.dct-reply[data-layout=stacked] .dct-reply-grid{grid-template-columns:minmax(0,1fr);gap:16px}.dct-language{font-size:11px;font-weight:550;color:var(--dsw-alias-label-secondary,#828a98);padding-bottom:7px;margin-bottom:10px;border-bottom:1px solid var(--dsw-alias-border-l2,#e4e7ed)}.dct-language[data-lang=zh]{border-color:#83b8a3;color:#3d8068}.dct-language[data-lang=en]{border-color:#a0b2d5;color:#617cae}.dct-reply-pane{min-width:0;overflow-wrap:anywhere}.dct-reply details{border-top:1px solid var(--dsw-alias-border-l2,#e4e7ed);margin-top:14px;padding-top:8px}.dct-reply summary{cursor:pointer;font-size:12px;color:var(--dsw-alias-label-secondary,#7b8491);padding:4px 0}.dct-pending{color:var(--dsw-alias-label-secondary,#7b8491);font-size:13px;padding:8px 0}.dct-reply-error{border-left:2px solid #b87967;padding:5px 10px;margin:6px 0 10px;font-size:12px;color:#a26453}
@container(max-width:560px){.dct-reply-grid{grid-template-columns:minmax(0,1fr);gap:16px}}
`;
    const channels = new Map();
    function channel(sessionId) {
      if (channels.has(sessionId)) return channels.get(sessionId);
      const listeners = new Set(), wanted = new Set(), details = new Map();
      let snapshot = { runs: [], presentation: { mode: 'zh', layout: 'parallel' }, enabled: false, loaded: false };
      let timer, batchTimer, refs = 0, busy = false, stopped = false, revision = '', pendingConfig = 0, configEpoch = 0;
      const abort = new AbortController();
      const emit = value => { snapshot = { ...snapshot, ...value }; for (const fn of listeners) fn(); };
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
      async function save(fn) { setBusy(true); setError(''); try { await fn(); } catch (e) { setError(e.message); } finally { setBusy(false); } }
      return h('div', { className: 'dct-controls', 'data-translate-controls': '0.3.1' },
        h('label', null, h('input', { type: 'checkbox', checked: state.enabled, disabled: busy || !state.loaded, onChange: () => save(() => bus.toggle()) }), '中英转换'),
        h('select', { 'aria-label': '回复语言', title: '回复语言', value: state.presentation.mode, disabled: busy || !state.loaded, onChange: e => save(() => bus.preference({ ...state.presentation, mode: e.target.value })) },
          h('option', { value: 'zh' }, '纯中文'), h('option', { value: 'en' }, '纯英文'), h('option', { value: 'bilingual' }, '中英双语')),
        state.presentation.mode === 'bilingual' ? h('select', { 'aria-label': '双语样式', title: '双语样式', value: state.presentation.layout, disabled: busy, onChange: e => save(() => bus.preference({ ...state.presentation, layout: e.target.value })) },
          h('option', { value: 'parallel' }, '左右对照'), h('option', { value: 'stacked' }, '上下对照'), h('option', { value: 'collapsed' }, '中文＋折叠英文')) : null,
        error || state.error ? h('span', { role: 'alert' }, error || state.error) : null);
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
      const languagePane = (lang, content) => h('section', { className: 'dct-reply-pane', lang: lang === 'zh' ? 'zh-CN' : 'en' }, h('div', { className: 'dct-language', 'data-lang': lang }, lang === 'zh' ? '中文' : 'English'), content);
      const chinese = h(React.Fragment, null, primary, !zh ? h('div', { className: 'dct-pending', role: 'status' }, failed ? '中文译文暂不可用' : meta.displayStatus === 'ready' ? '正在读取中文回复…' : node.data.status === 'running' ? 'Claude 正在执行…' : '正在生成中文回复…') : null);
      const mode = state.presentation.mode, layout = state.presentation.layout;
      return h('div', { ref, className: 'dct-reply', 'data-mode': mode, 'data-layout': layout, 'data-run': meta.id },
        bilingual ? base(projectText(node, '', { omitText: true })) : null,
        h('div', { className: 'dct-reply-head' }, h('span', null, mode === 'zh' ? '中文' : '中英双语'), zh ? h('button', { type: 'button', title: '复制中文回复', onClick: () => navigator.clipboard.writeText(zh).catch(() => {}) }, '复制中文') : null),
        failed && !zh ? h('div', { className: 'dct-reply-error', role: 'alert' }, '中文译文未完成，以下保留英文原文。') : null,
        mode === 'bilingual' && layout !== 'collapsed' ? h('div', { className: 'dct-reply-grid' }, languagePane('zh', chinese), languagePane('en', english())) :
          h(React.Fragment, null, chinese, mode === 'bilingual' || failed ? h('details', { open: failed || undefined }, h('summary', null, 'English · 原始回复'), english()) : null));
    }

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh: { tab: '翻译' }, en: { tab: 'Translation' } }), 'claude-translate: labels');
      ctx.effect(() => { const style = document.createElement('style'); style.dataset.claudeTranslate = ''; style.textContent = css + chatCSS; document.head.appendChild(style); return () => style.remove(); }, 'claude-translate: scoped style');
      ctx.slots.inject('conversation.input.left', () => ctx.slots.register({ name: 'conversation.input.left', id: 'claude-translate-controls', order: 40 }, ReplyControls));
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
