const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { NoteLibrary } = require('../dist/runtime/core/library.js');
const { importNote, exportNote } = require('../dist/runtime/core/note-files.js');
const { BodyHistory } = require('../dist/runtime/shared/body-history.js');
const directory = () => { const root = path.resolve('output/format-tests'); fs.mkdirSync(root, { recursive: true }); return fs.mkdtempSync(path.join(root, 'case-')); };

test('three primary formats preserve exact source, revision extension and replay across reopen', () => {
  const root = directory(); let library = new NoteLibrary(root);
  const notes = [];
  try {
    for (const [format, extension, body] of [['markdown', 'md', '- [x] 中文\r\n\n| a | b |'], ['html', 'html', '<script>unsafe()</script><p>中文 &amp; 😀</p>'], ['text', 'txt', '<b>literal</b>\r\n  中文 😀  ']]) {
      const id = randomUUID(); const input = { primaryFormat: format, title: format, body };
      const result = library.create(id, input);
      assert.deepEqual(library.create(id, input), result);
      assert.throws(() => library.create(id, { ...input, body: 'different' }), { code: 'INVALID_INPUT' });
      assert.equal(fs.readFileSync(path.join(root, 'notes', result.note.id, 'revisions', result.note.revisionId, `content.${extension}`), 'utf8'), body);
      const session = library.begin(result.note.id, 'owner');
      notes.push(library.save({ noteId: result.note.id, token: session.token, generation: session.generation, expectedVersion: 1, operationId: randomUUID(), title: 'Renamed', body }, 'owner').note);
    }
    library.close(); library = new NoteLibrary(root);
    for (const note of notes) { assert.deepEqual(library.read(note.id), note); assert.equal(note.contentVersion, 1); }
    assert.deepEqual(new Set(library.list().map(note => note.primaryFormat)), new Set(['markdown', 'html', 'text']));
    assert.throws(() => library.create(randomUUID(), { primaryFormat: '../file', title: 'x', body: '' }), { code: 'INVALID_INPUT' });
  } finally { library.close(); }
});

test('import validates UTF-8, supported extension, size and NUL without changing source files', () => {
  const root = directory(); const file = path.join(root, '中文.HTML');
  const source = '\ufeff<p>中文 😀</p>\r\n'; fs.writeFileSync(file, source);
  assert.deepEqual(importNote(file), { title: '中文', primaryFormat: 'html', body: source.slice(1) });
  assert.equal(fs.readFileSync(file, 'utf8'), source);
  fs.writeFileSync(file, Buffer.from([0xff, 0xfe])); assert.throws(() => importNote(file), { code: 'INVALID_INPUT' });
  fs.writeFileSync(file, 'x\0y'); assert.throws(() => importNote(file), { code: 'INVALID_INPUT' });
  fs.writeFileSync(file, 'x'.repeat(2097153)); assert.throws(() => importNote(file), { code: 'INVALID_INPUT' });
  fs.writeFileSync(path.join(root, 'x.exe'), 'x'); assert.throws(() => importNote(path.join(root, 'x.exe')), { code: 'INVALID_INPUT' });
});

test('export preserves exact source, refuses overwrite and protects library paths including junctions', () => {
  const root = directory(); const protectedRoot = path.join(root, 'library'); fs.mkdirSync(protectedRoot);
  const input = { title: 'x', primaryFormat: 'text', body: '中文\r\n😀\n' };
  const file = path.join(root, 'copy.txt'); exportNote(file, input, [protectedRoot]);
  assert.equal(fs.readFileSync(file, 'utf8'), input.body);
  const htmlPath = path.join(root, 'copy.html'); const html = { ...input, primaryFormat: 'html', body: '<p>中文</p>' };
  exportNote(htmlPath, html, [protectedRoot]);
  assert.equal(fs.readFileSync(htmlPath, 'utf8'), '\ufeff' + html.body);
  assert.equal(importNote(htmlPath).body, html.body);
  const maxPath = path.join(root, 'max.html'); const maxBody = 'x'.repeat(2097152);
  exportNote(maxPath, { ...html, body: maxBody }, []); assert.equal(importNote(maxPath).body, maxBody);
  assert.throws(() => exportNote(file, { ...input, body: 'overwrite' }, [protectedRoot]));
  assert.equal(fs.readFileSync(file, 'utf8'), input.body);
  assert.throws(() => exportNote(path.join(protectedRoot, 'x.txt'), input, [protectedRoot]), { code: 'INVALID_INPUT' });
  assert.throws(() => exportNote(path.join(root, 'x.html'), input, []), { code: 'INVALID_INPUT' });
  const link = path.join(root, 'linked'); fs.symlinkSync(protectedRoot, link, 'junction');
  assert.throws(() => exportNote(path.join(link, 'x.txt'), input, [protectedRoot]), { code: 'INVALID_INPUT' });
  assert.deepEqual(fs.readdirSync(protectedRoot), []);
});

test('body history preserves source across modes, trims redo branches and bounds memory', () => {
  const history = new BodyHistory(); history.reset('原文'); history.push('源码'); history.push('富文本');
  assert.equal(history.undo(), '源码'); assert.equal(history.undo(), '原文'); assert.equal(history.redo(), '源码');
  history.push('新分支'); assert.equal(history.canRedo, false); assert.equal(history.undo(), '源码');
  history.reset(''); for (let i = 0; i < 150; i++) history.push(String(i));
  let count = 0; while (history.canUndo) { history.undo(); count++; } assert.equal(count, 99);
  history.reset('x'.repeat(2097152)); history.push('y'.repeat(2097152)); history.push('z'.repeat(2097152));
  assert.equal(history.undo()[0], 'y'); assert.equal(history.canUndo, false);
});
