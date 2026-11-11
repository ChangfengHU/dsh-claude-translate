import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const tick = (n = 30) => new Promise(resolve => setTimeout(resolve, n));
async function client(fetch, open = false) {
  let plugin;
  const react = {
    createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
    useState: value => [typeof value === 'function' ? value() : value === false ? open : value, () => {}],
    useEffect() {}, useRef: () => ({ current: null }), useMemo: fn => fn(), useSyncExternalStore: (_fn, snapshot) => snapshot(),
  };
  const source = (await readFile(new URL('../client/index.js', import.meta.url), 'utf8')).replace("return { name: NS, inject: ['slots', 'locale'], apply };", "return { name: NS, inject: ['slots', 'locale'], apply, channel, TranslatedAssistant, CapturedUser };");
  vm.runInNewContext(source, { window: { __ModuleLoader__: { load: module => { plugin = module.factory(() => react); } } }, URL, URLSearchParams, AbortController, crypto, setTimeout, clearTimeout, setInterval, clearInterval, document: { hidden: false }, fetch });
  return plugin;
}
const response = value => ({ ok: true, json: async () => ({ result: { ok: true, value } }) });
function all(node, predicate) { const values = []; function visit(n) { if (!n || typeof n !== 'object') return; if (predicate(n)) values.push(n); for (const child of n.children ?? []) Array.isArray(child) ? child.forEach(visit) : visit(child); } visit(node); return values; }
const texts = tree => all(tree, node => !!node.props?.node).flatMap(n => n.props.node.data.blocks.filter(b => b.kind === 'text').map(b => b.text));

test('the pipeline stays visible during Claude first-token wait and moves without duplication', async () => {
  for (const firstEnglishAt of [undefined, 3]) {
    const meta = { id: 'tr_wait', purpose: 'conversation', status: 'running', startedAt: 1, forwardedAt: 2, firstEnglishAt, inputIdentity: { seq: 4 }, position: { turn: 1, step: 0 }, revision: 'waiting' };
    const plugin = await client(async () => response({ runs: [meta], revision: 'one', enabled: true, presentation: { mode: 'en', layout: 'parallel' }, display: [] }));
    const bus = plugin.channel('session-wait'), disconnect = bus.connect(); await tick();
    const user = plugin.CapturedUser({ baseEntry: { component: 'NativeUser' }, node: { data: { seq: 4 } }, sessionId: 'session-wait' });
    const assistant = plugin.TranslatedAssistant({ baseEntry: { component: 'Native' }, node: { data: { turn: 1, step: 0, blocks: [] } }, sessionId: 'session-wait' });
    const pipelines = tree => all(tree, n => typeof n.type === 'function' && n.type.name === 'Pipeline').length;
    assert.equal(pipelines(user), firstEnglishAt ? 0 : 1);
    assert.equal(pipelines(assistant), firstEnglishAt ? 1 : 0);
    disconnect(); bus.dispose();
  }
});

test('one shared long-poll replaces rapid polling and disconnect cancels its network request', async () => {
  const calls = []; let cancelled = 0;
  const plugin = await client(async (url, request) => {
    calls.push(url);
    if (url.endsWith('/chat')) return response({ runs: [], revision: 'one', watchRevision: 1, enabled: true, presentation: { mode: 'zh', layout: 'parallel' } });
    if (url.endsWith('/watch')) return new Promise((_resolve, reject) => request.signal.addEventListener('abort', () => { cancelled++; reject(new Error('Aborted')); }, { once: true }));
    return response({ runs: [] });
  });
  const bus = plugin.channel('session-live'); const first = bus.connect(), second = bus.connect();
  await tick(100); assert.equal(calls.length, 2); assert.ok(calls[1].endsWith('/watch'));
  first(); assert.equal(cancelled, 0); second(); await tick(); assert.equal(cancelled, 1);
  const reconnect = bus.connect(); await tick(100); assert.equal(calls.length, 3); reconnect(); bus.dispose();
});

