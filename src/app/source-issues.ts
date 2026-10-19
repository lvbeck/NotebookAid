import { parseDelta } from '../../shared/delta-document';
import { mathMarkdown as marked } from './math-markdown';
import DOMPurify from 'dompurify';
import type { NoteFormat } from '../../shared/library';
import { codeLanguages, safeImage } from './editor-formats';
import { safeInlineStyle } from '../../shared/inline-style';

export const richTags = ['p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'span', 'blockquote', 'pre', 'code', 'ol', 'ul', 'li', 'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td'];
export const richAttributes = ['href', 'target', 'rel', 'data-list', 'src', 'alt', 'title', 'width', 'height', 'align', 'style', 'data-language', 'data-cell-header', 'data-cell-align', 'data-row', 'data-note-math', 'data-math-kind'];
export type SourceIssueKind = 'issueTask' | 'issueNested' | 'issueImage' | 'issueTable' | 'issueRule' | 'issueCodeLanguage' | 'issueHeading' | 'issueEmbeddedHtml' | 'issueStrike' | 'issueLink' | 'issueReference' | 'issueElement' | 'issueAttribute' | 'issueDocument' | 'issueComment' | 'issueLinkAttribute' | 'issueRoundtrip';
export interface SourceIssue { kind: SourceIssueKind; detail: string; line?: number; element?: number; count: number; }

export function sourceIssues(body: string, format: NoteFormat): SourceIssue[] {
  if (format === 'delta') { try { parseDelta(body); return []; } catch (error) { return [{ kind: 'issueRoundtrip', detail: error instanceof Error ? error.message : 'Delta', count: 1 }]; } }
  const groups = new Map<string, SourceIssue>();
  const add = (kind: SourceIssueKind, detail = '', line?: number, element?: number) => {
    const key = kind + ':' + detail;
    const existing = groups.get(key);
    if (existing) existing.count++; else groups.set(key, { kind, detail, line, element, count: 1 });
  };
  if (format === 'text') return [];
  if (format === 'markdown') {
    const occurrences = new Map<string, number>();
    const tokens = marked.lexer(body);
    const excluded: Array<[number, number]> = [];
    marked.walkTokens(tokens, token => {
      const raw = token.raw || '';
      const start = raw ? body.indexOf(raw, occurrences.get(raw) ?? 0) : -1;
      if (start >= 0) occurrences.set(raw, start + raw.length);
      const line = start < 0 ? undefined : body.slice(0, start).split('\n').length;
      if (['code', 'noteMathBlock', 'noteMathInline'].includes(token.type) && start >= 0) excluded.push([start, start + raw.length]);
      if (token.type === 'list' || token.type === 'blockquote') {
        let nestedMath = false;
        marked.walkTokens([token], child => { if (child.type === 'noteMathBlock') nestedMath = true; });
        if (nestedMath) add('issueRoundtrip', token.type + ': math-block', line);
      }
      const kinds: Record<string, SourceIssueKind> = { html: 'issueEmbeddedHtml' };
      const supportedHtml = token.type === 'html' && sourceIssues(raw, 'html').length === 0;
      if (kinds[token.type] && !supportedHtml) add(kinds[token.type]!, '', line);
      if (token.type === 'code' && token.lang && !codeLanguages.includes(token.lang)) add('issueCodeLanguage', token.lang.slice(0, 80), line);
      if (token.type === 'image' && !safeImage(token.href)) add('issueImage', token.href.slice(0, 80), line);
      if (token.type === 'link' && !/^(https?:|mailto:)/i.test(token.href)) add('issueLink', '', line);
    });
    for (const match of body.matchAll(/^ {0,3}\[[^\]]+\]:/gm)) {
      if (!excluded.some(([start, end]) => match.index >= start && match.index < end)) add('issueReference', '', body.slice(0, match.index).split('\n').length);
    }
    const tree = new DOMParser().parseFromString(marked.parse(body, { async: false }), 'text/html');
    tree.querySelectorAll('li').forEach(item => {
      let depth = -1;
      for (let parent = item.parentElement; parent; parent = parent.parentElement) if (['OL', 'UL'].includes(parent.tagName)) depth++;
      if (depth > 8) add('issueNested', `indent=${depth} > 8`);
    });
  } else {
    const parsed = new DOMParser().parseFromString(body, 'text/html');
    const elements = Array.from(parsed.querySelectorAll('*'));
    if (/<!doctype|<\/?(?:html|head|body)\b/i.test(body)) add('issueDocument');
    if (/<!--/.test(body)) add('issueComment');
    for (const [index, element] of elements.entries()) {
      const tag = element.tagName.toLowerCase();
      if (tag === 'img' && !element.hasAttribute('src')) add('issueImage', '<img> missing src', undefined, index + 1);
      if (tag === 'li') {
        let depth = -1;
        for (let parent = element.parentElement; parent; parent = parent.parentElement) if (['OL', 'UL'].includes(parent.tagName)) depth++;
        if (depth > 8) add('issueNested', `indent=${depth} > 8`, undefined, index + 1);
      }
      if (!['html', 'head', 'body'].includes(tag) && !richTags.includes(tag)) add('issueElement', `<${tag}>`, undefined, index + 1);
      for (const attribute of Array.from(element.attributes)) {
        const taskState = tag === 'li' && attribute.name === 'data-list' && ['checked', 'unchecked', 'ordered', 'bullet'].includes(attribute.value);
        const image = tag === 'img' && ['src', 'alt', 'title', 'width', 'height'].includes(attribute.name) && (attribute.name !== 'src' || safeImage(attribute.value));
        const alignment = ['td', 'th'].includes(tag) && attribute.name === 'align' && ['left', 'center', 'right'].includes(attribute.value);
        const language = (tag === 'pre' && attribute.name === 'data-language' && codeLanguages.includes(attribute.value)) || (tag === 'code' && attribute.name === 'class' && codeLanguages.includes(attribute.value.replace(/^language-/, '')));
        const color=['span','strong','b','em','i','u','s','del','a'].includes(tag)&&attribute.name==='style'&&safeInlineStyle(attribute.value);
        if (!taskState && !image && !alignment && !language && !color && (tag !== 'a' || !['href', 'target', 'rel'].includes(attribute.name))) add('issueAttribute', `<${tag}> ${attribute.name}`, undefined, index + 1);
      }
      if (tag === 'a') {
        for (const [name, expected] of [['target', '_blank'], ['rel', 'noopener noreferrer']]) {
          if (element.hasAttribute(name!) && element.getAttribute(name!) !== expected) add('issueLinkAttribute', `<a> ${name}="${element.getAttribute(name!)!.slice(0, 80)}"`, undefined, index + 1);
        }
      }
    }
    parsed.querySelectorAll('table').forEach(table => {
      const rows = Array.from(table.querySelectorAll('tr'));
      if (table.querySelector('table,td ul,td ol,td pre,th ul,th ol,th pre') || rows.some(row => row.children.length !== rows[0]?.children.length)) add('issueTable', 'Complex / irregular table');
    });
    DOMPurify.sanitize(body, { ALLOWED_TAGS: richTags, ALLOWED_ATTR: richAttributes, ALLOW_DATA_ATTR: false, ALLOW_ARIA_ATTR: false });
    for (const removed of DOMPurify.removed) {
      if ('attribute' in removed && removed.attribute && removed.from instanceof Element && richAttributes.includes(removed.attribute.name)) add('issueAttribute', `<${removed.from.tagName.toLowerCase()}> ${removed.attribute.name}`);
    }
  }
  return Array.from(groups.values());
}
