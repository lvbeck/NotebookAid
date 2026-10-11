/// <reference lib="dom" />
import type { DOMPurify } from 'dompurify';

/** Parse only in the isolated, network-denied renderer supplied by the caller. */
export function sanitizeSvg(input: string, purify: DOMPurify, document: Document): { body: string; removed: number } {
  if (input.length > 1024 * 1024 || /<!DOCTYPE|<!ENTITY/i.test(input)) throw new Error('Invalid SVG');
  const parsed = new DOMParser().parseFromString(input, 'image/svg+xml');
  if (parsed.querySelector('parsererror') || parsed.documentElement.localName !== 'svg' || parsed.documentElement.namespaceURI !== 'http://www.w3.org/2000/svg' || parsed.querySelectorAll('*').length > 5000) throw new Error('Invalid SVG');
  const body = purify.sanitize(parsed.documentElement, {
    ALLOWED_TAGS: ['svg','g','defs','path','rect','circle','ellipse','line','polyline','polygon','text','tspan','title','desc','lineargradient','radialgradient','stop','clippath','mask','use'],
    ALLOWED_ATTR: ['xmlns','id','viewBox','width','height','x','y','x1','y1','x2','y2','cx','cy','r','rx','ry','fx','fy','d','points','transform','fill','fill-opacity','fill-rule','stroke','stroke-width','stroke-opacity','stroke-linecap','stroke-linejoin','stroke-dasharray','stroke-dashoffset','opacity','offset','stop-color','stop-opacity','gradientUnits','gradientTransform','spreadMethod','clip-path','clip-rule','clipPathUnits','mask','maskUnits','maskContentUnits','preserveAspectRatio','font-family','font-size','font-weight','text-anchor','dominant-baseline','dx','dy','href','xlink:href'],
    ALLOW_DATA_ATTR: false, ALLOW_ARIA_ATTR: false, KEEP_CONTENT: false
  });
  let removed = purify.removed.filter(item => !('element' in item) || item.element?.nodeName.toLowerCase() !== 'body').length;
  const result = new DOMParser().parseFromString(body, 'image/svg+xml');
  const root = result.documentElement;
  if (root.localName !== 'svg' || result.querySelector('parsererror')) throw new Error('Invalid SVG');
  // Only fragment references are allowed; CSS escapes and all style sheets are excluded.
  for (const node of Array.from(root.querySelectorAll('*')).concat(root)) {
    for (const attribute of Array.from(node.attributes)) {
      const name = attribute.name.toLowerCase(), value = attribute.value.trim();
      const local = /^#[A-Za-z_][\w.-]*$/.test(value);
      const paint = /^(?:none|currentColor|transparent|#[\da-f]{3,8}|[a-z]+|rgba?\([\d\s.,%]+\)|url\(#[A-Za-z_][\w.-]*\))$/i.test(value);
      if ((name.endsWith('href') && !local) || (['fill','stroke','clip-path','mask'].includes(name) && !paint) || (name !== 'xmlns' && /[\\@]|(?:https?|file|data|javascript):|\/\//i.test(value))) { node.removeAttributeNode(attribute); removed++; }
    }
  }
  // Keep local shape reuse, but reject nested/recursive or excessive expansion.
  const ids = new Map(Array.from(root.querySelectorAll('[id]')).map(node => [node.id, node]));
  const uses = Array.from(root.querySelectorAll('use'));
  for (const [index, use] of uses.entries()) {
    const href = use.getAttribute('href') ?? use.getAttributeNS('http://www.w3.org/1999/xlink', 'href') ?? '';
    const target = ids.get(href.slice(1));
    if (index >= 100 || !href.startsWith('#') || !target || target === use || target.contains(use) || target.querySelector('use') || ['svg','defs'].includes(target.localName)) { use.remove(); removed++; }
  }
  if (!root.hasAttribute('width') && !root.hasAttribute('height')) {
    const box = (root.getAttribute('viewBox') ?? '').trim().split(/[\s,]+/).map(Number);
    root.setAttribute('width', String(box.length === 4 && box[2]! > 0 ? Math.min(box[2]!,8192) : 300));
    root.setAttribute('height', String(box.length === 4 && box[3]! > 0 ? Math.min(box[3]!,8192) : 150));
  }
  for (const name of ['width','height']) {
    const value = root.getAttribute(name);
    if (value && !/^\d+(?:\.\d+)?(?:px)?$/.test(value)) { root.removeAttribute(name); removed++; }
    else if (value) root.setAttribute(name, String(Math.max(1, Math.min(8192, parseFloat(value)))));
  }
  return { body: new XMLSerializer().serializeToString(root), removed };
}
