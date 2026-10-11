const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { NoteLibrary } = require('../dist/runtime/core/library.js');
const { planImport, executeImport } = require('../dist/runtime/core/library-import.js');
function root() { fs.mkdirSync('output/import-tests', { recursive: true }); return fs.mkdtempSync(path.resolve('output/import-tests/case-')); }
function tree(directory) {
  const result = {};
  const walk = (folder) => { for (const entry of fs.readdirSync(folder, { withFileTypes: true })) { const file = path.join(folder, entry.name); if (entry.isDirectory()) walk(file); else result[path.relative(directory, file)] = createHash('sha256').update(fs.readFileSync(file)).digest('hex'); } };
  walk(directory); return result;
}
function fixture() {
  const base = root(), source = path.join(base, 'source'), target = path.join(base, 'target');
  const lib = new NoteLibrary(source);
  const note = lib.create(randomUUID(), { title: 'Original 中文', primaryFormat: 'html', body: '<p class="keep"><a href="https://example.test" target="_blank">Link</a></p>' }).note;
  lib.close(); return { base, source, target, note, lib: new NoteLibrary(target) };
}
function edit(lib, note, body) { const session = lib.begin(note.id, 'test'); return lib.save({ noteId: note.id, token: session.token, generation: session.generation, expectedVersion: session.note.version, operationId: randomUUID(), title: note.title, body }, 'test').note; }
const code = value => error => error.code === value;

test('schema 1 import preserves raw bodies, source tree, target notes and backup; repeat skips', () => {
  const f = fixture();
  try {
    const existing = f.lib.create(randomUUID()).note; const before = tree(f.source);
    const plan = planImport(f.source, f.target); assert.equal(plan.preview.sourceVersion, 1); assert.equal(plan.preview.notes, 1);
    assert.deepEqual(tree(f.source), before); assert.equal(fs.existsSync(f.target + '.import-backups'), false);
    const result = executeImport(plan); f.lib.reloadImported();
    assert.equal(result.targetVersion, 3); assert.equal(result.imported, 1);
    assert.deepEqual(f.lib.read(f.note.id), f.note); assert.deepEqual(f.lib.read(existing.id), existing);
    assert.deepEqual(tree(f.source), before);
    assert.equal(JSON.parse(fs.readFileSync(path.join(result.backupPath, 'library.json'))).schemaVersion, 1);
    assert.equal(fs.existsSync(path.join(result.backupPath, 'notes', existing.id, 'head.json')), true);
    assert.equal(fs.existsSync(path.join(result.backupPath, '.writer.sqlite')), false);
    const second = executeImport(planImport(f.source, f.target)); assert.equal(second.imported, 0); assert.equal(second.skipped, 1); assert.equal(second.backupPath, null);
    f.lib.close(); f.lib = new NoteLibrary(f.target); assert.equal(f.lib.list().length, 2);
  } finally { f.lib.close(); }
});

