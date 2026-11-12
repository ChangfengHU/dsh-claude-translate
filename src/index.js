import { homedir } from 'node:os';
import { join } from 'node:path';
import { createMessage } from '@deepseek-ai/dsh-llm';
import { Store } from './store.js';
import { TranslationEngine } from './engine.js';
import { createExecutor } from './provider.js';
import { createRpcHandler, CHANNEL } from './rpc.js';
import { StreamBypass } from './bypass.js';
import { currentPosition, legacyPosition, userInputIdentity, lastUserText } from './presentation.js';
import { failure } from './text.js';

export const name = 'dsh-claude-translate';
export const inject = ['llm', 'credentials', 'connection', 'sessions', 'apiProxy'];

export async function apply(ctx) {
  const profileIndex = process.argv.indexOf('--profile');
  const profile = (profileIndex >= 0 ? process.argv[profileIndex + 1] : 'default') ?? 'default';
  if (!/^[A-Za-z0-9_-]+$/.test(profile)) throw new Error('Invalid DSH profile name.');
  const store = new Store(join(homedir(), '.dsh', 'claude-translate', profile));
  await store.init();
  const bypass = new StreamBypass();
  const dispatch = request => bypass.stream(request => ctx.llm.stream(request), request);
  const credentials = {
    resolve: ref => ctx.credentials.resolve(ref),
    describe: ref => ctx.credentials.describe(ref),
    set: (ref, value) => ctx.credentials.set(ref, value),
    unset: ref => ctx.credentials.unset(ref),
  };
  const llm = { listProviders: () => ctx.llm.listProviders(), listModels: provider => ctx.llm.listModels(provider) };
  const execute = createExecutor({ dispatch, makeMessage: createMessage, credentials });
  const engine = new TranslationEngine({ store, execute, makeMessage: createMessage, dispatch, catalog: llm, position: id => currentPosition(ctx.sessions.get(id)?.events), inputIdentity: request => userInputIdentity(request, ctx.sessions.get(request.sessionId)?.events) });
  ctx.on('dispose', () => engine.dispose());
  const attempted = new Set();
  const reconcile = async session => {
    const events = ctx.sessions.get(session)?.events;
    if (!events) return;
    for (const id of attempted) if (!store.index.has(id)) attempted.delete(id);
    let examined = 0;
    for (const meta of store.displayPage(session)) if ((!meta.position || !meta.inputIdentity) && !store.active.has(meta.id) && !attempted.has(meta.id)) {
      if (examined++ >= 4) break;
      attempted.add(meta.id);
      const run = await store.get(session, meta.id);
      if (!run) continue;
      const position = !run.position && legacyPosition(run, events);
      const identity = !run.inputIdentity && userInputIdentity(run.original, events);
      if (position || identity) {
        if (position) run.position = position;
        if (identity) { run.inputIdentity = identity; run.forwardedInput = lastUserText(run.forwarded); }
        await store.save(run);
      }
    }
  };
  ctx.on('llm/stream', (options, next) => bypass.active ? next() : engine.stream(options, next));
  const selection = async sessionId => {
    const response = await ctx.apiProxy.sessions.models({ type: 'client-request', rpcId: crypto.randomUUID(), method: 'session.models', payload: { sessionId } });
    if (!response.result.ok) throw failure('TRANSLATION_SESSION_UNAVAILABLE', 'The current session model could not be read. Refresh the session.');
    return response.result.value.current;
  };
  ctx.connection.rpc.handle(CHANNEL, createRpcHandler({ store, engine, credentials, llm, reconcile, selection }), { authority: 'trusted-host' });
}
