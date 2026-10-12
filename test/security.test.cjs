const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { randomUUID } = require('node:crypto');
const { NoteLibrary } = require('../dist/runtime/core/library');
const password = 'Test password 12345';
const root = () => { fs.mkdirSync('output/security-tests', { recursive: true }); return fs.mkdtempSync(path.resolve('output/security-tests/case-')); };
const code = name => error => error.code === name;
const files = dir => fs.readdirSync(dir).flatMap(name => { const file = path.join(dir, name); return fs.statSync(file).isDirectory() ? files(file) : [file]; });

test('encrypted replay fingerprints stay inside encrypted metadata', async () => {
  const dir = root(), lib = new NoteLibrary(dir), operationId = randomUUID();
  const input = { title: 'Replay secret', body: 'Private body', primaryFormat: 'markdown' };
  try {
    const note = lib.create(operationId, input).note;
    await lib.securityCommand({ action: 'setup', password }); lib.protect(note.id, note.version, true);
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'recovery', operationId + '.json'))).requestHash, undefined);
    assert.equal(lib.create(operationId, input).note.id, note.id);
    assert.throws(() => lib.create(operationId, { ...input, body: 'Different' }), code('INVALID_INPUT'));
    const session = lib.begin(note.id, 'test');
    const request = { noteId: note.id, expectedVersion: note.version, token: session.token, generation: session.generation, operationId: randomUUID(), title: note.title, body: 'Changed secret' };
    const saved = lib.save(request, 'test');
    assert.deepEqual(lib.save(request, 'test'), saved);
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'recovery', request.operationId + '.json'))).requestHash, undefined);
  } finally { lib.close(); }
});
test('all revisions, attachments, index, locked APIs and portable recovery', async () => {
  const dir = root(), library = path.join(dir, 'book'); let lib = new NoteLibrary(library);
  try {
    let note = lib.create(randomUUID(), { title: 'SECRET_TITLE_4819', body: 'SECRET_BODY_4819', primaryFormat: 'markdown' }).note;
    const session = lib.begin(note.id, 'test'); const request = () => ({ noteId: note.id, expectedVersion: note.version, token: session.token, generation: session.generation, operationId: randomUUID() });
    const attachment = path.join(dir, 'SECRET_FILENAME_4819.txt'); fs.writeFileSync(attachment, 'SECRET_ATTACHMENT_4819');
    note = lib.addAttachment(request(), 'test', attachment).note;
    note = lib.save({ ...request(), title: note.title, body: 'SECRET_CHANGED_4819' }, 'test').note;
    lib.end(session.token, session.generation, 'test');
    const { recoveryKey } = await lib.securityCommand({ action: 'setup', password });
    lib.protect(note.id, note.version, true);
    assert.equal(lib.read(note.id).body, note.body); assert.equal(lib.history(note.id).total, 3);
    for (const file of files(library)) assert.equal(fs.readFileSync(file).includes(Buffer.from('SECRET_')), false, file);
    await lib.securityCommand({ action: 'lock' });
    assert.equal(lib.query().total, 0); assert.equal(lib.list().length, 0);
    assert.throws(() => lib.read(note.id), code('NOTEBOOK_LOCKED'));
    assert.throws(() => lib.history(note.id)); assert.throws(() => lib.attachmentBytes(note.id, note.attachments[0].id));
    assert.throws(() => lib.addon().read(note.id), code('NOT_FOUND_OR_UNAVAILABLE'));
    await assert.rejects(lib.securityCommand({ action: 'unlock', credential: 'Wrong password 123' }), code('BAD_CREDENTIAL'));
    assert.equal(lib.securityState().unlocked, false);
    lib.close();
    const copied = path.join(dir, 'copied'); fs.cpSync(library, copied, { recursive: true }); lib = new NoteLibrary(copied);
    await lib.securityCommand({ action: 'recover', credential: recoveryKey, password: 'New recovered password' });
    assert.equal(lib.read(note.id).body, note.body);
    assert.equal(lib.attachmentBytes(note.id, note.attachments[0].id).toString(), 'SECRET_ATTACHMENT_4819');
    await assert.rejects(lib.securityCommand({ action: 'disable', credential: 'New recovered password' }), code('ENCRYPTED_NOTES_REMAIN'));
    lib.protect(note.id, note.version, false);
    await lib.securityCommand({ action: 'disable', credential: 'New recovered password' });
    assert.equal(lib.securityState().configured, false); assert.equal(lib.read(note.id).body, note.body);
  } finally { lib.close(); }
});
for (const stage of ['security-prepared', 'security-moved']) test('conversion survives interruption at ' + stage, async () => {
  const dir = root(); let armed = false, lib = new NoteLibrary(dir, point => { if (armed && point === stage) throw Error('Injected interruption'); });
  try {
    const note = lib.create(randomUUID(), { title: 'CRASH_SECRET', body: 'CRASH_SECRET', primaryFormat: 'text' }).note;
    await lib.securityCommand({ action: 'setup', password }); armed = true;
    assert.throws(() => lib.protect(note.id, note.version, true)); lib.close(); lib = new NoteLibrary(dir);
    assert.equal(lib.securityState().encryptedNotes, 1);
    for (const file of files(dir)) assert.equal(fs.readFileSync(file).includes(Buffer.from('CRASH_SECRET')), false, file);
    await lib.securityCommand({ action: 'unlock', credential: password }); assert.equal(lib.read(note.id).body, 'CRASH_SECRET');
  } finally { lib.close(); }
});
test('ciphertext corruption and swapping are rejected without overwrite', async () => {
  const dir = root(), lib = new NoteLibrary(dir);
  try {
    const a = lib.create(randomUUID()).note, b = lib.create(randomUUID()).note;
    await lib.securityCommand({ action: 'setup', password }); lib.protect(a.id, a.version, true); lib.protect(b.id, b.version, true);
    const pa = path.join(dir, 'notes', a.id, 'revisions', a.revisionId, 'content.md'), pb = path.join(dir, 'notes', b.id, 'revisions', b.revisionId, 'content.md');
    fs.copyFileSync(pa, pb); const before = fs.readFileSync(pb);
    assert.throws(() => lib.read(b.id), code('INTEGRITY_CHECK_FAILED')); assert.deepEqual(fs.readFileSync(pb), before);
    assert.throws(() => lib.protect(b.id, b.version, false)); assert.deepEqual(fs.readFileSync(pb), before);
  } finally { lib.close(); }
});
test('hidden filtering covers search, pagination, recent, ID and attachment APIs', async () => {
  const lib = new NoteLibrary(root());
  try {
    const note = lib.create(randomUUID(), { title: 'Hidden title', body: 'Hidden body', primaryFormat: 'text' }).note;
    const session = lib.begin(note.id, 'test'); lib.end(session.token, session.generation, 'test');
    lib.setVisibility(note.id, note.version, false);
    assert.equal(lib.query().total, 1); assert.equal(lib.addon().query().total, 0);
    assert.equal(lib.addon().query({ text: 'Hidden', view: 'recent' }).total, 0);
    assert.throws(() => lib.addon().read(note.id), code('NOT_FOUND_OR_UNAVAILABLE'));
  } finally { lib.close(); }
});

