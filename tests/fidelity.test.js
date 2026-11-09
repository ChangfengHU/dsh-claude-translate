import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TextTranslator } from '../src/text.js';
const config = { mode: 'route', provider: 'qwen', model: 'qwen-plus-latest' };
test('rejects an answered command instead of a full translation', async () => {
  const translator = new TextTranslator(async () => 'Monday has three tasks.');
  await assert.rejects(translator.translate('帮我整理下周一的工作安排。不要改动已有文件，也不要发送任何通知。', 'en', config), { code: 'TRANSLATION_FORMAT' });
});
test('rejects a missing prohibition sentence', async () => {
  const translator = new TextTranslator(async () => JSON.stringify({ translations: [{ id: '0', text: 'Three tasks.' }] }));
  await assert.rejects(translator.translate('帮我整理下周一的工作安排。不要改动已有文件，也不要发送任何通知。', 'en', config), { code: 'TRANSLATION_INCOMPLETE' });
});
test('rejects duplicate and unknown segment identities', async () => {
  const translator = new TextTranslator(async ({ text }) => JSON.stringify({ translations: JSON.parse(text).segments.map(() => ({ id: 'invented', text: 'Hello.' })) }));
  await assert.rejects(translator.translate('请整理下周的安排。不要改动日历。', 'en', config), { code: 'TRANSLATION_INCOMPLETE' });
});