test('schema 2 history, folders, tags, pin and changed source create an independent copy', () => {
  const f = fixture();
  try {
    let source = new NoteLibrary(f.source);
    const folder = randomUUID(), tag = randomUUID();
    source.editOrganization({ kind: 'folder', id: folder, name: 'Folder', parentId: null, expectedVersion: 0 });
    source.editOrganization({ kind: 'tag', id: tag, name: 'Tag', color: '#abcdef', expectedVersion: 1 });
    let session = source.begin(f.note.id, 'test');
    source.place({ noteId: f.note.id, token: session.token, generation: session.generation, expectedVersion: 1, operationId: randomUUID(), folderId: folder, tagIds: [tag], pinned: true }, 'test');
    const note = edit(source, f.note, '<p>Updated &amp; unchanged syntax</p>'); source.close();
    const targetFolder = randomUUID(), targetTag = randomUUID();
    f.lib.editOrganization({ kind: 'folder', id: targetFolder, name: 'FOLDER', parentId: null, expectedVersion: 0 });
    f.lib.editOrganization({ kind: 'tag', id: targetTag, name: 'Tag', color: '#123456', expectedVersion: 1 });
    const before = tree(f.source); const plan = planImport(f.source, f.target);
    assert.equal(plan.preview.revisions, 3); assert.equal(plan.preview.folders, 0); assert.equal(plan.preview.tags, 1);
    executeImport(plan); f.lib.reloadImported();
    const imported = f.lib.read(note.id); assert.equal(imported.folderId, targetFolder); assert.equal(imported.pinned, true); assert.equal(imported.body, note.body); assert.equal(imported.version, 3);
    assert.equal(f.lib.organization().tags.find(t => imported.tagIds.includes(t.id)).name, 'Tag (2)');
    assert.equal(fs.readdirSync(path.join(f.target, 'notes', note.id, 'revisions')).length, 3);
    assert.deepEqual(tree(f.source), before);
    source = new NoteLibrary(f.source); const changed = edit(source, note, '<p>Next source revision</p>'); source.close();
    const changedPlan = planImport(f.source, f.target); assert.equal(changedPlan.preview.conflicts, 1); executeImport(changedPlan); f.lib.reloadImported();
    assert.equal(f.lib.list().length, 2); assert.equal(f.lib.read(note.id).body, note.body);
    assert.equal(f.lib.query({ text: 'Next source revision' }).total, 1);
    assert.equal(f.lib.query({ text: 'Next source revision' }).notes[0].version, changed.version);
    assert.equal(executeImport(planImport(f.source, f.target)).imported, 0);
    f.lib.reloadImported(); assert.equal(f.lib.organization().tags.length, 2);
    // Later organization edits must not downgrade the target schema.
    f.lib.editOrganization({ kind: 'folder', id: targetFolder, name: 'Renamed', parentId: null, expectedVersion: f.lib.organization().version });
    assert.equal(JSON.parse(fs.readFileSync(path.join(f.target, 'library.json'))).schemaVersion, 3);
  } finally { f.lib.close(); }
});

test('previews reject active sources, same libraries, unsupported versions and attachments', () => {
  const f = fixture();
  try {
    const open = new NoteLibrary(f.source);
    assert.throws(() => planImport(f.source, f.target), code('LIBRARY_IN_USE')); open.close();
    assert.throws(() => planImport(f.target, f.target), code('INVALID_INPUT'));
    const manifestPath = path.join(f.source, 'library.json'), original = JSON.parse(fs.readFileSync(manifestPath));
    fs.writeFileSync(manifestPath, JSON.stringify({ ...original, schemaVersion: 99 }));
    assert.throws(() => planImport(f.source, f.target), code('UNSUPPORTED_LIBRARY'));
    fs.writeFileSync(manifestPath, JSON.stringify({ ...original, libraryId: f.lib.libraryId }));
    assert.throws(() => planImport(f.source, f.target), code('DUPLICATE_LIBRARY'));
    fs.writeFileSync(manifestPath, JSON.stringify(original)); fs.mkdirSync(path.join(f.source, 'attachments'));
    assert.throws(() => planImport(f.source, f.target), code('UNSUPPORTED_LIBRARY'));
    assert.equal(f.lib.list().length, 0);
  } finally { f.lib.close(); }
});

test('all native formats preserve BOM and line endings; deleted notes stay deleted', () => {
  const f = fixture();
  try {
    const source = new NoteLibrary(f.source), notes = [];
    for (const primaryFormat of ['text', 'markdown', 'html']) notes.push(source.create(randomUUID(), { primaryFormat, title: primaryFormat, body: '\ufeffFirst\r\nSecond\n' }).note);
    const deleted = source.trash(notes[0].id, notes[0].version, randomUUID()).note;
    source.close(); const before = tree(f.source);
    const plan = planImport(f.source, f.target); assert.equal(plan.preview.deleted, 1);
    executeImport(plan); f.lib.reloadImported();
    for (const note of notes) assert.equal(f.lib.read(note.id).body, note.body);
    assert.equal(f.lib.read(deleted.id).deletedAt, deleted.deletedAt);
    assert.equal(f.lib.list().some(note => note.id === deleted.id), false);
    assert.deepEqual(tree(f.source), before);
  } finally { f.lib.close(); }
});