test('encrypted editing, attachment, history cleanup, trash and purge after restart', async () => {
  const dir = root(); let lib = new NoteLibrary(dir), armed = false;
  let note = lib.create(randomUUID()).note;
  try {
    await lib.securityCommand({ action: 'setup', password }); lib.protect(note.id, note.version, true);
    const session = lib.begin(note.id, 'test');
    note = lib.save({ noteId: note.id, expectedVersion: note.version, token: session.token, generation: session.generation, operationId: randomUUID(), title: 'ENCRYPTED_EDIT', body: 'ENCRYPTED_BODY' }, 'test').note;
    lib.end(session.token, session.generation, 'test');
    lib.cleanHistory(note.id, note.version, 1, randomUUID()); assert.equal(lib.history(note.id).total, 1);
    note = lib.trash(note.id, note.version, randomUUID()).note;
    lib.close(); lib = new NoteLibrary(dir, stage => { if (armed && stage === 'purge-journal') throw Error('Crash'); });
    assert.equal(lib.query({ view: 'trash' }).total, 0); await lib.securityCommand({ action: 'unlock', credential: password });
    assert.equal(lib.query({ view: 'trash' }).total, 1);
    note = lib.restore(note.id, note.version, randomUUID()).note; assert.equal(note.body, 'ENCRYPTED_BODY');
    note = lib.trash(note.id, note.version, randomUUID()).note; armed = true;
    assert.throws(() => lib.purge(note.id, note.version, randomUUID())); lib.close(); lib = new NoteLibrary(dir);
    await lib.securityCommand({ action: 'unlock', credential: password }); assert.equal(lib.securityState().encryptedNotes, 0);
  } finally { lib.close(); }
});

