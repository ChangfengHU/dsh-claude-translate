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
      .dct{font:inherit;font-size:14px;line-height:1.6;letter-spacing:0;color:var(--dsw-alias-label-primary,#20272d);padding:12px 20px;min-width:0}
      .dct *{box-sizing:border-box;letter-spacing:0}.dct button,.dct input,.dct select,.dct textarea{font:inherit}
      .dct button{cursor:pointer;border:1px solid var(--dsw-alias-border-l2,#dce2e7);border-radius:6px;padding:5px 10px;background:var(--dsw-alias-bg-primary,#fff);color:inherit;white-space:nowrap}.dct button:disabled{opacity:.5;cursor:default}
      .dct button:hover:not(:disabled){background:var(--dsw-alias-markdown-code-block,#f1f4f6)}.dct .primary{background:#176c59;color:#fff;border-color:#176c59}.dct .primary:hover:not(:disabled){background:#135b4b}
      .dct-top{display:flex;align-items:center;gap:12px;flex-wrap:wrap;border-bottom:1px solid var(--dsw-alias-border-l2,#e0e5e9);padding-bottom:12px}.dct-top strong{font-size:16px}.dct-grow{flex:1}.dct-toggle{display:flex;gap:7px;align-items:center;white-space:nowrap}.dct input[type=checkbox]{accent-color:#176c59}
      .dct-subnav{display:flex;align-items:center;gap:5px;margin:12px 0}.dct-subnav button[aria-pressed=true]{background:#e5eef8;color:#235880;border-color:#c0d3e8}.dct-muted{font-size:12px;color:var(--dsw-alias-label-secondary,#697580)}
      .dct-workspace{display:grid;grid-template-columns:190px minmax(0,1fr);gap:18px;min-height:380px}.dct-runs{border-right:1px solid var(--dsw-alias-border-l2,#e0e5e9);padding-right:12px;display:flex;flex-direction:column;gap:7px}.dct-runs button{display:block;white-space:normal;text-align:left;padding:9px;width:100%;overflow-wrap:anywhere}.dct-runs button[aria-current=true]{border-color:#34856e;background:var(--dsw-alias-markdown-code-block,#eef6f2)}.dct-run-head{display:flex;justify-content:space-between;gap:5px;font-size:12px}.dct-run-title{margin-top:5px;font-size:12px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.5}
      .dct-detail{min-width:0}.dct-meta{display:flex;gap:13px;flex-wrap:wrap;padding:0 0 12px;color:var(--dsw-alias-label-secondary,#697580);font-size:12px}.dct-badge{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:#20735a}.dct-badge:before{content:'';width:6px;height:6px;border-radius:50%;background:currentColor}.dct-badge[data-state=failed],.dct-badge[data-state=partial]{color:#af443a}.dct-badge[data-state=running],.dct-badge[data-state=translating],.dct-badge[data-state=translating-output]{color:#286da5}
      .dct-pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;margin-bottom:20px}.dct-pane{min-width:0;border-top:2px solid #8da3ba;padding-top:8px}.dct-pane:nth-child(2){border-top-color:#56a28b}.dct-pane-head{display:flex;align-items:center;gap:8px;margin-bottom:8px}.dct-pane-head h3{font-size:13px;margin:0;font-weight:600}.dct-pane-head button{font-size:12px;padding:1px 7px;margin-left:auto}.dct pre{white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;margin:0;font-family:inherit;font-size:14px;line-height:1.75;max-height:600px;overflow:auto}.dct pre.code{font-family:ui-monospace,SFMono-Regular,monospace;font-size:12px;background:var(--dsw-alias-markdown-code-block,#f4f6f8);padding:12px;border-radius:6px;line-height:1.6;max-height:65vh}.dct details{margin:12px 0}.dct summary{cursor:pointer;font-size:13px;padding:6px 0}
      .dct-alert{border-left:3px solid #ba654c;background:var(--dsw-alias-markdown-code-block,#fff4ef);padding:9px 12px;margin:12px 0;font-size:13px;overflow-wrap:anywhere}.dct-empty{display:flex;align-items:center;justify-content:center;min-height:240px;color:var(--dsw-alias-label-secondary,#75818c);font-size:14px}.dct-form{max-width:720px;padding:4px 0 16px;display:grid;grid-template-columns:135px minmax(0,1fr);gap:14px 16px;align-items:center}.dct-form input:not([type=checkbox]),.dct-form select{width:100%;min-width:0;border:1px solid var(--dsw-alias-border-l2,#d5dde4);background:var(--dsw-alias-bg-primary,#fff);color:inherit;padding:7px 9px;border-radius:6px}.dct-inline{display:flex;gap:8px;align-items:center;min-width:0}.dct-inline input{flex:1}.dct-feedback{padding:8px 0;font-size:13px;color:#287359}.dct-compose{display:flex;gap:9px;align-items:flex-end;border-top:1px solid var(--dsw-alias-border-l2,#e0e5e9);padding-top:12px;margin-top:12px}.dct-compose textarea{flex:1;min-height:66px;max-height:180px;resize:vertical;padding:9px 11px;border:1px solid var(--dsw-alias-border-l2,#d5dde4);border-radius:6px;background:var(--dsw-alias-bg-primary,#fff);color:inherit;min-width:0}
      @media(max-width:850px){.dct{padding:10px 12px}.dct-workspace{grid-template-columns:minmax(0,1fr)}.dct-runs{border-right:0;border-bottom:1px solid #dce2e7;padding:0 0 10px;flex-direction:row;overflow:auto}.dct-runs button{flex:0 0 155px}.dct-pair{grid-template-columns:minmax(0,1fr)}.dct-form{grid-template-columns:minmax(0,1fr);gap:6px}.dct-form label{margin-top:9px}.dct-grow{display:none}}
      @media(prefers-reduced-motion:no-preference){.dct-pane{animation:dct-reveal .18s ease-out}@keyframes dct-reveal{from{opacity:.55;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}}
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
    function Copy({ text }) { const [done, setDone] = useState(false); return h('button', { type: 'button', title: '复制原文', disabled: !text, onClick: async () => { try { await navigator.clipboard.writeText(text); setDone(true); } catch { setDone(false); } } }, done ? '已复制' : '复制'); }
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
    function View({ sessionId }) {
      const [state, setState] = useState(null); const [runs, setRuns] = useState([]); const [run, setRun] = useState(null); const [selected, setSelected] = useState(''); const selectedRef = useRef('');
      const [view, setView] = useState('compare'); const [error, setError] = useState(''); const [draft, setDraft] = useState(''); const [sending, setSending] = useState(false); const [rev, setRev] = useState(0);
      const scope = '?session=' + encodeURIComponent(sessionId ?? '');
      const refresh = async () => { const result = await api('/state'); setState(result); return result; };
      useEffect(() => { const abort = new AbortController(); setState(null); setError(''); api('/state', undefined, abort.signal).then(setState).catch(e => { if (!abort.signal.aborted) setError(e.message); }); return () => abort.abort(); }, [sessionId, rev]);
      useEffect(() => {
        const abort = new AbortController(); let timer;
        selectedRef.current = ''; setSelected(''); setRun(null); setRuns([]);
        async function poll() {
          try {
            if (!document.hidden && sessionId) {
              const list = await api('/runs' + scope, undefined, abort.signal);
              if (abort.signal.aborted) return;
              setRuns(list.runs);
              const id = selectedRef.current || list.runs[0]?.id;
              if (id) { const detail = await api('/run' + scope + '&id=' + encodeURIComponent(id), undefined, abort.signal); if (!abort.signal.aborted && (!selectedRef.current || selectedRef.current === id)) { setRun(detail.run); setSelected(id); } }
            }
          } catch (e) { if (!abort.signal.aborted) setError(e.message); }
          if (!abort.signal.aborted) timer = setTimeout(poll, 1800);
        }
        poll(); return () => { abort.abort(); clearTimeout(timer); };
      }, [sessionId]);
      const enabled = state ? (state.config.sessions[sessionId] ?? state.config.enabled) : false;
      async function toggle() { try { await api('/session', { sessionId, enabled: !enabled }); await refresh(); } catch (e) { setError(e.message); } }
      async function send() {
        if (!draft.trim() || sending) return;
        if (!enabled) { setError('请先配置翻译模型并启用本会话翻译。'); return; }
        const text = draft; setSending(true); setError(''); selectedRef.current = ''; setDraft('');
        try { const scoped = View.ctx.get('sessions')?.scope(sessionId); if (!scoped?.conversation) throw Error('当前会话尚未就绪。'); await scoped.conversation.send(text); }
        catch (e) { setError(e.message); setDraft(text); } finally { setSending(false); }
      }
      function download() { if (!run) return; const url = URL.createObjectURL(new Blob([JSON.stringify(run, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = run.id + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
      return h('div', { className: 'dct' },
        h('div', { className: 'dct-top' }, h('strong', null, 'Claude 翻译'), h('span', { className: 'dct-muted' }, state ? `${state.config.mode === 'api' ? 'API' : state.config.provider || '未配置'} / ${state.config.model || '--'}` : '连接中…'), h('span', { className: 'dct-grow' }), h('label', { className: 'dct-toggle' }, h('input', { type: 'checkbox', checked: enabled, disabled: !state, onChange: toggle }), '本会话启用'), h('button', { type: 'button', onClick: () => setRev(n => n + 1) }, '刷新')),
        h('div', { className: 'dct-subnav' }, ...[['compare', '双语对照'], ['raw', '转发请求'], ['settings', '配置']].map(([id, title]) => h('button', { key: id, type: 'button', 'aria-pressed': view === id, onClick: () => setView(id) }, title)), h('span', { className: 'dct-grow' }), view !== 'settings' ? h('button', { type: 'button', disabled: !run, onClick: download }, '导出记录') : null),
        error ? h('div', { className: 'dct-alert', role: 'alert' }, error) : null,
        view === 'settings' ? (state ? h(Settings, { key: rev, state, onSaved: refresh }) : h('div', { className: 'dct-empty' }, '正在读取配置')) : h('div', null,
          h('div', { className: 'dct-workspace' }, h('aside', { className: 'dct-runs', 'aria-label': '翻译运行记录' }, runs.length ? runs.map(item => h('button', { key: item.id, type: 'button', 'aria-current': item.id === selected, onClick: () => { selectedRef.current = item.id; setSelected(item.id); setRun(null); } }, h('div', { className: 'dct-run-head' }, h('span', { className: 'dct-badge', 'data-state': item.status }, states[item.status] ?? item.status), new Date(item.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })), h('div', { className: 'dct-run-title' }, item.preview || item.id.slice(0, 11)))) : h('span', { className: 'dct-muted' }, '暂无翻译记录')),
            run ? h('main', { className: 'dct-detail' },
              h('div', { className: 'dct-meta' }, h('span', { className: 'dct-badge', 'data-state': run.status }, states[run.status] ?? run.status), h('span', null, '输入翻译 ' + ms(run.inputTranslationMs)), h('span', null, 'Claude ' + ms(run.claudeMs)), h('span', null, '译文 ' + ms(run.outputTranslationMs)), h('span', null, `${run.meter.requests} 次翻译 · ${run.meter.cacheHits} 次缓存`)),
              run.error || run.outputTranslationError ? h('div', { className: 'dct-alert' }, (run.error ?? run.outputTranslationError).message, ' · ', (run.error ?? run.outputTranslationError).code) : null,
              view === 'raw' ? h('div', null, h('div', { className: 'dct-muted' }, 'DSH 实际转发请求；图片内容、凭据及隐藏推理不在此展示。'), h('details', { open: true }, h('summary', null, '英文转发请求'), h(Copy, { text: JSON.stringify(run.forwarded, null, 2) }), h('pre', { className: 'code' }, run.forwarded ? JSON.stringify(run.forwarded, null, 2) : '尚未转发到 Claude')), h('details', null, h('summary', null, '翻译前原始请求'), h('pre', { className: 'code' }, JSON.stringify(run.original, null, 2))), h('div', { className: 'dct-muted' }, run.forwardedSnapshotSha256 ? 'Snapshot SHA-256: ' + run.forwardedSnapshotSha256 : '')) : h('div', null,
                h('div', { className: 'dct-pair' }, h(Pane, { title: '用户原文', text: lastUser(run.original) }), h(Pane, { title: '实际转发的英文', text: lastUser(run.forwarded), empty: run.status === 'failed' ? '未调用 Claude Code' : '正在翻译' })),
                h('div', { className: 'dct-pair' }, h(Pane, { title: 'Claude 原始回复', text: run.rawOutput, empty: '等待 Claude 回复' }), h(Pane, { title: '中文对照', text: run.translatedOutput, empty: run.status === 'translating-output' ? '正在生成译文' : '暂无译文' })),
              ),
            ) : h('main', { className: 'dct-empty' }, runs.length ? '读取运行记录…' : '本会话尚无翻译调用'),
          ),
          h('div', { className: 'dct-compose' }, h('textarea', { 'aria-label': '发送给 Claude 的原文', value: draft, onChange: e => setDraft(e.target.value), placeholder: '输入原文', disabled: sending, onKeyDown: e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } } }), h('button', { type: 'button', className: 'primary', disabled: sending || !draft.trim() || !state, onClick: send }, sending ? '提交中…' : '发送到当前会话')),
        ),
      );
    }
    function apply(ctx) {
      View.ctx = ctx;
      ctx.effect(() => ctx.locale.register(NS, { zh: { tab: '翻译' }, en: { tab: 'Translation' } }), 'claude-translate: labels');
      ctx.effect(() => { const style = document.createElement('style'); style.dataset.claudeTranslate = ''; style.textContent = css; document.head.appendChild(style); return () => style.remove(); }, 'claude-translate: scoped style');
      const t = ctx.locale.bind(NS);
      ctx.slots.inject('conversation.view', () => ctx.slots.register({ name: 'conversation.view', id: 'claude-translate', order: 25, locale: NS, label: () => t('tab') }, props => h(View, props)));
    }
    return { name: NS, inject: ['slots', 'locale'], apply };
  },
});
