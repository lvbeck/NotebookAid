import { parseDelta } from './delta-document';

const limit = 2 * 1024 * 1024;
const structural = new Set('html head body div section article main header footer aside nav ul ol li table thead tbody tfoot tr td th colgroup p h1 h2 h3 h4 h5 h6 blockquote pre hr'.split(' '));
const containers = new Set('html head body div section article main header footer aside nav ul ol table thead tbody tfoot tr colgroup'.split(' '));
const voidTags = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
interface Token { raw: string; name?: string; close?: boolean; void?: boolean; opaque?: boolean; }

/** Change only tag syntax and safe block gaps; never collapse text or attribute values. */
export function formatSource(source: string, format: 'html' | 'delta', pretty: boolean): string {
  if (new TextEncoder().encode(source).length > limit) throw Error('Source exceeds 2 MiB');
  let result: string;
  if (format === 'delta') result = JSON.stringify(parseDelta(source), null, pretty ? 2 : undefined);
  else {
    // Legacy preformatted elements have parsing/whitespace rules we do not rewrite.
    if (/<(?:plaintext|listing)\b/i.test(source)) return source;
    const tokens: Token[] = [];
    const tags = /<!--[\s\S]*?-->|<!DOCTYPE\s[^>]*>|<\/?[a-zA-Z][\w:-]*(?:\s+(?:[^\s"'<>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?))*\s*\/?>/gi;
    let offset = 0;
    for (let match = tags.exec(source); match; match = tags.exec(source)) {
      if (match.index > offset) tokens.push({ raw: source.slice(offset, match.index) });
      const raw = match[0], name = raw.match(/^<\/?([\w:-]+)/)?.[1]?.toLowerCase();
      const close = raw.startsWith('</');
      if (name && !close && ['pre', 'code', 'script', 'style', 'textarea', 'title', 'svg', 'math', 'xmp', 'iframe', 'noscript'].includes(name)) {
        const end = new RegExp('</' + name + '\\s*>', 'ig'); end.lastIndex = tags.lastIndex;
        const closing = end.exec(source);
        if (!closing) throw Error('Unclosed protected HTML element');
        tags.lastIndex = end.lastIndex;
        tokens.push({ raw: source.slice(match.index, end.lastIndex), name, opaque: true });
      } else tokens.push({ raw, name, close, void: !!name && (voidTags.has(name) || /\/>$/.test(raw)) });
      offset = tags.lastIndex;
    }
    if (offset < source.length) tokens.push({ raw: source.slice(offset) });
    // CSS and custom elements can change whitespace semantics even on block elements.
    const blockGaps = !/<style\b|<link\b|\sstyle\s*=|<[\w]+[-:]|<!\[|<\?/i.test(source);
    const stack: string[] = [];
    const chunks: string[] = [];
    const safeGap = (previous?: Token, next?: Token) => !!blockGaps && !!previous?.name && !!next?.name &&
      structural.has(previous.name) && structural.has(next.name) &&
      (previous.close || previous.opaque || previous.void || containers.has(previous.name)) &&
      (!next.close || containers.has(next.name));
    tokens.forEach((token, index) => {
      if (token.close && stack.at(-1) === token.name) stack.pop();
      const indent = '  '.repeat(Math.min(stack.length, 32));
      const previous = tokens[index - 1];
      if (!token.name && /^\s+$/.test(token.raw) && safeGap(previous, tokens[index + 1])) {
        // The following closing tag determines indentation of an existing block gap.
        const depth = stack.length - (tokens[index + 1]?.close ? 1 : 0);
        chunks.push(pretty ? '\n' + '  '.repeat(Math.max(0, Math.min(depth, 32))) : '');
        return;
      }
      if (safeGap(previous, token)) chunks.push(pretty ? '\n' + indent : '');
      if (token.name && !token.opaque) {
        // Quoted values are copied verbatim, including their internal whitespace.
        const parts = token.raw.match(/"[^"]*"|'[^']*'|[^"']+/g)!;
        const compact = parts.map(part => /^["']/.test(part) ? part : part.replace(/\s+/g, ' ')).join('').replace(/\s+(\/?>)$/, (_gap, end: string) => end === '/>' ? ' />' : '>');
        chunks.push(compact);
      } else chunks.push(token.raw);
      if (token.name && !token.close && !token.void && !token.opaque) stack.push(token.name);
    });
    result = chunks.join('');
  }
  if (new TextEncoder().encode(result).length > limit) throw Error('Formatted source exceeds 2 MiB');
  return result;
}
