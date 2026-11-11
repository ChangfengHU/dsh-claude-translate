import { parse, Allow } from 'partial-json';
import { fromMarkdown } from 'mdast-util-from-markdown';

export function translationPieces(text, direction) {
  if (direction === 'en') return [...new Intl.Segmenter('zh', { granularity: 'sentence' }).segment(text)].map((item, index) => ({ id: String(index), text: item.segment, translate: Boolean(item.segment.trim()) && /\p{Script=Han}/u.test(item.segment) }));
  const spans = [];
  function visit(node) {
    if (node.type === 'text' && node.position) spans.push([node.position.start.offset, node.position.end.offset]);
    else for (const child of node.children ?? []) visit(child);
  }
  visit(fromMarkdown(text));
  // Translate prose leaves, not Markdown punctuation or list/indentation syntax.
  const pieces = [];
  let offset = 0;
  const add = (start, end, translate) => { if (end > start) pieces.push({ id: String(pieces.length), text: text.slice(start, end), translate }); };
  for (const [start, end] of spans) {
    add(offset, start, false);
    add(start, end, Boolean(text.slice(start, end).trim()));
    offset = end;
  }
  add(offset, text.length, false);
  return pieces;
}

// Partial records are display-only. The complete response still passes the strict contract.
export function translationPreview(raw, pieces, cached, shield, direction) {
  try {
    const value = parse(raw.replace(/^```(?:json)?\s*\n/u, ''), Allow.OBJ | Allow.ARR | Allow.STR);
    if (!Array.isArray(value.translations)) return '';
    const rows = new Map(cached);
    for (const row of value.translations) {
      if (!pieces.some(p => p.id === row.id && p.translate) || rows.has(row.id) || typeof row.text !== 'string') return '';
      if (direction === 'en' && /\p{Script=Han}/u.test(row.text)) return '';
      rows.set(row.id, row.text);
    }
    let prefix = '';
    for (const piece of pieces) {
      if (!piece.translate) { prefix += piece.text; continue; }
      if (!rows.has(piece.id)) break;
      prefix += (piece.text.match(/^\s*/u)?.[0] ?? '') + rows.get(piece.id) + (piece.text.match(/\s*$/u)?.[0] ?? '');
    }
    return shield.preview(prefix);
  } catch { return ''; }
}

export function stablePrefix(text) {
  let end = 0;
  for (const item of new Intl.Segmenter('en', { granularity: 'sentence' }).segment(text)) {
    if (/[.!?][\s]+$/u.test(item.segment) || /\n\s*\n$/u.test(item.segment)) end = item.index + item.segment.length;
  }
  let prefix = text.slice(0, end);
  // An unfinished literal waits for a later boundary rather than being sent as prose.
  const fences = [...prefix.matchAll(/^\s{0,3}(`{3,}|~{3,})/gm)];
  let open;
  for (const fence of fences) {
    if (!open) open = fence;
    else if (fence[1][0] === open[1][0] && fence[1].length >= open[1].length) open = undefined;
  }
  if (open) prefix = prefix.slice(0, open.index);
  const withoutFences = prefix.replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, '');
  if ((withoutFences.match(/`/g)?.length ?? 0) % 2) prefix = prefix.slice(0, prefix.lastIndexOf('`'));
  return prefix;
}
