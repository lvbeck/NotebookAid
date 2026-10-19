import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

let cached: string | undefined;
/** Embed only bundled WOFF2 fonts; print documents never resolve file or network URLs. */
export function mathPrintStyles(): string {
  if (cached) return cached;
  const root = dirname(require.resolve('katex'));
  cached = readFileSync(join(root, 'katex.min.css'), 'utf8').replace(/src:\s*url\(([^)]+\.woff2)\)[^;]*;/g, (_match, file: string) => {
    if (!/^fonts\/KaTeX_[\w-]+\.woff2$/.test(file)) throw Error('INVALID_MATH_FONT');
    return 'src:url(data:font/woff2;base64,' + readFileSync(join(root, file)).toString('base64') + ') format("woff2");';
  });
  if (/url\((?!data:font\/woff2;base64,)/.test(cached)) throw Error('EXTERNAL_MATH_FONT');
  return cached;
}
