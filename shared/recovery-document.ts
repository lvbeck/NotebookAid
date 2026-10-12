const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

export function recoveryDocument(title: string, hint: string, key: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>@page{size:A4;margin:20mm}*{box-sizing:border-box}html{background:white;color-scheme:light}body{margin:20mm;font-family:Arial,"Microsoft YaHei",sans-serif;color:#262335}h1{font-size:24px}p{line-height:1.7}pre{font-size:18px;white-space:pre-wrap;overflow-wrap:anywhere;border:1px solid #ddd;padding:20px}@media print{body{margin:0}}</style></head><body><h1>${escapeHtml(title)}</h1><p>${escapeHtml(hint)}</p><pre>${escapeHtml(key)}</pre></body></html>`;
}
