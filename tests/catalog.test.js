import { test } from 'node:test';
import assert from 'node:assert/strict';
import { claudeRoutes, selectTranslationModel, translationModels, validateSelection } from '../src/catalog.js';
import { TranslationEngine } from '../src/engine.js';
import { DEFAULT_CONFIG } from '../src/store.js';

const providers = [{ id: 'claude-local', name: 'Claude on host' }, { id: 'office-code', name: 'Claude Code' }, { id: 'anthropic', name: 'Claude API' }, { id: 'codex-local', name: 'Codex' }];
const llm = { listProviders: () => providers, listModels: async id => id === 'codex-local' ? [{ id: 'gpt-one' }, { id: 'gpt-two' }] : [] };

test('native Claude targets are detected without treating generic API sources as Claude Code', () => {
  assert.deepEqual(claudeRoutes(providers), ['claude-local', 'office-code']);
  assert.deepEqual(claudeRoutes([]), []);
});
test('model selection retains valid choices and resets only invalid choices', () => {
  assert.equal(DEFAULT_CONFIG.model, 'qwen-flash');
  assert.equal(DEFAULT_CONFIG.enabled, false);
  const models = [{ id: 'one' }, { id: 'two', recommended: true }];
  assert.equal(selectTranslationModel(models, 'one'), 'one');
  assert.equal(selectTranslationModel(models, 'qwen-flash'), 'two');
  assert.equal(selectTranslationModel([], 'old'), '');
  assert.equal(selectTranslationModel([{ id: 'qwen-plus-latest' }, { id: 'qwen-flash' }]), 'qwen-flash');
  assert.equal(selectTranslationModel([{ id: 'qwen-plus-latest' }, { id: 'qwen-flash' }], 'qwen-plus-latest'), 'qwen-plus-latest');
});
test('a registered model is required and Claude cannot translate its own input', async () => {
  await validateSelection(llm, { mode: 'route', provider: 'codex-local', model: 'gpt-one' });
  await assert.rejects(validateSelection(llm, { mode: 'route', provider: 'codex-local', model: 'qwen-flash' }), { code: 'TRANSLATION_MODEL_MISMATCH' });
  await assert.rejects(translationModels(llm, 'office-code'), { code: 'TRANSLATION_RECURSION' });
  await assert.rejects(translationModels(llm, 'missing'), { code: 'INVALID_CONFIG' });
  await validateSelection(llm, { mode: 'api', model: 'custom-model' });
});
test('a stale saved source/model pair cannot invoke Claude or a translator', async () => {
  let calls = 0;
  const store = { config: { enabled: true, sessions: {}, mode: 'route', provider: 'codex-local', model: 'qwen-flash', targetProviders: ['old-route'] } };
  const engine = new TranslationEngine({ store, catalog: llm, execute: () => { calls++; }, dispatch: () => { calls++; } });
  assert.equal(engine.enabled({ provider: 'office-code', sessionId: 'session-a' }), true);
  assert.equal(engine.enabled({ provider: 'anthropic', sessionId: 'session-a' }), false);
  await assert.rejects(async () => { for await (const chunk of engine.stream({ provider: 'claude-local', sessionId: 'session-a' }, () => { calls++; })) {} }, { code: 'TRANSLATION_MODEL_MISMATCH' });
  assert.equal(calls, 0);
});
