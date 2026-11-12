import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translationPolicy } from '../src/policy.js';
import { claudeRoutes } from '../src/catalog.js';
import { TranslationEngine } from '../src/engine.js';

test('only registered Claude Code execution routes require translation', () => {
  const targets = claudeRoutes([{ id: 'claude-local' }, { id: 'custom-local', name: 'Claude Code' }, { id: 'qwen', name: 'Qwen' }, { id: 'anthropic', name: 'Claude API' }]);
  for (const provider of ['claude-local', 'custom-local']) assert.deepEqual(translationPolicy(provider, targets), { provider, enabled: true, required: true, editable: false });
  for (const provider of ['qwen', 'deepseek', 'codex-local', 'anthropic', undefined]) assert.equal(translationPolicy(provider, targets).enabled, false);
});

test('request-time policy ignores every legacy toggle and never intercepts other model providers', () => {
  for (const enabled of [true, false]) for (const toggle of [true, false, undefined]) {
    const store = { config: { enabled, targetProviders: ['claude-local'], sessions: { session: toggle } } };
    const engine = new TranslationEngine({ store });
    const options = { provider: 'claude-local', sessionId: 'session' };
    assert.equal(engine.enabled(options), true);
    engine.nested.add(options); assert.equal(engine.enabled(options), false);
    for (const provider of ['qwen', 'deepseek', 'codex-local']) assert.equal(engine.enabled({ provider, sessionId: 'session' }), false);
  }
});
