import { cleanHtmlImport } from './html-import';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

export async function smokeHtmlImport(directory: string): Promise<void> {
  const input = '<!doctype html><html><head><style>@import "https://example.com/a.css"; body{color:red;background-image:url(https://example.com/bg)} .card{padding:12px}</style></head><body class="page"><div id="main" class="card" title="Details" data-kind="example" style="color:blue;background:url(https://example.com/a)"><script>window.pwned=1</script><a href="https://example.com" target="_blank" onclick="alert(1)">Safe</a><a href="javascript:alert(1)">Bad</a><img class="photo" alt="Image" width="24" src="https://example.com/a" onerror="alert(1)"><iframe src="https://example.com"></iframe><table><tr><td>Cell</td></tr></table></div></body></html>';
  const result = await cleanHtmlImport(input);
  if (!result.removed || /<script|<iframe|onclick|onerror|javascript:|@import|url\(/i.test(result.body)) throw Error('HTML safety policy left active content');
  for (const token of ['class="card"', 'id="main"', 'title="Details"', 'data-kind="example"', 'target="_blank"', 'href="https://example.com"', 'class="photo"', 'alt="Image"', 'width="24"', '<table>', 'color: red', 'padding: 12px']) {
    if (!result.body.includes(token)) throw Error('Safe HTML structure lost: ' + token);
  }
  const safe = await cleanHtmlImport('<p class="intro"><a href="/products" target="_blank">Link</a></p>');
  if (safe.removed || !safe.body.includes('class="intro"') || !safe.body.includes('href="/products"')) throw Error('Safe attributes changed');
  writeFileSync(join(directory, 'html-safety-report.json'), JSON.stringify({ dangerousContentRemoved: true, safeAttributesPreserved: true, cssRetainedWithoutLoads: true, removed: result.removed }, null, 2));
}
