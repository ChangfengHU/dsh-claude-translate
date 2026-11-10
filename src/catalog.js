import { failure } from './text.js';

export function claudeRoutes(providers) {
  return providers.filter(p => p.id === 'claude-local' || /claude[ _-]*code/i.test(p.name ?? '')).map(p => p.id);
}

export function selectTranslationModel(models, current = '') {
  return models.some(m => m.id === current) ? current : models.find(m => m.id === 'qwen-flash')?.id ?? models.find(m => m.isDefault || m.recommended)?.id ?? models[0]?.id ?? '';
}

export async function translationModels(llm, provider) {
  const providers = llm.listProviders();
  if (claudeRoutes(providers).includes(provider) || /claude/i.test(provider ?? '')) throw failure('TRANSLATION_RECURSION', 'Claude Code cannot translate its own input.');
  if (!providers.some(p => p.id === provider)) throw failure('INVALID_CONFIG', 'Select a registered translation source.');
  const models = await llm.listModels(provider);
  if (!models.length) throw failure('TRANSLATION_CATALOG_EMPTY', 'This source returned no models. Check its installation and sign-in status.');
  return models;
}

export async function validateSelection(llm, config) {
  if (config.mode !== 'route') return;
  const models = await translationModels(llm, config.provider);
  if (!models.some(m => m.id === config.model)) throw failure('TRANSLATION_MODEL_MISMATCH', 'The selected model does not belong to this source. Refresh its model list and save a valid selection.');
}
