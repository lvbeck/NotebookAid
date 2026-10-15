const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { LibraryRegistry } = require('../dist/runtime/core/registry');
const { NoteLibrary } = require('../dist/runtime/core/library');
const { latestNotebookSchemaVersion } = require('../dist/runtime/shared/library');
function fixture() { const root = path.resolve('output/registry-tests'); fs.mkdirSync(root, { recursive: true }); const data = fs.mkdtempSync(path.join(root, 'case-')); return { data, initial: path.join(data, 'initial') }; }
const code = expected => error => error.code === expected;

test('registry imports and backs up legacy location, retains names, paths and active library across restart', () => {
  const { data, initial } = fixture(); const original = new NoteLibrary(initial); const libraryId = original.libraryId; original.close();
  const text = JSON.stringify({ path: initial }); fs.writeFileSync(path.join(data, 'library-location.json'), text);
  let registry = new LibraryRegistry(data, path.join(data, 'unused'));
  try {
    assert.equal(registry.get().libraryId, libraryId);
    assert.equal(fs.readFileSync(path.join(data, 'library-location.json.t03b-backup'), 'utf8'), text);
    const first = registry.state().entries[0]; registry.rename(first.id, '工作笔记');
    registry.add(path.join(data, 'second'), 'create'); const second = registry.state().entries[1]; registry.activate(second.id);
    registry.close(); registry = new LibraryRegistry(data, initial);
    assert.equal(registry.get().libraryId, second.libraryId); assert.equal(registry.state().entries[0].name, '工作笔记');
    assert.equal(fs.readFileSync(path.join(data, 'library-location.json'), 'utf8'), text);
  } finally { registry.close(); }
});

test('missing legacy library and missing last-opened library are never recreated', () => {
  const { data, initial } = fixture(); fs.writeFileSync(path.join(data, 'library-location.json'), JSON.stringify({ path: initial }));
  let registry = new LibraryRegistry(data, initial);
  try { assert.throws(() => registry.get(), code('NOT_FOUND_OR_UNAVAILABLE')); assert.equal(fs.existsSync(initial), false); assert.equal(registry.state().entries.length, 1); }
  finally { registry.close(); }
  registry = new LibraryRegistry(data, initial);
  try { assert.throws(() => registry.get(), code('NOT_FOUND_OR_UNAVAILABLE')); assert.equal(fs.existsSync(initial), false); }
  finally { registry.close(); }
});

test('switch failure preserves old library, sessions and registry, releasing target lock', () => {
  const { data, initial } = fixture(); let fail = false;
  const registry = new LibraryRegistry(data, initial, stage => { if (fail && stage === 'registry') throw Error('Fixture'); });
  try {
    const old = registry.get(); const note = old.create(randomUUID()).note; const session = old.begin(note.id, 'test');
    registry.add(path.join(data, 'second'), 'create'); const second = registry.state().entries[1];
    const before = fs.readFileSync(path.join(data, 'libraries.json'), 'utf8');
    fail = true; assert.throws(() => registry.activate(second.id), code('WRITE_FAILED')); fail = false;
    assert.equal(registry.get(), old); assert.equal(fs.readFileSync(path.join(data, 'libraries.json'), 'utf8'), before);
    old.save({ noteId: note.id, token: session.token, generation: session.generation, expectedVersion: note.version, operationId: randomUUID(), title: 'Retained', body: 'Draft' }, 'test');
    const held = new NoteLibrary(second.path, undefined, 'existing');
    try { assert.throws(() => registry.activate(second.id), code('LIBRARY_IN_USE')); assert.equal(registry.get(), old); assert.equal(registry.state().entries[1].availability, 'LIBRARY_IN_USE'); } finally { held.close(); }
    registry.activate(second.id); assert.notEqual(registry.get(), old);
  } finally { registry.close(); }
});

test('registration rejects case duplicates, copied IDs, nonempty folders, unsupported formats and linked manifests', () => {
  const { data, initial } = fixture(); const registry = new LibraryRegistry(data, initial);
  try {
    registry.get();
    assert.throws(() => registry.add(initial.toUpperCase(), 'existing'), code('DUPLICATE_LIBRARY'));
    const copy = path.join(data, 'copy'); fs.mkdirSync(copy); fs.copyFileSync(path.join(initial, 'library.json'), path.join(copy, 'library.json'));
    assert.throws(() => registry.add(copy, 'existing'), code('DUPLICATE_LIBRARY'));
    const ordinary = path.join(data, 'ordinary'); fs.mkdirSync(ordinary); fs.writeFileSync(path.join(ordinary, 'keep.txt'), 'retain');
    assert.throws(() => registry.add(ordinary, 'create'), code('INVALID_INPUT')); assert.equal(fs.readFileSync(path.join(ordinary, 'keep.txt'), 'utf8'), 'retain');
    assert.throws(() => registry.add(ordinary, 'existing'), code('NOT_FOUND_OR_UNAVAILABLE'));
    fs.writeFileSync(path.join(ordinary, 'library.json'), JSON.stringify({ schemaVersion: 999, libraryId: randomUUID() }));
    assert.throws(() => registry.add(ordinary, 'existing'), code('UNSUPPORTED_LIBRARY'));
    const linked = path.join(data, 'linked'); fs.symlinkSync(initial, linked, 'junction'); assert.throws(() => registry.add(linked, 'existing'), code('INVALID_INPUT'));
  } finally { registry.close(); }
});

