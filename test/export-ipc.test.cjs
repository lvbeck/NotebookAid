const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), vm = require('node:vm');
const { createRequire } = require('node:module');
const { randomUUID } = require('node:crypto');
const { LibraryError } = require('../dist/runtime/core/library');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'notebookaid-export-ipc-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const data = path.join(root, 'data'); fs.mkdirSync(data);
  const note = { id: randomUUID(), title: 'Fixture', body: 'Private fixture body', primaryFormat: 'text', encrypted: true, attachments: [] };
  const handlers = new Map(), calls = []; let accepted = false, locked = false, destination;
  const library = { read(id) { if (locked) throw new LibraryError('NOTEBOOK_LOCKED'); if (id !== note.id) throw new LibraryError('NOT_FOUND_OR_UNAVAILABLE'); return note; } };
  class Registry { get() { return library; } state() { return { entries: [] }; } close() {} }
  const filename = path.resolve('dist/runtime/desktop/library-ipc.js'), actualRequire = createRequire(filename);
  const exports = {};
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    exports, Buffer, process, console,
    setInterval: () => ({ unref() {} }), clearInterval() {}, setTimeout, clearTimeout,
    require(id) {
      if (id === 'electron') return {
        app: { isPackaged: false, getPath: () => root, getAppPath: () => process.cwd() },
        ipcMain: { handle: (name, handler) => handlers.set(name, handler), on() {} },
        dialog: { async showSaveDialog() { calls.push('destination'); return { canceled: false, filePath: destination }; } }
      };
      if (id === '../core/registry') return { LibraryRegistry: Registry };
      if (id === './app-dialog') return { registerDialogs: () => ({ async ask() { calls.push('warning'); return accepted; }, cancel() {} }) };
      if (id === './note-print') return { async renderNotePrint() { calls.push('print'); return true; } };
      return actualRequire(id);
    }
  }, { filename });
  const api = exports.registerLibrary(data, () => ({}), () => {}); t.after(() => api.close());
  return {
    note, calls,
    set accepted(value) { accepted = value; }, set locked(value) { locked = value; },
    async run(format, identity = note.id, overrides = {}) {
      calls.length = 0; destination = path.join(root, randomUUID() + '.' + format);
      const primaryFormat = { txt: 'text', md: 'markdown', html: 'html' }[format];
      const result = await handlers.get('library:exportFile')({ sender: { id: 1 } }, { title: 'Fixture', body: 'Private fixture body', primaryFormat, ...(identity === null ? {} : { attachmentNoteId: identity }), ...overrides });
      return { result, destination };
    },
    async print(overrides = {}) {
      calls.length = 0;
      return handlers.get('library:printNote')({ sender: { id: 1 } }, { title: 'Fixture', body: 'Private fixture body', primaryFormat: 'html', attachmentNoteId: note.id, ...overrides }, 'print');
    }
  };
}

test('Encrypted TXT, Markdown and HTML export require confirmation before choosing or writing a destination', async t => {
  const f = fixture(t);
  for (const format of ['txt', 'md', 'html']) {
    f.accepted = false;
    const cancelled = await f.run(format);
    assert.equal(cancelled.result.ok, true); assert.equal(cancelled.result.value, false);
    assert.deepEqual(f.calls, ['warning']); assert.equal(fs.existsSync(cancelled.destination), false);
    f.accepted = true;
    const saved = await f.run(format);
    assert.equal(saved.result.ok, true); assert.equal(saved.result.value, true);
    assert.deepEqual(f.calls, ['warning', 'destination']);
    assert.equal(fs.readFileSync(saved.destination, 'utf8').replace(/^\ufeff/, ''), 'Private fixture body');
  }
});

test('Export rejects missing, unknown or locked source identities and plain sources retain normal export', async t => {
  const f = fixture(t); f.accepted = true;
  for (const [id, code] of [[null, 'INVALID_INPUT'], [randomUUID(), 'NOT_FOUND_OR_UNAVAILABLE']]) {
    const { result, destination } = await f.run('txt', id);
    assert.equal(result.ok, false); assert.equal(result.code, code);
    assert.deepEqual(f.calls, []); assert.equal(fs.existsSync(destination), false);
  }
  f.locked = true; const locked = await f.run('md');
  assert.equal(locked.result.code, 'NOTEBOOK_LOCKED'); assert.deepEqual(f.calls, []);
  f.locked = false; f.note.encrypted = false;
  const plain = await f.run('txt'); assert.equal(plain.result.value, true);
  assert.deepEqual(f.calls, ['destination']);
});

test('A readable plain note ID cannot suppress confirmation for substituted, converted or unsaved content', async t => {
  const f = fixture(t); f.note.encrypted = false; f.accepted = false;
  for (const overrides of [{ body: 'A different protected body' }, { title: 'A different protected title' }, { primaryFormat: 'markdown' }]) {
    const { result, destination } = await f.run('txt', f.note.id, overrides);
    assert.equal(result.ok, true); assert.equal(result.value, false);
    assert.deepEqual(f.calls, ['warning']); assert.equal(fs.existsSync(destination), false);
  }
});

test('Printing uses the same plaintext provenance confirmation as file export', async t => {
  const f = fixture(t); f.accepted = false; f.note.encrypted = false; f.note.primaryFormat = 'html';
  for (const overrides of [{ body: '<p>A different protected body</p>' }, { title: 'A different protected title' }]) {
    const result = await f.print(overrides);
    assert.equal(result.ok, true); assert.equal(result.value, false); assert.deepEqual(f.calls, ['warning']);
  }
  f.note.encrypted = true; const cancelled = await f.print();
  assert.equal(cancelled.value, false); assert.deepEqual(f.calls, ['warning']);
  f.accepted = true; const confirmed = await f.print();
  assert.equal(confirmed.value, true); assert.deepEqual(f.calls, ['warning', 'print']);
  f.note.encrypted = false; const plain = await f.print();
  assert.equal(plain.value, true); assert.deepEqual(f.calls, ['print']);
});
