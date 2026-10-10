const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { NoteLibrary } = require('../dist/runtime/core/library.js');
const directory = () => { const root = path.resolve('output/library-tests'); fs.mkdirSync(root, { recursive: true }); return fs.mkdtempSync(path.join(root, 'case-')); };
const code = value => error => error.code === value;
function request(session, overrides = {}) { return { noteId: session.note.id, token: session.token, generation: session.generation, expectedVersion: session.note.version, operationId: randomUUID(), title: '中文标题', body: '# Unicode\n\n正文 😀', ...overrides }; }

test('separate metadata/body, durable reopen, stable identity and content versions', () => {
  const root = directory(); let library = new NoteLibrary(root);
  try {
    const created = library.create(randomUUID()).note;
    const session = library.begin(created.id, 'owner');
    const saved = library.save(request(session), 'owner');
    assert.equal(saved.note.version, 2); assert.equal(saved.note.contentVersion, 2);
    const rename = library.save(request({ ...session, note: saved.note }, { body: saved.note.body, title: 'Renamed' }), 'owner');
    assert.equal(rename.note.contentVersion, 2); assert.equal(rename.note.version, 3);
    const revision = path.join(root, 'notes', created.id, 'revisions', rename.note.revisionId);
    assert.equal(fs.readFileSync(path.join(revision, 'content.md'), 'utf8'), saved.note.body);
    assert.equal(JSON.parse(fs.readFileSync(path.join(revision, 'metadata.json'))).title, 'Renamed');
    library.close(); library = new NoteLibrary(root);
    assert.deepEqual(library.read(created.id), rename.note);
  } finally { library.close(); }
});

test('sessions bind owner and generation, saved notes remain locked against deletion', () => {
  const library = new NoteLibrary(directory());
  try {
    const note = library.create(randomUUID()).note;
    const session = library.begin(note.id, 'one');
    assert.throws(() => library.begin(note.id, 'two'), code('NOTE_IN_USE'));
    assert.throws(() => library.save(request(session), 'two'), code('SESSION_EXPIRED'));
    const saved = library.save(request(session), 'one');
    assert.throws(() => library.trash(note.id, saved.note.version, randomUUID()), code('NOTE_IN_USE'));
    assert.throws(() => library.save(request(session), 'one'), code('VERSION_CONFLICT'));
    library.releaseOwner('one');
    const next = library.begin(note.id, 'one');
    assert.notEqual(next.generation, session.generation);
    assert.throws(() => library.save(request(session), 'one'), code('SESSION_EXPIRED'));
    library.end(next.token, next.generation, 'one');
    assert.ok(library.trash(note.id, saved.note.version, randomUUID()).note.deletedAt);
  } finally { library.close(); }
});

test('operation replay is idempotent and mismatched payload cannot reuse its id', () => {
  const library = new NoteLibrary(directory());
  try {
    const operation = randomUUID();
    const created = library.create(operation); assert.equal(library.create(operation).note.id, created.note.id);
    const session = library.begin(created.note.id, 'one'); const input = request(session);
    const saved = library.save(input, 'one'); assert.deepEqual(library.save(input, 'one'), saved);
    assert.throws(() => library.save({ ...input, body: 'different' }, 'one'), code('INVALID_INPUT'));
  } finally { library.close(); }
});

test('single writer rejects another core and releases OS lock after close', () => {
  const root = directory(); const first = new NoteLibrary(root);
  assert.throws(() => new NoteLibrary(root), code('LIBRARY_IN_USE'));
  first.close(); const second = new NoteLibrary(root); second.close();
});

test('commit events omit body and title and a throwing observer cannot undo saving', () => {
  const library = new NoteLibrary(directory()); const changes = [];
  try {
    library.onChange(value => changes.push(value)); library.onChange(() => { throw new Error('Observer failed'); });
    const note = library.create(randomUUID()).note;
    assert.deepEqual(changes, [{ noteId: note.id, version: 1, indexed: true }]);
    assert.equal(library.read(note.id).id, note.id);
  } finally { library.close(); }
});

