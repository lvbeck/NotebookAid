export const formulaLimit = 8192;
export interface MathSource { raw: string; source: string; latex: string; display: boolean; }

function escaped(source: string, index: number): boolean {
  let count = 0; while (index > 0 && source[--index] === '\\') count++;
  return count % 2 === 1;
}

/** Recognize delimiters only; Markdown decides which text is code or escaped. */
export function mathAtStart(input: string, block: boolean): MathSource | undefined {
  const indent = block ? input.match(/^ {0,3}/)![0].length : 0;
  const text = input.slice(indent);
  const open = block ? (text.startsWith('$$') ? '$$' : text.startsWith('\\[') ? '\\[' : '')
    : (text.startsWith('$') && !text.startsWith('$$') ? '$' : text.startsWith('\\(') ? '\\(' : '');
  if (!open || (!block && /\s/.test(text[open.length] ?? ' '))) return;
  const close = open === '\\[' ? '\\]' : open === '\\(' ? '\\)' : open;
  for (let end = text.indexOf(close, open.length); end >= 0; end = text.indexOf(close, end + close.length)) {
    if (escaped(text, end)) continue;
    const latex = text.slice(open.length, end);
    if (!block && (/[\r\n]/.test(latex) || /\s$/.test(latex) || (open === '$' && /[\d$]/.test(text[end + 1] ?? '')))) return;
    const suffix = text.slice(end + close.length);
    const gap = block ? suffix.match(/^[ \t]*(?:\r?\n|$)/)?.[0] : '';
    if (block && gap === undefined) continue;
    const source = input.slice(0, indent + end + close.length);
    return { source, raw: source + (gap ?? ''), latex, display: block };
  }
  return;
}

export function formulaSource(source: string): MathSource | undefined {
  const value = mathAtStart(source, true) ?? mathAtStart(source, false);
  return value?.source === source ? value : undefined;
}

export function escapeMathAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r/g, '&#13;').replace(/\n/g, '&#10;');
}

export function mathMarkup(source: string, display: boolean): string {
  const safe = escapeMathAttribute(source);
  return `<span data-note-math="${safe}" data-math-kind="${display ? 'block' : 'inline'}">${safe}</span>`;
}