test('source or target changes after preview invalidate confirmation before backup', () => {
  const f = fixture();
  try {
    let plan = planImport(f.source, f.target); f.lib.create(randomUUID());
    assert.throws(() => executeImport(plan), code('VERSION_CONFLICT'));
    plan = planImport(f.source, f.target); const source = new NoteLibrary(f.source); edit(source, f.note, 'Changed'); source.close();
    assert.throws(() => executeImport(plan), code('VERSION_CONFLICT'));
    assert.equal(fs.existsSync(f.target + '.import-backups'), false);
  } finally { f.lib.close(); }
});

for (const stage of ['journal', 'note', 'organization', 'manifest']) test(`rollback after ${stage} restores target and leaves source unchanged`, () => {
  const f = fixture();
  try {
    const original = f.lib.create(randomUUID()).note, sourceBefore = tree(f.source), manifestBefore = fs.readFileSync(path.join(f.target, 'library.json'), 'utf8');
    assert.throws(() => executeImport(planImport(f.source, f.target), step => { if (step === stage) throw Error('injected'); }), /injected/);
    f.lib.reloadImported(); assert.deepEqual(f.lib.list().map(n => n.id), [original.id]); assert.deepEqual(f.lib.read(original.id), original);
    assert.equal(fs.readFileSync(path.join(f.target, 'library.json'), 'utf8'), manifestBefore); assert.deepEqual(tree(f.source), sourceBefore);
    assert.equal(fs.existsSync(path.join(f.target, 'import-transaction.json')), false);
    assert.equal(fs.readdirSync(path.join(f.target, 'recovery')).some(name => name.startsWith('stage-import-')), false);
    assert.equal(fs.readdirSync(f.target + '.import-backups').length, 1);
  } finally { f.lib.close(); }
});

test('process interruption rolls back on next open and permits a clean retry', () => {
  const f = fixture(); f.lib.close();
  const before = tree(f.source);
  const child = spawnSync(process.execPath, [path.join(__dirname, 'import-crash.cjs'), f.source, f.target], { encoding: 'utf8', windowsHide: true });
  assert.equal(child.status, 71, child.stderr);
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.target, 'library.json'))).schemaVersion, 3);
  assert.equal(fs.existsSync(path.join(f.target, 'import-transaction.json')), true);
  const target = new NoteLibrary(f.target);
  try {
    assert.equal(target.list().length, 0); assert.equal(fs.existsSync(path.join(f.target, 'import-transaction.json')), false);
    assert.equal(executeImport(planImport(f.source, f.target)).imported, 1); target.reloadImported(); assert.equal(target.read(f.note.id).body, f.note.body); assert.deepEqual(tree(f.source), before);
  } finally { target.close(); }
});

test('corrupt history and linked source paths are rejected without copying', () => {
  const f = fixture();
  try {
    const link = path.join(f.base, 'source-link'); fs.symlinkSync(f.source, link, 'junction');
    assert.throws(() => planImport(link, f.target), code('INVALID_INPUT'));
    fs.writeFileSync(path.join(f.source, 'notes', f.note.id, 'revisions', f.note.revisionId, 'content.html'), 'tampered');
    assert.throws(() => planImport(f.source, f.target), code('INTEGRITY_CHECK_FAILED'));
    assert.equal(f.lib.list().length, 0);
  } finally { f.lib.close(); }
});

test('backup destination may not be inside the source library', () => {
  const f = fixture();
  try {
    const source = f.target + '.import-backups'; fs.renameSync(f.source, source); const before = tree(source);
    assert.throws(() => executeImport(planImport(source, f.target)), code('INVALID_INPUT'));
    assert.deepEqual(tree(source), before);
  } finally { f.lib.close(); }
});
