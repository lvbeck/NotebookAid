import createDOMPurify from 'dompurify';
import { sanitizeImportedHtml } from '../../core/html-safety';

const purify = createDOMPurify(window);
export function isolatedHtmlDocument(source: string): string {
  const cleaned = sanitizeImportedHtml(source, purify, document);
  const parsed = new DOMParser().parseFromString(cleaned.body, 'text/html');
  parsed.querySelectorAll('img[src]').forEach(image => { if (!/^data:image\/(png|jpeg|gif|webp);base64,/i.test(image.getAttribute('src')!)) image.removeAttribute('src'); });
  const policy = parsed.createElement('meta');
  policy.httpEquiv = 'Content-Security-Policy';
  policy.content = "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
  parsed.head.prepend(policy);
  return '<!DOCTYPE html>' + parsed.documentElement.outerHTML;
}
