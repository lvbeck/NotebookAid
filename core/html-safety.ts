/// <reference lib="dom" />
import type { DOMPurify } from 'dompurify';

/** Pure policy: callers provide an inert DOM and a private DOMPurify instance. */
export function sanitizeImportedHtml(input: string, purify: DOMPurify, document: Document): { body: string; removed: number } {
  let removed = 0;
  const whole = /<!doctype|<\/?(?:html|head|body)\b/i.test(input);
  const root = purify.sanitize(input, {
    USE_PROFILES: { html: true }, RETURN_DOM: true, WHOLE_DOCUMENT: whole,
    ADD_TAGS: ['style'], ADD_ATTR: ['target'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'base', 'link', 'meta', 'form'],
    FORBID_ATTR: ['srcset', 'poster', 'background', 'action', 'formaction', 'ping', 'autofocus', 'download', 'contenteditable']
  }) as unknown as HTMLElement;
  removed += purify.removed.filter(item => !('element' in item && item.element?.nodeName === 'BODY')).length;
  const cleanDeclarations = (style: CSSStyleDeclaration): void => {
    for (const property of Array.from(style)) {
      const value = style.getPropertyValue(property);
      if (/url\s*\(|(?:image|image-set|src|paint|expression)\s*\(|\\|@/i.test(value) || /behavior|binding/i.test(property)) {
        style.removeProperty(property); removed++;
      }
    }
  };
  for (const element of [root, ...Array.from(root.querySelectorAll('*'))]) {
    if (element.hasAttribute('src')) {
      const source = element.getAttribute('src')!;
      let safe = /^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(source);
      try { safe ||= ['http:', 'https:'].includes(new URL(source, 'https://notebookaid.invalid/').protocol); } catch { /* Reject malformed sources. */ }
      if (element.tagName !== 'IMG' || !safe) { element.removeAttribute('src'); removed++; }
    }
    if (element.hasAttribute('style')) {
      const scratch = document.createElement('span');
      const original = element.getAttribute('style')!;
      scratch.style.cssText = original; cleanDeclarations(scratch.style);
      if (!scratch.style.cssText && original.trim()) removed++;
      element.setAttribute('style', scratch.style.cssText);
    }
    if (element.hasAttribute('href')) {
      const value = element.getAttribute('href')!;
      let allowed = false;
      try { allowed = ['http:', 'https:', 'mailto:', 'tel:', 'sms:'].includes(new URL(value, 'https://notebookaid.invalid/').protocol); } catch { /* Reject invalid addresses. */ }
      if (!allowed || !['A', 'AREA'].includes(element.tagName)) { element.removeAttribute('href'); removed++; }
    }
    if (element.hasAttribute('target') && !['_blank', '_self', '_parent', '_top'].includes(element.getAttribute('target')!)) { element.removeAttribute('target'); removed++; }
    if (element.tagName === 'STYLE') {
      // Detached sheets parse CSS without applying it or fetching resources.
      // Constructable sheets do not load @import rules.
      const sheet = new CSSStyleSheet();
      if (/@(?:import|\\)/i.test(element.textContent ?? '')) removed++;
      try { sheet.replaceSync(element.textContent ?? ''); } catch { element.remove(); removed++; continue; }
      if (!sheet.cssRules.length && element.textContent?.trim()) removed++;
      const rules = (list: CSSRuleList): string => Array.from(list).map(rule => {
        if ('style' in rule && rule.style instanceof CSSStyleDeclaration) { cleanDeclarations(rule.style); return rule.cssText; }
        if ('cssRules' in rule) {
          const header = rule.cssText.slice(0, rule.cssText.indexOf('{'));
          return `${header}{${rules(rule.cssRules as CSSRuleList)}}`;
        }
        if (/url\s*\(|(?:image|image-set|src|paint|expression)\s*\(|\\|@import/i.test(rule.cssText)) { removed++; return ''; }
        return rule.cssText;
      }).join('\n');
      element.textContent = rules(sheet.cssRules);
    }
  }
  return { body: whole ? '<!DOCTYPE html>\n' + root.outerHTML : root.innerHTML, removed };
}