test('relocation checks identity and removal leaves library files intact', () => {
  const { data, initial } = fixture(); const registry = new LibraryRegistry(data, initial);
  try {
    registry.get(); const current = registry.state().entries[0];
    assert.throws(() => registry.remove(current.id), code('CURRENT_LIBRARY'));
    registry.add(path.join(data, 'second'), 'create'); const second = registry.state().entries[1];
    const moved = path.join(data, 'moved'); fs.renameSync(second.path, moved);
    assert.throws(() => registry.activate(second.id), code('NOT_FOUND_OR_UNAVAILABLE'));
    assert.throws(() => registry.relocate(second.id, initial), code('LIBRARY_ID_MISMATCH'));
    registry.relocate(second.id, moved); registry.remove(second.id);
    assert.ok(fs.existsSync(path.join(moved, 'library.json'))); assert.equal(registry.state().entries.length, 1);
    assert.equal(fs.existsSync(second.path), false);
  } finally { registry.close(); }
});

test('corrupt registry is retained without fallback and mismatched replacement library is rejected', () => {
  const { data, initial } = fixture(); const registry = new LibraryRegistry(data, initial); registry.get(); registry.close();
  const manifestPath = path.join(initial, 'library.json'); const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); manifest.libraryId = randomUUID(); fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  const reopened = new LibraryRegistry(data, initial); try { assert.throws(() => reopened.get(), code('LIBRARY_ID_MISMATCH')); } finally { reopened.close(); }
  const file = path.join(data, 'libraries.json'); fs.writeFileSync(file, 'corrupt fixture');
  assert.throws(() => new LibraryRegistry(data, initial), code('REGISTRY_INVALID')); assert.equal(fs.readFileSync(file, 'utf8'), 'corrupt fixture');
});

test('Registry reports each notebook schema from its manifest, with unknown for unavailable entries', () => {
  const { data, initial } = fixture(); const legacy = new NoteLibrary(initial); legacy.close();
  const registry = new LibraryRegistry(data, initial);
  try {
    registry.get();assert.equal(registry.state().entries[0].schemaVersion,1);
    const other=path.join(data,'other');registry.add(other,'create');
    const file=path.join(other,'library.json'), manifest=JSON.parse(fs.readFileSync(file));
    fs.writeFileSync(file,JSON.stringify({...manifest,schemaVersion:4}));
    assert.equal(registry.state().entries[1].schemaVersion,4);
    fs.renameSync(file,file+'.missing');assert.equal(registry.state().entries[1].schemaVersion,null);
    assert.equal(registry.state().entries[0].schemaVersion,1);
  } finally {registry.close();}
});

test('default and explicitly created notebooks start at the latest schema without upgrading existing notebooks', () => {
  const { data, initial } = fixture(); let registry = new LibraryRegistry(data, initial);
  const manifest = directory => fs.readFileSync(path.join(directory, 'library.json'), 'utf8');
  const first = registry.state().entries[0];
  try {
    assert.equal(first.schemaVersion, latestNotebookSchemaVersion);
    assert.equal(registry.get().libraryId, first.libraryId);
    assert.equal(fs.existsSync(initial + '.schema-backups'), false);
    registry.add(path.join(data, 'new-notebook'), 'create');
    const second = registry.state().entries[1];
    assert.equal(second.schemaVersion, latestNotebookSchemaVersion);
    assert.equal(fs.existsSync(second.path + '.schema-backups'), false);
    registry.activate(second.id);
    const note = registry.get().create(randomUUID(), { title: 'New notebook', body: 'Preserved content', primaryFormat: 'markdown' }).note;
    const legacyPath = path.join(data, 'legacy'); const legacy = new NoteLibrary(legacyPath); legacy.close();
    const before = manifest(legacyPath);
    registry.add(legacyPath, 'existing');
    const old = registry.state().entries[2]; registry.activate(old.id);
    assert.equal(registry.state().entries[2].schemaVersion, 1);
    assert.equal(manifest(legacyPath), before);
    registry.close(); registry = new LibraryRegistry(data, initial);
    registry.get(); assert.equal(manifest(legacyPath), before);
    registry.activate(second.id); assert.deepEqual(registry.get().read(note.id), note);
    assert.equal(registry.state().entries[0].schemaVersion, latestNotebookSchemaVersion);
  } finally { registry.close(); }
});