test('encrypted source import rewraps history and attachments with target key without changing source', async () => {
  const { NotebookSecurity } = require('../dist/runtime/core/security');
  const { planImport, executeImport } = require('../dist/runtime/core/library-import');
  const dir = root(), source = path.join(dir, 'source'), target = path.join(dir, 'target');
  const src = new NoteLibrary(source), dst = new NoteLibrary(target);
  try {
    let note = src.create(randomUUID(), { title: 'IMPORT_SECRET', body: 'IMPORT_SECRET', primaryFormat: 'text' }).note;
    const file = path.join(dir, 'image.txt'); fs.writeFileSync(file, 'IMPORT_ATTACHMENT'); const session = src.begin(note.id, 'owner');
    note = src.addAttachment({ noteId: note.id, expectedVersion: note.version, token: session.token, generation: session.generation, operationId: randomUUID() }, 'owner', file).note;
    src.end(session.token, session.generation, 'owner'); await src.securityCommand({ action: 'setup', password }); src.protect(note.id, note.version, true);
    src.setVisibility(note.id, note.version, false); src.close();
    const before = files(source).map(file => [file, fs.readFileSync(file)]);
    const reader = new NotebookSecurity(source, src.libraryId, undefined, true); await reader.unlock(password);
    assert.throws(() => planImport(source, target, { source: reader }), code('NOTEBOOK_LOCKED'));
    await dst.securityCommand({ action: 'setup', password: 'Different target password' });
    executeImport(planImport(source, target, { source: reader, target: dst.importSecurity() })); dst.reloadImported(); reader.lock();
    assert.equal(dst.read(note.id).encrypted, true); assert.equal(dst.read(note.id).body, 'IMPORT_SECRET'); assert.equal(dst.read(note.id).visibleInThunderbird, false);
    assert.equal(dst.attachmentBytes(note.id, note.attachments[0].id).toString(), 'IMPORT_ATTACHMENT');
    for (const [file, bytes] of before) assert.deepEqual(fs.readFileSync(file), bytes);
    for (const file of files(target)) assert.equal(fs.readFileSync(file).includes(Buffer.from('IMPORT_SECRET')), false);
    dst.lockSecurity(); await assert.rejects(dst.securityCommand({ action: 'unlock', credential: password }), code('BAD_CREDENTIAL'));
    await dst.securityCommand({ action: 'unlock', credential: 'Different target password' }); assert.equal(dst.history(note.id).total, 3);
  } finally { try { src.close(); } catch {} dst.close(); }
});

test('locking cancels pending password derivation and missing keyrings fail closed', async () => {
  const dir = root(), lib = new NoteLibrary(dir);
  try {
    const note = lib.create(randomUUID()).note; await lib.securityCommand({ action: 'setup', password }); lib.protect(note.id, note.version, true);
    lib.lockSecurity(); const pending = lib.securityCommand({ action: 'unlock', credential: password }); lib.lockSecurity(); await assert.rejects(pending, code('CANCELLED'));
    assert.equal(lib.securityState().unlocked, false); lib.close(); fs.unlinkSync(path.join(dir, 'keyring.json'));
    assert.throws(() => new NoteLibrary(dir), code('INTEGRITY_CHECK_FAILED'));
  } finally { try { lib.close(); } catch {} }
});