test('failed write preserves previous authoritative revision and caller draft', () => {
  let fail = false; const library = new NoteLibrary(directory(), stage => { if (fail && stage === 'journal') throw new Error('Simulated disk failure'); });
  try {
    const note = library.create(randomUUID()).note; const session = library.begin(note.id, 'one'); const input = request(session);
    fail = true; assert.throws(() => library.save(input, 'one'), code('WRITE_FAILED'));
    assert.deepEqual(library.read(note.id), note); assert.equal(input.body, '# Unicode\n\n正文 😀');
    fail = false; assert.equal(library.save(input, 'one').note.version, 2);
  } finally { library.close(); }
});

test('index failure reports saved separately and rebuilding restores catalog', () => {
  let fail = false; const library = new NoteLibrary(directory(), stage => { if (fail && stage === 'index') throw new Error('Index failure'); });
  try {
    const note = library.create(randomUUID()).note; const session = library.begin(note.id, 'one');
    fail = true; const saved = library.save(request(session), 'one');
    assert.equal(saved.saved, true); assert.equal(saved.indexed, false); assert.equal(library.read(note.id).body, saved.note.body);
    assert.equal(library.rebuild().indexed, true);
  } finally { library.close(); }
});

test('missing/corrupt index rebuilds from files; corrupt content is retained and reported', () => {
  const root = directory(); let library = new NoteLibrary(root); const note = library.create(randomUUID()).note; library.close();
  fs.renameSync(path.join(root, 'index/catalog.sqlite'), path.join(root, 'index/catalog-test-backup.sqlite'));
  library = new NoteLibrary(root); assert.equal(library.list().length, 1); library.close();
  fs.writeFileSync(path.join(root, 'index/catalog.sqlite'), 'corrupt index');
  library = new NoteLibrary(root);
  assert.equal(library.list().length, 1); assert.equal(library.status().indexed, true); library.close();
  const file = path.join(root, 'notes', note.id, 'revisions', note.revisionId, 'content.md');
  fs.writeFileSync(file, 'tampered'); library = new NoteLibrary(root);
  try {
    assert.throws(() => library.read(note.id), code('INTEGRITY_CHECK_FAILED'));
    assert.ok(library.status().issues.some(value => value.startsWith('DAMAGED_NOTE:')));
    assert.equal(fs.readFileSync(file, 'utf8'), 'tampered');
  } finally { library.close(); }
});

test('an unrelated nonempty folder is rejected without changing its files', () => {
  const root = directory(); fs.writeFileSync(path.join(root, 'personal.txt'), 'Keep this file');
  assert.throws(() => new NoteLibrary(root), code('INVALID_INPUT'));
  assert.deepEqual(fs.readdirSync(root), ['personal.txt']);
});

test('invalid identifiers, oversized bodies and directory links are rejected', () => {
  const library = new NoteLibrary(directory());
  try {
    assert.throws(() => library.read('../escape'), code('INVALID_INPUT'));
    const note = library.create(randomUUID()).note; const session = library.begin(note.id, 'one');
    assert.throws(() => library.save(request(session, { body: 'x'.repeat(2 * 1024 * 1024 + 1) }), 'one'), code('INVALID_INPUT'));
    assert.throws(() => library.save(request(session, { title: '' }), 'one'), code('INVALID_INPUT'));
    const outside = directory(); const id = randomUUID();
    fs.symlinkSync(outside, path.join(library.path, 'notes', id), 'junction');
    assert.throws(() => library.read(id), code('INVALID_INPUT'));
  } finally { library.close(); }
});

for (const stage of ['journal', 'revision', 'head', 'index']) test(`abrupt process termination after ${stage} keeps a valid old or new commit`, () => {
  const root = directory(); let library = new NoteLibrary(root); const note = library.create(randomUUID()).note; library.close();
  const child = spawnSync(process.execPath, [path.resolve('test/library-crash-worker.cjs'), root, note.id, stage], { encoding: 'utf8', timeout: 15000 });
  assert.notEqual(child.status, 0, child.stderr);
  assert.equal(fs.readFileSync(path.join(root, 'crash-stage.txt'), 'utf8'), stage);
  library = new NoteLibrary(root);
  try {
    const recovered = library.read(note.id);
    assert.equal(recovered.body, ['head', 'index'].includes(stage) ? 'Committed after crash' : '');
    assert.equal(recovered.version, ['head', 'index'].includes(stage) ? 2 : 1);
    assert.equal(library.status().indexed, true);
  } finally { library.close(); }
});
