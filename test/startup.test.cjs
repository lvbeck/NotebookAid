const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { randomUUID } = require('node:crypto');
const { NoteLibrary } = require('../dist/runtime/core/library.js');
function directory() { const base = path.resolve('output/startup-tests'); fs.mkdirSync(base, { recursive: true }); return fs.mkdtempSync(path.join(base, 'case-')); }

test('startup and paged lists read metadata only; explicit full-text search validates bodies on demand', () => {
  const root = directory(); let library = new NoteLibrary(root);
  for (let i = 0; i < 3; i++) library.create(randomUUID(), { primaryFormat: 'markdown', title: 'Synthetic ' + i, body: 'Body ' + i });
  library.close(); const original = fs.readFileSync; let bodies = 0;
  fs.readFileSync = function(file, ...args) { if (String(file).endsWith('content.md')) bodies++; return original.call(this, file, ...args); };
  const progress = [];
  try {
    library = new NoteLibrary(root, undefined, 'existing', undefined, value => progress.push(value));
    assert.equal(bodies, 0);
    const notes = library.list(); notes[0].tagIds.push(randomUUID()); notes[0].title = 'Mutation';
    assert.equal(library.list()[0].tagIds.length, 0); assert.notEqual(library.list()[0].title, 'Mutation');
    assert.equal(library.query({ text: '', limit: 1 }).total, 3); assert.equal(library.query({ offset: 1, limit: 1 }).notes.length, 1); assert.equal(bodies, 0);
    assert.equal(library.query({ text: 'Body 1' }).total, 1); assert.equal(bodies, 3);
    library.query({ text: 'Body 2' }); assert.equal(bodies, 3);
    assert.equal(progress.findLast(value => value.phase === 'notes').processed, 3);
    assert.ok(progress.some(value => value.phase === 'history'));
    assert.deepEqual(Object.keys(library.status().startup.phasesMs), ['prepare', 'recovery', 'catalogAndIndex', 'history']);
    assert.ok(library.status().startup.totalMs > 0);
    assert.ok(progress.every(value => !Object.hasOwn(value, 'title') && !Object.hasOwn(value, 'body')));
  } finally { fs.readFileSync = original; library.close(); }
});

test('resume chooses last opened rather than last modified and ignores deleted notes', () => {
  const root = directory(); let library = new NoteLibrary(root);
  try {
    const older = library.create(randomUUID(), { primaryFormat: 'text', title: 'Older', body: 'Older body' }).note;
    const newer = library.create(randomUUID(), { primaryFormat: 'text', title: 'Newer', body: 'Newer body' }).note;
    const session = library.begin(older.id, 'owner'); library.end(session.token, session.generation, 'owner');
    library.close(); library = new NoteLibrary(root);
    assert.equal(library.status().resumeNoteId, older.id);
    library.trash(older.id, older.version, randomUUID());
    assert.equal(library.status().resumeNoteId, undefined); assert.equal(library.list()[0].id, newer.id);
    library.restore(older.id, 2, randomUUID()); assert.equal(library.status().resumeNoteId, older.id);
    library.trash(older.id, 3, randomUUID()); library.purge(older.id, 4, randomUUID());
    assert.equal(library.status().resumeNoteId, undefined);
  } finally { library.close(); }
});

test('locked catalog and resume expose no encrypted title or body and rebuild detects corruption', async () => {
  const root = directory(); let library = new NoteLibrary(root);
  try {
    const note = library.create(randomUUID(), { primaryFormat: 'text', title: 'Private title', body: 'Private body' }).note;
    await library.securityCommand({ action: 'setup', password: 'Startup test password' }); library.protect(note.id, note.version, true);
    const session = library.begin(note.id, 'owner'); library.end(session.token, session.generation, 'owner');
    library.close(); library = new NoteLibrary(root);
    assert.deepEqual(library.list(), []); assert.equal(library.query().total, 0); assert.equal(library.status().resumeNoteId, undefined);
    await library.securityCommand({ action: 'unlock', credential: 'Startup test password' });
    assert.equal(library.list()[0].title, 'Private title'); assert.equal(library.status().resumeNoteId, note.id);
    library.lockSecurity(); assert.deepEqual(library.list(), []);
    await library.securityCommand({ action: 'unlock', credential: 'Startup test password' }); library.protect(note.id, note.version, false);
    const current = library.read(note.id); fs.writeFileSync(path.join(root, 'notes', note.id, 'revisions', current.revisionId, 'content.txt'), 'Tampered');
    library.rebuild(); assert.equal(library.list().length, 0); assert.ok(library.status().issues.includes('DAMAGED_NOTE:' + note.id));
  } finally { library.close(); }
});
