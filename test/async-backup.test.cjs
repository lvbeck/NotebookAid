const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { randomUUID } = require('node:crypto');
const { NoteLibrary } = require('../dist/runtime/core/library');
const { createBackupAsync } = require('../dist/runtime/core/async-backup');
const { verifyBackup, restoreBackup } = require('../dist/runtime/core/backups');
function fixture() { fs.mkdirSync('output/async-backup', { recursive: true }); return fs.mkdtempSync(path.resolve('output/async-backup/case-')); }
test('asynchronous backup keeps event loop responsive and produces a compatible verified snapshot', async () => {
  const root = fixture(), library = new NoteLibrary(path.join(root, 'book'));
  let ticks = 0; const timer = setInterval(() => ticks++, 1);
  try {
    const note = library.create(randomUUID(), { title: 'Snapshot', body: 'Preserved body', primaryFormat: 'text' }).note;
    fs.writeFileSync(path.join(library.path, 'large.bin'), Buffer.alloc(32 * 1024 * 1024, 23));
    const phases = new Set(); await library.verifyIntegrityAsync(value => phases.add(value.phase));
    const result = await createBackupAsync(library.path, path.join(root, 'copies'), value => { phases.add(value.phase); assert.ok(value.completed >= 0 && (value.total === null || value.completed <= value.total)); });
    assert.ok(ticks > 10); assert.deepEqual([...phases], ['validating','scanning','hashing','copying','verifying','complete']);
    assert.deepEqual(verifyBackup(result.path), result);
    restoreBackup(result.path, path.join(root, 'restored'), library.libraryId);
    const restored = new NoteLibrary(path.join(root, 'restored'), undefined, 'existing');
    try { assert.equal(restored.read(note.id).body, 'Preserved body'); } finally { restored.close(); }
    assert.equal(fs.existsSync(path.join(result.path, 'notebook/.writer.sqlite')), false);
  } finally { clearInterval(timer); library.close(); }
});
test('source changes or linked files do not publish a successful backup', async () => {
  const root = fixture(), library = new NoteLibrary(path.join(root, 'book'));
  try {
    const file = path.join(library.path, 'test.bin'); fs.writeFileSync(file, 'original');
    await assert.rejects(createBackupAsync(library.path, path.join(root, 'copies'), value => { if (value.phase === 'copying' && value.completed === 0) fs.writeFileSync(file, 'modified'); }), error => error.code === 'INTEGRITY_CHECK_FAILED');
    for (const name of fs.readdirSync(path.join(root, 'copies'))) assert.equal(fs.existsSync(path.join(root, 'copies', name, 'backup.json')), false);
    const linked = path.join(root, 'linked'); fs.symlinkSync(library.path, linked, 'junction');
    await assert.rejects(createBackupAsync(linked, path.join(root, 'linked-copies'), () => {}));
    assert.equal(fs.existsSync(path.join(root, 'linked-copies')), false);
  } finally { library.close(); }
});
test('asynchronous backup preserves encrypted content and password recovery without plaintext output', async () => {
  const root = fixture(), library = new NoteLibrary(path.join(root, 'book')), password = 'Async backup fixture password';
  try {
    const note = library.create(randomUUID(), { title: 'Encrypted fixture', body: 'ASYNC_SECRET_BODY', primaryFormat: 'text' }).note;
    await library.securityCommand({ action: 'setup', password }); library.protect(note.id, note.version, true); library.lockSecurity();
    assert.equal((await library.verifyIntegrityAsync(() => {})).encryptedSkipped, 1);
    const result = await createBackupAsync(library.path, path.join(root, 'copies'), () => {});
    const manifest = JSON.parse(fs.readFileSync(path.join(result.path, 'backup.json')));
    for (const row of manifest.files) assert.equal(fs.readFileSync(path.join(result.path, 'notebook', row.path)).includes(Buffer.from('ASYNC_SECRET_BODY')), false);
    restoreBackup(result.path, path.join(root, 'restored'), library.libraryId);
    const restored = new NoteLibrary(path.join(root, 'restored'), undefined, 'existing');
    try { await restored.securityCommand({ action: 'unlock', credential: password }); assert.equal(restored.read(note.id).body, 'ASYNC_SECRET_BODY'); } finally { restored.close(); }
  } finally { library.close(); }
});
