import { sourceIssues, richTags, richAttributes } from './source-issues';
import { marked } from 'marked';
import TurndownService from 'turndown';
import DOMPurify from 'dompurify';
import type { NoteFormat } from '../../shared/library';
import { codeLanguages } from './editor-formats';
import { safeInlineStyle } from '../../shared/inline-style';

/** Wrap Quill's escaped code text before HTML parsers consume leading newlines. */
export function semanticHtml(html: string): string {
  return html.replace(/(<pre\b[^>]*>)\n([\s\S]*?)\n<\/pre>/g, '$1<code>$2</code></pre>');
}

export function cleanHtml(html: string): string {
  const cleaned = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: richTags,
    ALLOWED_ATTR: richAttributes, ALLOW_DATA_ATTR: false, ALLOW_ARIA_ATTR: false
  });
  const tree = new DOMParser().parseFromString(cleaned, 'text/html');
  tree.querySelectorAll('[style]').forEach(node=>{const style=node.getAttribute('style')!;if(!['SPAN','STRONG','B','EM','I','U','S','DEL','A'].includes(node.tagName)||!safeInlineStyle(style)){node.removeAttribute('style');return;}if(node.tagName!=='SPAN'){const span=tree.createElement('span');span.setAttribute('style',style);span.innerHTML=node.innerHTML;node.replaceChildren(span);node.removeAttribute('style');}});
  tree.querySelectorAll('td,th').forEach(cell => {
    cell.removeAttribute('data-row');
    if (cell.getAttribute('data-cell-align')) cell.setAttribute('align', cell.getAttribute('data-cell-align')!);
    cell.removeAttribute('data-cell-align');
    if (cell.getAttribute('data-cell-header') === 'true' && cell.tagName === 'TD') {
      const header = tree.createElement('th');
      for (const attr of Array.from(cell.attributes)) header.setAttribute(attr.name, attr.value);
      header.innerHTML = cell.innerHTML; cell.replaceWith(header); header.removeAttribute('data-cell-header');
    } else cell.removeAttribute('data-cell-header');
  });
  tree.querySelectorAll('table').forEach(table => {
    const rows = Array.from(table.querySelectorAll(':scope > tr, :scope > tbody > tr, :scope > thead > tr'));
    const headers: Element[] = [];
    for (const row of rows) {
      if (!row.children.length || !Array.from(row.children).every(cell => cell.tagName === 'TH')) break;
      headers.push(row);
    }
    if (headers.length) {
      const head = tree.createElement('thead');
      headers.forEach(row => head.appendChild(row));
      table.insertBefore(head, table.querySelector(':scope > tbody, :scope > thead, :scope > tr'));
    }
    table.querySelectorAll(':scope > tbody, :scope > thead').forEach(section => { if (!section.children.length) section.remove(); });
  });
  return tree.body.innerHTML;
}
export function markdownFromHtml(html: string): string {
  const converter = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
  converter.addRule('inlinePresentation',{filter:node=>{
    if (!(['U','S','DEL'].includes(node.nodeName)||node.nodeName==='SPAN'&&node.hasAttribute('style'))) return false;
    // Raw HTML already contains its edge whitespace. Suppress Turndown's extra edges.
    const whitespace = (node as HTMLElement & { flankingWhitespace?: { leading: string; trailing: string } }).flankingWhitespace;
    if (whitespace) { whitespace.leading = ''; whitespace.trailing = ''; }
    return true;
  },replacement:(_content,node)=>node.outerHTML});
  converter.addRule('sizedImage', { filter: node => node.nodeName === 'IMG' && (node.hasAttribute('width') || node.hasAttribute('height')), replacement: (_content, node) => '\n\n' + node.outerHTML + '\n\n' });
  converter.addRule('taskItem', { filter: node => node.nodeName === 'LI' && ['checked', 'unchecked'].includes(node.getAttribute('data-list') ?? ''), replacement: (content, node) => {
    const marker = node.getAttribute('data-list') === 'checked' ? '[x]' : '[ ]';
    return `- ${marker} ` + content.replace(/^\n+/, '').replace(/\n+$/, '\n').replace(/\n/g, '\n  ') + (node.nextSibling ? '\n' : '');
  } });
  converter.addRule('quillCodeBlock', { filter: 'pre', replacement: (_content, node) => {
    const text = node.querySelector('code')?.textContent ?? (node.textContent ?? '').replace(/^\n|\n$/g, '');
    const fence = '`'.repeat(Math.max(3, ...Array.from(text.matchAll(/`+/g), match => match[0].length + 1)));
    const language = node.getAttribute('data-language') ?? '';
    return `\n\n${fence}${language === 'plain' ? '' : language}\n${text}\n${fence}\n\n`;
  } });
  converter.addRule('table', { filter: 'table', replacement: (_content, node) => {
    const rows = Array.from(node.querySelectorAll('tr'));
    if (!rows.length) return '';
    const cells = (row: Element) => Array.from(row.children);
    const line = (row: Element) => '| ' + cells(row).map(cell => converter.turndown(cell.innerHTML).replace(/\|/g, '\\|').replace(/\n/g, '<br>')).join(' | ') + ' |';
    const separator = '| ' + cells(rows[0]!).map(cell => ({ left: ':---', center: ':---:', right: '---:' }[cell.getAttribute('align') ?? ''] ?? '---')).join(' | ') + ' |';
    return '\n\n' + [line(rows[0]!), separator, ...rows.slice(1).map(line)].join('\n') + '\n\n';
  } });
  converter.addRule('sizedImageBlock', {
    filter: node => ['P','H1','H2','H3','OL','UL','BLOCKQUOTE','TABLE'].includes(node.nodeName) && !!node.querySelector('img[width],img[height]'),
    replacement: (_content, node) => '\n\n' + node.outerHTML + '\n\n'
  });
  return converter.turndown(cleanHtml(html));
}
export function previewHtml(body: string, format: NoteFormat): string {
  if (format === 'text') return `<p>${body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>`;
  const renderer = new marked.Renderer();
  renderer.code = ({ text, lang }) => {
    const language = lang && codeLanguages.includes(lang) ? lang : 'plain';
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<pre data-language="${language}"><code>${escaped}\n</code></pre>`;
  };
  const parsed = new DOMParser().parseFromString(format === 'html' ? body : marked.parse(body, { async: false, renderer }), 'text/html');
  parsed.querySelectorAll('pre').forEach(pre => {
    const code = pre.querySelector('code');
    const language = pre.getAttribute('data-language') ?? code?.className.match(/^language-([\w+-]+)$/)?.[1] ?? 'plain';
    pre.setAttribute('data-language', language);
    if (format === 'markdown' && code) code.textContent = (code.textContent ?? '').replace(/\n$/, '');
  });
  parsed.querySelectorAll('li').forEach(item => {
    const checkbox = item.querySelector(':scope > input[type="checkbox"], :scope > p > input[type="checkbox"]');
    if (checkbox) {
      item.setAttribute('data-list', checkbox.hasAttribute('checked') ? 'checked' : 'unchecked');
      checkbox.remove();
      const first = item.firstChild;
      if (first?.nodeType === Node.TEXT_NODE) first.textContent = first.textContent?.replace(/^ /, '') ?? '';
    }
  });
  const result = new DOMParser().parseFromString(cleanHtml(parsed.body.innerHTML), 'text/html');
  result.querySelectorAll('th,td').forEach(cell => {
    if (cell.tagName === 'TH') {
      const replacement = result.createElement('td');
      for (const attr of Array.from(cell.attributes)) replacement.setAttribute(attr.name, attr.value);
      replacement.innerHTML = cell.innerHTML; replacement.setAttribute('data-cell-header', 'true');
      cell.replaceWith(replacement); cell = replacement;
    }
    if (cell.hasAttribute('align')) cell.setAttribute('data-cell-align', cell.getAttribute('align')!);
  });
  result.querySelectorAll('table').forEach(table => {
    const rows = Array.from(table.querySelectorAll(':scope > tr, :scope > thead > tr, :scope > tbody > tr'));
    const section = result.createElement('tbody'); rows.forEach(row => section.appendChild(row)); table.replaceChildren(section);
    table.querySelectorAll('tr,tbody').forEach(node => Array.from(node.childNodes).forEach(child => { if (child.nodeType === Node.TEXT_NODE && !child.textContent?.trim()) child.remove(); }));
  });
  result.querySelectorAll('pre + pre').forEach(pre => { const gap = result.createElement('p'); gap.appendChild(result.createElement('br')); pre.before(gap); });
  return result.body.innerHTML;
}
export function unsupportedSource(body: string, format: NoteFormat): boolean { return sourceIssues(body, format).length > 0; }
export function convertBody(body: string, from: NoteFormat, to: NoteFormat): string {
  if (from === to) return body;
  if (from === 'text' && to === 'markdown') return markdownFromHtml(previewHtml(body, from));
  const html = previewHtml(body, from);
  if (to === 'html') return cleanHtml(html);
  if (to === 'markdown') return markdownFromHtml(html);
  const document = new DOMParser().parseFromString(html, 'text/html');
  document.querySelectorAll('br').forEach(node => node.replaceWith('\n'));
  document.querySelectorAll('p,h1,h2,h3,li,blockquote,pre').forEach(node => node.append('\n'));
  return document.body.textContent?.replace(/\n{3,}/g, '\n\n').trimEnd() ?? '';
}
