import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TextTranslator, protect } from '../src/text.js';

const config = { mode: 'route', provider: 'qwen', model: 'qwen-flash' };
test('natural UI request preserves Chinese button text and attribute values byte-for-byte', async () => {
  const input = '帮我写一段 HTML 按钮代码，按钮文字必须是“保存草稿”，属性保持 data-action="save_draft"，只给代码，不生成文件。';
  const translator = new TextTranslator(async ({ text }) => {
    const data = JSON.parse(text);
    for (const row of data.segments) { assert.ok(!row.text.includes('保存草稿')); assert.ok(!row.text.includes('save_draft')); }
    return JSON.stringify({ translations: data.segments.map(s => ({ id: s.id, text: s.text.replace('帮我写一段 HTML 按钮代码，按钮文字必须是', 'Write HTML button code with the exact label ').replace('，属性保持 data-action=', ', preserving data-action=').replace('，只给代码，不生成文件。', '; return code only, without creating files.') })) });
  });
  const output = await translator.translate(input, 'en', config);
  assert.ok(output.includes('“保存草稿”')); assert.ok(output.includes('data-action="save_draft"'));
  const outside = protect(output, { quotedLiterals: true }).text;
  assert.ok(!/\p{Script=Han}/u.test(outside));
});
test('quoted filenames, titles and structured field names remain literal input data', () => {
  for (const value of ['“我的待办”', "'备忘录.html'", '"完成状态"', '「保存草稿」', '『已完成』', '《项目说明》']) {
    const p = protect('创建 ' + value, { quotedLiterals: true });
    assert.ok(!p.text.includes(value)); assert.equal(p.restore(p.text), '创建 ' + value);
  }
});
test('English instructions containing a Chinese UI label do not need a paid input translation', async () => {
  const translator = new TextTranslator(() => { throw Error('Unexpected provider call'); });
  const text = 'Create a button labelled “保存草稿”.';
  assert.equal(await translator.translate(text, 'en', config), text);
});
test('code-only replies avoid paid display translation and retain Chinese literals', async () => {
  const translator = new TextTranslator(() => { throw Error('Unexpected provider call'); });
  const text = '\x60\x60\x60html\n<button data-action="save_draft">保存草稿</button>\n\x60\x60\x60';
  assert.equal(await translator.translate(text, 'zh', config), text);
});
test('normal prose quotes in English answers are still translated for the display', async () => {
  let called = false;
  const translator = new TextTranslator(async ({ text }) => { called = true; const d = JSON.parse(text); return JSON.stringify({ translations: d.segments.map(s => ({ id: s.id, text: '“明天”是指下一天。' })) }); });
  await translator.translate('"Tomorrow" means the next day.', 'zh', config); assert.equal(called, true);
});

test('English apostrophes never turn surrounding Chinese instructions into protected data', () => {
  const text = "检查 user's 设置，然后修复中文说明，保留 one's 标识。";
  const shield = protect(text, { quotedLiterals: true });
  assert.ok(shield.text.includes('修复中文说明'));
  assert.equal(shield.restore(shield.text), text);
});

test('Chinese punctuation terminates an unquoted file path before the following instruction', async () => {
  const input = '打开 /home/claude/code/记录.txt，告诉我里面有几项任务。';
  const shield = protect(input, { quotedLiterals: true });
  assert.ok(shield.text.includes('告诉我里面有几项任务'));
  assert.ok(!shield.text.includes('/home/claude/code/记录.txt'));
  const translator = new TextTranslator(async ({ text }) => {
    const d = JSON.parse(text);
    return JSON.stringify({ translations: d.segments.map(s => ({ id: s.id, text: s.text.replace('打开 ', 'Open ').replace('，告诉我里面有几项任务。', ', and tell me how many tasks it contains.') })) });
  });
  assert.equal(await translator.translate(input, 'en', config), 'Open /home/claude/code/记录.txt, and tell me how many tasks it contains.');
});
test('Chinese punctuation terminates a URL before a subsequent instruction', () => {
  const input = '查看 https://example.com/docs，接着总结三个要点。';
  const p = protect(input, { quotedLiterals: true });
  assert.ok(p.text.includes('接着总结三个要点')); assert.equal(p.restore(p.text), input);
});
test('paths with Chinese punctuation remain exact when explicitly quoted as literal data', () => {
  const input = '创建“/tmp/记录，备份.txt”，内容保持不变。';
  const p = protect(input, { quotedLiterals: true });
  assert.ok(!p.text.includes('记录，备份')); assert.ok(p.text.includes('内容保持不变'));
  assert.equal(p.restore(p.text), input);
});
