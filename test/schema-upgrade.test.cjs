const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { randomUUID } = require('node:crypto');
const { NoteLibrary } = require('../dist/runtime/core/library');
const { LibraryRegistry } = require('../dist/runtime/core/registry');
const root = () => { fs.mkdirSync('output/schema-tests', { recursive: true }); return fs.mkdtempSync(path.resolve('output/schema-tests/case-')); };
const manifest = dir => JSON.parse(fs.readFileSync(path.join(dir, 'library.json')));
for (let version = 1; version <= 8; version++) test('schema ' + version + ' upgrades with a readable original backup', () => {
  const dir = root(), book = path.join(dir, 'book'); let lib = new NoteLibrary(book);
  const note = lib.create(randomUUID(), { title: 'Preserved note', body: 'Preserved content', primaryFormat: 'markdown' }).note;
  lib.close(); fs.writeFileSync(path.join(book, 'library.json'), JSON.stringify({ ...manifest(book), schemaVersion: version }));
  lib = new NoteLibrary(book, undefined, 'existing');
  try {
    const upgraded = lib.upgradeSchema(version);
    assert.equal(manifest(book).schemaVersion, 9); assert.equal(manifest(upgraded.backupPath).schemaVersion, version);
    assert.deepEqual(lib.read(note.id), note);
    const backup = new NoteLibrary(upgraded.backupPath, undefined, 'existing');
    try { assert.deepEqual(backup.read(note.id), note); } finally { backup.close(); }
    assert.deepEqual(lib.upgradeSchema(9), { schemaVersion: 9, backupPath: null });
    assert.equal(fs.readdirSync(path.dirname(upgraded.backupPath)).length, 1);
  } finally { lib.close(); }
});
test('failed manifest commit retains the old schema and backup', () => {
  const book = path.join(root(), 'book'), lib = new NoteLibrary(book, stage => { if (stage === 'schema') throw Error('Injected write failure'); });
  try {
    const note = lib.create(randomUUID()).note;
    assert.throws(() => lib.upgradeSchema(2), error => error.code === 'VERSION_CONFLICT');
    assert.throws(() => lib.upgradeSchema(1), error => error.code === 'WRITE_FAILED');
    assert.equal(manifest(book).schemaVersion, 1); assert.deepEqual(lib.read(note.id), note);
    const dir = book + '.schema-backups'; assert.equal(manifest(path.join(dir, fs.readdirSync(dir)[0])).schemaVersion, 1);
  } finally { lib.close(); }
});
test('upgrading an inactive notebook never switches or upgrades the active one', () => {
  const dir = root(), registry = new LibraryRegistry(dir, path.join(dir, 'active'));
  try {
    registry.get();
    const first = registry.state().activeId;
    const state = registry.add(path.join(dir, 'other'), 'create'), second = state.entries.find(item => item.id !== first);
    const result = registry.upgrade(second.id, 1);
    assert.equal(result.schemaVersion, 9); assert.equal(registry.state().activeId, first);
    assert.equal(registry.state().entries.find(item => item.id === first).schemaVersion, 1);
    assert.equal(registry.state().entries.find(item => item.id === second.id).schemaVersion, 9);
    assert.throws(() => registry.upgrade(randomUUID(), 1), error => error.code === 'NOT_FOUND_OR_UNAVAILABLE');
  } finally { registry.close(); }
});
test('failed backup never upgrades the manifest or loses note content', () => {
  const book = path.join(root(), 'book'), lib = new NoteLibrary(book);
  try {
    const note = lib.create(randomUUID()).note;
    fs.writeFileSync(book + '.schema-backups', 'Blocked backup directory');
    assert.throws(() => lib.upgradeSchema(1), error => error.code === 'WRITE_FAILED');
    assert.equal(manifest(book).schemaVersion, 1); assert.deepEqual(lib.read(note.id), note);
  } finally { lib.close(); }
});
