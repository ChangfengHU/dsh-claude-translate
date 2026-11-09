import { homedir } from 'node:os';
import { join } from 'node:path';
import { createMessage } from '@deepseek-ai/dsh-llm';
import { Store } from './store.js';
import { TranslationEngine } from './engine.js';
import { createExecutor } from './provider.js';
import { createRpcHandler, CHANNEL } from './rpc.js';
import { StreamBypass } from './bypass.js';

export const name = 'dsh-claude-translate';
export const inject = ['llm', 'credentials', 'connection'];

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
  const engine = new TranslationEngine({ store, execute, makeMessage: createMessage, dispatch });
  ctx.on('llm/stream', (options, next) => bypass.active ? next() : engine.stream(options, next));
  ctx.connection.rpc.handle(CHANNEL, createRpcHandler({ store, engine, credentials, llm }), { authority: 'trusted-host' });
}