test('Chinese mode never hides English while Chinese is pending or streaming', async () => {
  const meta = { id: 'tr_123', purpose: 'conversation', status: 'running', displayStatus: 'pending', startedAt: 1, firstEnglishAt: 2, position: { turn: 1, step: 0 }, revision: 'live' };
  const plugin = await client(async () => response({ runs: [meta], revision: 'one', enabled: true, presentation: { mode: 'zh', layout: 'parallel' }, display: [{ ...meta, rawOutput: 'Live English answer.', translatedOutput: '', outputPreview: '中文增量' }] }));
  const bus = plugin.channel('session-present'), disconnect = bus.connect(); await tick();
  const blocks = [{ kind: 'reasoning', text: 'native-only' }, { kind: 'text', text: 'Live English answer.' }, { kind: 'other', block: { type: 'codex-action', id: 'action' } }];
  const tree = plugin.TranslatedAssistant({ baseEntry: { component: 'Native' }, node: { data: { turn: 1, step: 0, status: 'running', blocks } }, sessionId: 'session-present' });
  assert.ok(texts(tree).includes('Live English answer.')); assert.ok(texts(tree).includes('中文增量'));
  const projected = all(tree, n => n.props?.node).flatMap(n => n.props.node.data.blocks);
  assert.equal(projected.filter(b => b.kind === 'other').length, 1); assert.equal(projected.filter(b => b.kind === 'reasoning').length, 1);
  assert.equal(blocks[1].text, 'Live English answer.'); disconnect(); bus.dispose();
});

test('completed Chinese keeps the original in a collapsed disclosure; failure expands it', async () => {
  for (const failed of [false, true]) {
    const meta = { id: 'tr_123', purpose: 'conversation', status: failed ? 'partial' : 'succeeded', displayStatus: failed ? 'failed' : 'ready', startedAt: 1, position: { turn: 1, step: 0 }, revision: 'done' };
    const plugin = await client(async () => response({ runs: [meta], revision: 'one', enabled: true, presentation: { mode: 'zh', layout: 'parallel' }, display: [{ ...meta, translatedOutput: '中文结果' }] }));
    const bus = plugin.channel('session-done'), disconnect = bus.connect(); await tick();
    const tree = plugin.TranslatedAssistant({ baseEntry: { component: 'Native' }, node: { data: { turn: 1, step: 0, blocks: [{ kind: 'text', text: 'Original English.' }] } }, sessionId: 'session-done' });
    const disclosure = all(tree, n => n.type === 'details')[0]; assert.equal(!!disclosure.props.open, failed);
    assert.ok(texts(tree).includes('Original English.')); disconnect(); bus.dispose();
  }
});

test('English-only and all bilingual layouts preserve the native live English response', async () => {
  for (const [mode, layout] of [['en', 'parallel'], ['bilingual', 'parallel'], ['bilingual', 'stacked'], ['bilingual', 'collapsed']]) {
    const meta = { id: 'tr_123', purpose: 'conversation', status: 'running', displayStatus: 'pending', position: { turn: 1, step: 0 }, revision: 'live' };
    const plugin = await client(async () => response({ runs: [meta], revision: 'one', enabled: true, presentation: { mode, layout }, display: [{ ...meta, outputPreview: '中文进行中' }] }));
    const bus = plugin.channel('session-modes'), disconnect = bus.connect(); await tick();
    const tree = plugin.TranslatedAssistant({ baseEntry: { component: 'Native' }, node: { data: { turn: 1, step: 0, blocks: [{ kind: 'text', text: 'Streaming English.' }] } }, sessionId: 'session-modes' });
    assert.ok(texts(tree).includes('Streaming English.'));
    if (mode === 'bilingual') assert.ok(texts(tree).includes('中文进行中'));
    if (layout === 'collapsed') assert.equal(all(tree, n => n.type === 'details')[0].props.open, true);
    disconnect(); bus.dispose();
  }
});

test('an input preview is explicitly not sent and never masquerades as captured English', async () => {
  const meta = { id: 'tr_123', purpose: 'conversation', status: 'translating', startedAt: 1, inputIdentity: { seq: 4 }, revision: 'input' };
  const plugin = await client(async () => response({ runs: [meta], revision: 'one', enabled: true, presentation: { mode: 'zh', layout: 'parallel' }, display: [{ ...meta, inputPreview: 'Help me prepare.' }] }), true);
  const bus = plugin.channel('session-input'), disconnect = bus.connect(); await tick();
  const tree = plugin.CapturedUser({ baseEntry: { component: 'NativeUser' }, node: { data: { seq: 4 } }, sessionId: 'session-input' });
  const text = JSON.stringify(tree); assert.ok(text.includes('English preview · Not sent')); assert.ok(text.includes('Help me prepare.')); assert.ok(!text.includes('English sent to Claude'));
  disconnect(); bus.dispose();
});
