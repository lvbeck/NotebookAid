const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), { randomUUID } = require('node:crypto');
const { exportPdf } = require('../dist/runtime/core/note-files');
const { NoteLibrary } = require('../dist/runtime/core/library');
const { printDocument } = require('../dist/runtime/shared/print-document');
const { spawnSync } = require('node:child_process');

test('native print helper rejects malformed input without opening a print dialog', { skip: process.platform !== 'win32' }, () => {
  for (const input of ['not a PDF', '%PDF-invalid document']) {
    const result = spawnSync(path.resolve('dist/NotebookAid.Print.exe'), ['0'], { input, windowsHide: true, timeout: 10000 });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1);
    assert.ok(!result.stderr.toString().includes(input));
  }
});

test('PDF exports reject overwrite, invalid extensions, non-PDF data and protected paths', () => {
  fs.mkdirSync('output', { recursive: true });
  const root = fs.mkdtempSync(path.resolve('output/print-export-'));
  const pdf = Buffer.from('%PDF-1.4\nfixture\n%%EOF');
  try {
    const target = path.join(root, 'note.pdf'), protectedRoot = path.join(root, 'notebook');
    fs.mkdirSync(protectedRoot);
    exportPdf(target, pdf, [protectedRoot]);
    assert.deepEqual(fs.readFileSync(target), pdf);
    assert.throws(() => exportPdf(target, pdf, [protectedRoot]));
    assert.deepEqual(fs.readFileSync(target), pdf);
    for (const name of ['note.html', 'CON.pdf']) assert.throws(() => exportPdf(path.join(root, name), pdf, []));
    assert.throws(() => exportPdf(path.join(protectedRoot, 'note.pdf'), pdf, [protectedRoot]));
    assert.throws(() => exportPdf(path.join(root, 'invalid.pdf'), Buffer.from('not PDF'), []));
    assert.equal(fs.existsSync(path.join(root, 'invalid.pdf')), false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('print documents escape titles and enforce an offline A4 rendering policy', () => {
  const html = printDocument('<script>alert("title")</script>', '<p>Fixture</p>');
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes("default-src 'none'"));
  assert.ok(html.includes('size:A4'));
  assert.ok(html.includes('<p>Fixture</p>'));
});

test('default note creation uses TXT while explicit formats remain available', () => {
  const root = fs.mkdtempSync(path.resolve('output/print-default-'));
  let library;
  try {
    library = new NoteLibrary(root, undefined, 'create');
    assert.equal(library.create(randomUUID()).note.primaryFormat, 'text');
    assert.equal(library.create(randomUUID(), { primaryFormat: 'markdown', title: 'Markdown', body: '**Fixture**' }).note.primaryFormat, 'markdown');
  } finally { library?.close(); fs.rmSync(root, { recursive: true, force: true }); }
});
