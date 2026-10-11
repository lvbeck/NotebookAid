const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { NoteLibrary } = require('../dist/runtime/core/library.js');
const root = () => { fs.mkdirSync('output/organization-tests', { recursive: true }); return fs.mkdtempSync(path.resolve('output/organization-tests/case-')); };
const invalid = error => error.code === 'INVALID_INPUT';
const folder = (lib, name, parentId = null, id = randomUUID()) => { lib.editOrganization({ kind: 'folder', id, name, parentId, expectedVersion: lib.organization().version }); return id; };
const tag = (lib, name, id = randomUUID()) => { lib.editOrganization({ kind: 'tag', id, name, color: '#abcdef', expectedVersion: lib.organization().version }); return id; };
const placement = (lib, id, values = {}) => { const session = lib.begin(id, 'test'); return { noteId: id, token: session.token, generation: session.generation, expectedVersion: session.note.version, operationId: randomUUID(), folderId: session.note.folderId, tagIds: session.note.tagIds, pinned: session.note.pinned, ...values }; };

test('folder order survives restart and rename, rejects incomplete lists and stale writes', () => {
  const directory = root(); let fail = false;
  let lib = new NoteLibrary(directory, stage => { if (fail && stage === 'organization') throw Error('injected'); });
  try {
    const a = folder(lib, 'A'), b = folder(lib, 'B'), child = folder(lib, 'Child', a);
    const reorder = ids => lib.editOrganization({ kind: 'folder-order', ids, expectedVersion: lib.organization().version });
    const before = lib.organization();
    for (const ids of [[a], [a, a, b], [a, b, randomUUID()]]) assert.throws(() => reorder(ids), invalid);
    assert.deepEqual(lib.organization(), before);
    fail = true; assert.throws(() => reorder([b, a, child])); assert.deepEqual(lib.organization(), before); fail = false;
    reorder([b, a, child]);
    assert.throws(() => lib.editOrganization({ kind: 'folder-order', ids: [a, b, child], expectedVersion: before.version }), e => e.code === 'VERSION_CONFLICT');
    folder(lib, 'Renamed', null, b);
    assert.equal(lib.organization().folders.find(f => f.id === b).order, 0);
    assert.equal(lib.organization().folders.find(f => f.id === child).parentId, a);
    const saved = lib.organization(); lib.close(); lib = new NoteLibrary(directory);
    assert.deepEqual(lib.organization(), saved);
  } finally { lib.close(); }
});

test('folder names, hierarchy cycles/depth, optimistic version and atomic failure', () => {
  let fail = false; const directory = root(); let lib = new NoteLibrary(directory, stage => { if (fail && stage === 'organization') throw Error('injected'); });
  try {
    const a = folder(lib, ' Projects '); const b = folder(lib, 'Child', a);
    assert.equal(lib.organization().folders[0].name, 'Projects');
    assert.throws(() => folder(lib, 'PROJECTS'), invalid);
    folder(lib, 'Projects', b);
    assert.throws(() => folder(lib, 'Projects', b, a), invalid);
    assert.throws(() => folder(lib, 'Child', b, b), invalid);
    assert.throws(() => folder(lib, 'Missing parent', randomUUID()), invalid);
    assert.throws(() => lib.editOrganization({ kind: 'folder', id: a, name: 'New', expectedVersion: 0 }), e => e.code === 'VERSION_CONFLICT');
    let parent = null;
    for (let i = 0; i < 16; i++) parent = folder(lib, `Depth ${i}`, parent);
    assert.throws(() => folder(lib, 'Too deep', parent), invalid);
    const before = lib.organization(); fail = true;
    assert.throws(() => folder(lib, 'Failed'));
    assert.deepEqual(lib.organization(), before);
    lib.close(); lib = new NoteLibrary(directory); assert.deepEqual(lib.organization(), before);
    assert.equal(JSON.parse(fs.readFileSync(path.join(directory, 'library.json'))).schemaVersion, 2);
  } finally { lib.close(); }
});

