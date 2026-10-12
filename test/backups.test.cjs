const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { randomUUID } = require('node:crypto');
const { NoteLibrary } = require('../dist/runtime/core/library');
const { LibraryRegistry } = require('../dist/runtime/core/registry');
const { BackupStore, createBackup, verifyBackup, restoreBackup } = require('../dist/runtime/core/backups');
const root = () => { fs.mkdirSync('output/backup-tests', { recursive: true }); return fs.mkdtempSync(path.resolve('output/backup-tests/case-')); };
const code = value => error => error.code === value;
test('backup preserves revisions, trash and large attachments with bounded hashing buffers', () => {
  const dir = root(), book = path.join(dir, 'book'), lib = new NoteLibrary(book);
  try {
    let note = lib.create(randomUUID(), { title: 'Backup note', body: 'Original', primaryFormat: 'text' }).note;
    const session = lib.begin(note.id, 'test');
    const request = () => ({ noteId: note.id, expectedVersion: note.version, token: session.token, generation: session.generation, operationId: randomUUID() });
    const file = path.join(dir, 'large.bin'); fs.writeFileSync(file, Buffer.alloc(20 * 1024 * 1024, 19));
    note = lib.addAttachment(request(), 'test', file).note; note = lib.save({ ...request(), title: note.title, body: 'Changed' }, 'test').note;
    lib.end(session.token, session.generation, 'test'); lib.trash(note.id, note.version, randomUUID());
    const result = createBackup(book, path.join(dir, 'backups')); assert.ok(result.bytes >= 20 * 1024 * 1024);
    assert.equal(fs.existsSync(path.join(result.path, 'notebook/.writer.sqlite')), false);
    restoreBackup(result.path, path.join(dir, 'restored'), lib.libraryId);
    const restored = new NoteLibrary(path.join(dir, 'restored'), undefined, 'existing');
    try { assert.equal(restored.read(note.id).body, 'Changed'); assert.ok(restored.read(note.id).deletedAt); assert.equal(restored.history(note.id).total, lib.history(note.id).total); assert.equal(restored.attachmentBytes(note.id, note.attachments[0].id).length, 20 * 1024 * 1024); } finally { restored.close(); }
    fs.writeFileSync(path.join(result.path, 'notebook/library.json'), '{}'); assert.throws(() => verifyBackup(result.path), code('INTEGRITY_CHECK_FAILED'));
    fs.writeFileSync(path.join(result.path, 'backup.json'), 'broken JSON'); assert.throws(() => verifyBackup(result.path), code('INTEGRITY_CHECK_FAILED'));
  } finally { lib.close(); }
});
test('encrypted raw backup restores password access without storing plaintext', async () => {
  const dir = root(), lib = new NoteLibrary(path.join(dir, 'book')), password = 'Backup fixture password';
  try {
    const note = lib.create(randomUUID(), { title: 'SECRET_BACKUP_TITLE', body: 'SECRET_BACKUP_BODY', primaryFormat: 'text' }).note;
    await lib.securityCommand({ action: 'setup', password }); lib.protect(note.id, note.version, true); lib.lockSecurity();
    assert.equal(lib.verifyIntegrity().encryptedSkipped, 1);
    const backup = createBackup(lib.path, path.join(dir, 'copies')); restoreBackup(backup.path, path.join(dir, 'restored'), lib.libraryId);
    const raw = path.join(backup.path, 'notebook/notes', note.id, 'revisions', note.revisionId, 'content.txt'); assert.equal(fs.readFileSync(raw).includes(Buffer.from('SECRET_BACKUP_BODY')), false);
    const restored = new NoteLibrary(path.join(dir, 'restored'), undefined, 'existing');
    try { await restored.securityCommand({ action: 'unlock', credential: password }); assert.equal(restored.read(note.id).body, note.body); assert.equal(restored.verifyIntegrity().notes, 1); } finally { restored.close(); }
  } finally { lib.close(); }
});
test('overlapping backup paths and nonempty restore destinations are rejected', () => {
  const dir = root(), lib = new NoteLibrary(path.join(dir, 'book'));
  try { assert.throws(() => createBackup(lib.path, path.join(lib.path, 'backups')), code('INVALID_INPUT')); const backup = createBackup(lib.path, path.join(dir, 'copies')); const target = path.join(dir, 'occupied'); fs.mkdirSync(target); fs.writeFileSync(path.join(target, 'keep'), 'keep'); assert.throws(() => restoreBackup(backup.path, target, lib.libraryId), code('TARGET_NOT_EMPTY')); assert.equal(fs.readFileSync(path.join(target, 'keep'), 'utf8'), 'keep'); } finally { lib.close(); }
});
test('manifest traversal and library identity changes do not write outside destination', () => {
  const dir = root(), lib = new NoteLibrary(path.join(dir, 'book'));
  try { const b = createBackup(lib.path, path.join(dir, 'copies')); assert.throws(() => restoreBackup(b.path, path.join(dir, 'target'), randomUUID()), code('LIBRARY_ID_MISMATCH')); const file = path.join(b.path, 'backup.json'), value = JSON.parse(fs.readFileSync(file)); value.files[0].path = '../escape'; fs.writeFileSync(file, JSON.stringify(value)); assert.throws(() => restoreBackup(b.path, path.join(dir, 'target'), lib.libraryId)); assert.equal(fs.existsSync(path.join(dir, 'target')), false); } finally { lib.close(); }
});
test('migration retains original and registry failure preserves active source', () => {
  const dir = root(); let fail = false; const registry = new LibraryRegistry(dir, path.join(dir, 'original'), stage => { if (stage === 'registry' && fail) throw Error('Fixture'); });
  try { const lib = registry.get(), note = lib.create(randomUUID(), { title: 'Keep', body: 'Content', primaryFormat: 'text' }).note, id = registry.state().activeId; fail = true; assert.throws(() => registry.maintenance(id, 'migrate', path.join(dir, 'failed')), code('WRITE_FAILED')); assert.equal(registry.get().path, lib.path); assert.equal(registry.get().read(note.id).body, 'Content'); fail = false; registry.maintenance(id, 'migrate', path.join(dir, 'moved')); assert.equal(registry.get().read(note.id).body, 'Content'); assert.ok(fs.existsSync(path.join(dir, 'original/library.json'))); } finally { registry.close(); }
});
test('daily policy defaults off, persists and advances only after successful backup', () => {
  const dir = root(), id = randomUUID(), store = new BackupStore(dir); assert.deepEqual(store.state().policies, {});
  store.update(id, path.join(dir, 'copies'), false); assert.equal(store.state().policies[id].enabled, false);
  store.update(id, path.join(dir, 'copies'), true); const next = store.state().policies[id].nextAt; assert.ok(next > Date.now()); assert.deepEqual(store.state(next + 1).missed, [id]);
  store.complete(id); assert.ok(store.state().policies[id].lastAt); assert.equal(new BackupStore(dir).state().policies[id].enabled, true);
  store.update(id, path.join(dir, 'copies'), false); assert.equal(store.state().policies[id].nextAt, null);
});
test('missing notebook can restore into a new empty directory without opening its old path', () => {
  const dir = root(), original = path.join(dir, 'original'); let registry = new LibraryRegistry(dir, original);
  const lib = registry.get(), id = registry.state().activeId, note = lib.create(randomUUID(), { title: 'Recovery', body: 'Snapshot', primaryFormat: 'text' }).note;
  const backup = createBackup(original, path.join(dir, 'copies')); registry.close();
  fs.renameSync(original, path.join(dir, 'missing-original')); registry = new LibraryRegistry(dir, original);
  try { registry.maintenance(id, 'restore', path.join(dir, 'restored'), backup.path); assert.equal(registry.get().read(note.id).body, 'Snapshot'); assert.equal(fs.existsSync(original), false); } finally { registry.close(); }
});
test('corrupt backup and active sessions prevent registry changes', () => {
  const dir = root(), registry = new LibraryRegistry(dir, path.join(dir, 'original'));
  try {
    const lib = registry.get(), id = registry.state().activeId, note = lib.create(randomUUID(), { title: 'Keep', body: 'Original', primaryFormat: 'text' }).note;
    const backup = createBackup(lib.path, path.join(dir, 'copies')), session = lib.begin(note.id, 'test');
    assert.throws(() => registry.maintenance(id, 'restore', path.join(dir, 'target'), backup.path), code('NOTE_IN_USE'));
    lib.end(session.token, session.generation, 'test'); fs.writeFileSync(path.join(backup.path, 'notebook/library.json'), '{}');
    assert.throws(() => registry.maintenance(id, 'restore', path.join(dir, 'target'), backup.path), code('INTEGRITY_CHECK_FAILED'));
    assert.equal(registry.get().read(note.id).body, 'Original'); assert.equal(fs.existsSync(path.join(dir, 'target')), false);
  } finally { registry.close(); }
});
test('copy failure leaves original data and existing destination file unchanged', () => {
  const dir = root(), lib = new NoteLibrary(path.join(dir, 'book'));
  try { const note = lib.create(randomUUID(), { title: 'Keep', body: 'Content', primaryFormat: 'text' }).note, target = path.join(dir, 'file'); fs.writeFileSync(target, 'Do not overwrite'); assert.throws(() => createBackup(lib.path, target)); assert.equal(fs.readFileSync(target, 'utf8'), 'Do not overwrite'); assert.equal(lib.read(note.id).body, 'Content'); } finally { lib.close(); }
});
test('linked backup paths are rejected before writing', () => {
  const dir = root(), lib = new NoteLibrary(path.join(dir, 'book')), target = path.join(dir, 'actual'), linked = path.join(dir, 'linked'); fs.mkdirSync(target); fs.symlinkSync(target, linked, process.platform === 'win32' ? 'junction' : 'dir');
  try { assert.throws(() => createBackup(lib.path, linked), code('INVALID_INPUT')); assert.deepEqual(fs.readdirSync(target), []); } finally { lib.close(); }
});