test('placement preserves body, ID and content version; replay, locks, failed writes and restart', () => {
  const directory = root(); let fail = false; let lib = new NoteLibrary(directory, stage => { if (fail && stage === 'journal') throw Error('injected'); });
  try {
    const f = folder(lib, '资料'); const t = tag(lib, 'Work');
    assert.throws(() => tag(lib, 'work'), invalid);
    const note = lib.create(randomUUID(), { primaryFormat: 'markdown', title: '中文 TEST', body: '# Durable body' }).note;
    const request = placement(lib, note.id, { folderId: f, tagIds: [t], pinned: true });
    assert.throws(() => lib.place(request, 'other'), e => e.code === 'SESSION_EXPIRED');
    const saved = lib.place(request, 'test'); assert.deepEqual(lib.place(request, 'test'), saved);
    assert.equal(saved.note.id, note.id); assert.equal(saved.note.body, note.body); assert.equal(saved.note.contentVersion, 1); assert.equal(saved.note.version, 2);
    const session = lib.begin(note.id, 'test');
    const edited = lib.save({ ...request, token: session.token, generation: session.generation, operationId: randomUUID(), expectedVersion: 2, title: 'Renamed', body: 'New text' }, 'test');
    assert.equal(edited.note.folderId, f); assert.deepEqual(edited.note.tagIds, [t]); assert.equal(edited.note.pinned, true);
    fail = true; assert.throws(() => lib.place(placement(lib, note.id, { pinned: false }), 'test'));
    assert.equal(lib.read(note.id).pinned, true); fail = false;
    folder(lib, 'Renamed folder', null, f); tag(lib, 'Renamed tag', t);
    lib.rebuild(); assert.equal(lib.query({ text: 'new TEXT', tagIds: [t], folderId: f }).total, 1);
    lib.close(); lib = new NoteLibrary(directory);
    assert.equal(lib.query({ view: 'recent' }).notes[0].id, note.id);
    assert.equal(lib.read(note.id).contentVersion, 2); assert.equal(lib.read(note.id).folderId, f);
    assert.equal(lib.organization().tags[0].name, 'Renamed tag');
    assert.throws(() => lib.place(placement(lib, note.id, { tagIds: [randomUUID()] }), 'test'), invalid);
  } finally { lib.close(); }
});

test('search AND terms/tags, descendants, pinned ordering, page boundaries and rebuild', () => {
  const lib = new NoteLibrary(root());
  try {
    const parent = folder(lib, 'Parent'), child = folder(lib, 'Child', parent), first = tag(lib, 'One'), second = tag(lib, 'Two');
    for (let i = 0; i < 65; i++) {
      const note = lib.create(randomUUID(), { primaryFormat: 'text', title: `笔记 ${i}`, body: `HELLO 世界 ${i}`, folderId: child }).note;
      if (i === 12) lib.place(placement(lib, note.id, { pinned: true, tagIds: [first, second] }), 'test');
    }
    assert.equal(lib.query({ folderId: parent, text: 'hello 世界' }).total, 65);
    assert.equal(lib.query({ folderId: null }).total, 0);
    const pages = [0, 30, 60].map(offset => lib.query({ limit: 30, offset }));
    assert.deepEqual(pages.map(page => page.notes.length), [30, 30, 5]);
    assert.equal(new Set(pages.flatMap(page => page.notes.map(note => note.id))).size, 65);
    assert.equal(pages[0].notes[0].pinned, true);
    assert.equal(lib.query({ tagIds: [first, second], text: '笔记 hello' }).total, 1);
    assert.equal(lib.query({ text: 'absent' }).total, 0);
    assert.equal(lib.query({ view: 'pinned' }).total, 1);
    lib.rebuild(); assert.equal(lib.query({ folderId: parent, tagIds: [first, second] }).total, 1);
    for (const query of [{ limit: 999 }, { offset: -1 }, { tagIds: ['x'] }, { folderId: '__proto__' }, { text: [] }, { view: 'trash' }]) assert.throws(() => lib.query(query), invalid);
  } finally { lib.close(); }
});

test('old libraries stay schema 1 until organization writes; damaged organization is not overwritten', () => {
  const directory = root(); let lib = new NoteLibrary(directory);
  const id = lib.create(randomUUID()).note.id;
  lib.begin(id, 'test'); lib.close();
  assert.equal(JSON.parse(fs.readFileSync(path.join(directory, 'library.json'))).schemaVersion, 1);
  lib = new NoteLibrary(directory); assert.equal(lib.read(id).folderId, null); lib.close();
  fs.writeFileSync(path.join(directory, 'organization.json'), '{broken');
  assert.throws(() => new NoteLibrary(directory));
  assert.equal(fs.readFileSync(path.join(directory, 'organization.json'), 'utf8'), '{broken');
});

test('recent retention and same-millisecond order survive reopen without creating revisions', () => {
  const directory = root(); let lib = new NoteLibrary(directory);
  try {
    const ids = [];
    for (let i = 0; i < 103; i++) { const id = lib.create(randomUUID()).note.id; ids.push(id); lib.begin(id, 'test'); }
    assert.equal(lib.query({ view: 'recent', limit: 100 }).total, 100);
    assert.equal(lib.query({ view: 'recent' }).notes[0].id, ids[102]);
    assert.equal(lib.read(ids[102]).version, 1);
    lib.begin(ids[0], 'test'); assert.equal(lib.query({ view: 'recent' }).notes[0].id, ids[0]);
    lib.close(); lib = new NoteLibrary(directory);
    assert.equal(lib.query({ view: 'recent' }).notes[0].id, ids[0]);
    assert.equal(lib.read(ids[0]).version, 1);
    assert.equal(lib.query({ view: 'recent', limit: 100 }).notes.some(note => note.id === ids[3]), false);
  } finally { lib.close(); }
});
