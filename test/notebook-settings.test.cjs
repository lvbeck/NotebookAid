const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), { randomUUID } = require('node:crypto');
const { NoteLibrary } = require('../dist/runtime/core/library');
const { LibraryRegistry } = require('../dist/runtime/core/registry');
const { SettingsStore } = require('../dist/runtime/core/settings');
const { BackupStore, createBackup, restoreBackup } = require('../dist/runtime/core/backups');
const { readNotebookSettings } = require('../dist/runtime/core/notebook-settings');
const legacy = { locale: null, theme: null, autosave: null };
function fixture(t) { fs.mkdirSync('output/notebook-settings-tests', { recursive: true }); const root = fs.mkdtempSync(path.resolve('output/notebook-settings-tests/case-')); t.after(() => fs.rmSync(root, { recursive: true, force: true })); return root; }

test('legacy per-notebook preferences migrate once without changing original local configuration', t => {
  const root = fixture(t), book = path.join(root, 'old-book'), data = path.join(root, 'device'); fs.mkdirSync(data);
  new NoteLibrary(book).close(); const settings = new SettingsStore(data, legacy), backups = new BackupStore(data);
  const registry = new LibraryRegistry(data, book, undefined, undefined, entry => ({ autosave: settings.get().libraries[entry.id] ?? null, dailyBackup: backups.state().policies[entry.id]?.enabled ?? false }));
  try {
    const id = registry.state().entries[0].id;
    settings.override(id, { enabled: false, minutes: 7 }); backups.update(id, path.join(root, 'local-backups'), true);
    const oldSettings = fs.readFileSync(path.join(data, 'settings.json')), oldBackups = fs.readFileSync(path.join(data, 'backups.json'));
    registry.get(); const value = registry.notebookSettings(id);
    assert.deepEqual(value.autosave, { enabled: false, minutes: 7 }); assert.equal(value.dailyBackup, true);
    assert.deepEqual(fs.readFileSync(path.join(data, 'settings.json')), oldSettings); assert.deepEqual(fs.readFileSync(path.join(data, 'backups.json')), oldBackups);
    registry.updateNotebookSettings(id, { autosave: null }); registry.close(); registry.get();
    assert.equal(registry.notebookSettings(id).autosave, null);
    assert.deepEqual(settings.get().libraries[id], { enabled: false, minutes: 7 });
    const text = fs.readFileSync(path.join(book, 'notebook-settings.json'), 'utf8');
    assert.ok(!text.includes('local-backups')); assert.ok(!text.includes(data.replaceAll('\\', '\\\\')));
  } finally { registry.close(); }
});

test('copied notebooks carry name, autosave, backup preference, folders and tags across independent device registries', t => {
  const root = fixture(t), a = path.join(root, 'device-a'), b = path.join(root, 'device-b'); fs.mkdirSync(a); fs.mkdirSync(b);
  const first = new LibraryRegistry(a, path.join(root, 'source'));
  let second;
  try {
    const library = first.get(), id = first.state().entries[0].id, folder = randomUUID(), tag = randomUUID();
    first.rename(id, 'Portable notebook'); first.updateNotebookSettings(id, { autosave: { enabled: true, minutes: 9 }, dailyBackup: true });
    library.editOrganization({ kind: 'folder', id: folder, name: 'Work', parentId: null, expectedVersion: 0 });
    library.editOrganization({ kind: 'tag', id: tag, name: 'Important', color: '#7755aa', expectedVersion: 1 });
    const source = library.path; first.close(); fs.cpSync(source, path.join(root, 'copied'), { recursive: true });
    second = new LibraryRegistry(b, path.join(root, 'unrelated'));
    second.add(path.join(root, 'copied'), 'existing'); const entry = second.state().entries.find(item => item.path === path.join(root, 'copied'));
    assert.notEqual(entry.id, id); assert.equal(entry.name, 'Portable notebook'); second.activate(entry.id);
    assert.deepEqual(second.portableSettings()[entry.id].autosave, { enabled: true, minutes: 9 });
    assert.equal(second.get().organization().folders[0].id, folder); assert.equal(second.get().organization().tags[0].id, tag);
    const policy = new BackupStore(b).notebookState(second.portableSettings()).policies[entry.id];
    assert.equal(policy.enabled, true); assert.equal(policy.directory, null); assert.equal(policy.nextAt, null);
    const other = new NoteLibrary(path.join(root, 'independent'), undefined, 'create');
    try { assert.deepEqual(other.organization().folders, []); assert.deepEqual(other.organization().tags, []); assert.equal(other.notebookSettings().autosave, null); }
    finally { other.close(); }
  } finally { first.close(); second?.close(); }
});

test('settings survive verified backup/restore and reject damaged, foreign and linked files without overwriting them', t => {
  const root = fixture(t), book = path.join(root, 'book'), library = new NoteLibrary(book, undefined, 'create');
  try {
    library.updateNotebookSettings({ autosave: { enabled: true, minutes: 11 } });
    const backup = createBackup(book, path.join(root, 'backups')); restoreBackup(backup.path, path.join(root, 'restored'), library.libraryId);
    assert.equal(readNotebookSettings(path.join(root, 'restored'), library.libraryId).autosave.minutes, 11);
    const file = path.join(book, 'notebook-settings.json'), original = fs.readFileSync(file);
    fs.writeFileSync(file, '{broken'); assert.throws(() => library.updateNotebookSettings({ autosave: null }), e => e.code === 'INTEGRITY_CHECK_FAILED'); assert.equal(fs.readFileSync(file, 'utf8'), '{broken');
    const foreign = JSON.parse(original); foreign.libraryId = randomUUID(); fs.writeFileSync(file, JSON.stringify(foreign));
    assert.throws(() => library.notebookSettings(), e => e.code === 'LIBRARY_ID_MISMATCH');
    fs.writeFileSync(file, original);
    assert.throws(() => library.updateNotebookSettings({ directory: 'private-path' }), e => e.code === 'INVALID_INPUT');
    assert.deepEqual(fs.readFileSync(file), original);
    const foreignDirectory = path.join(root, 'external'); fs.mkdirSync(foreignDirectory);
    const foreignFile = path.join(foreignDirectory, 'external.json'); fs.writeFileSync(foreignFile, original); fs.unlinkSync(file);
    fs.symlinkSync(process.platform === 'win32' ? foreignDirectory : foreignFile, file, process.platform === 'win32' ? 'junction' : 'file');
    assert.throws(() => library.notebookSettings(), e => e.code === 'INTEGRITY_CHECK_FAILED'); assert.deepEqual(fs.readFileSync(foreignFile), original);
  } finally { library.close(); }
});

test('failed settings writes and concurrent writers preserve the durable settings', t => {
  const root = fixture(t), book = path.join(root, 'book'); new NoteLibrary(book, undefined, 'create').close();
  const library = new NoteLibrary(book, stage => { if (stage === 'notebook-settings') throw Error('Simulated failure'); }, 'existing');
  try {
    const before = fs.readFileSync(path.join(book, 'notebook-settings.json'));
    assert.throws(() => library.updateNotebookSettings({ name: 'Unsaved' }), e => e.code === 'WRITE_FAILED');
    assert.deepEqual(fs.readFileSync(path.join(book, 'notebook-settings.json')), before);
    assert.throws(() => new NoteLibrary(book, undefined, 'existing'), e => e.code === 'LIBRARY_IN_USE');
  } finally { library.close(); }
});

test('notebook backup preference reconciles only with a device-local destination', t => {
  const root = fixture(t), id = randomUUID(), store = new BackupStore(root), directory = path.join(root, 'backups');
  assert.deepEqual(store.notebookState({ [id]: { dailyBackup: true } }).policies[id], { directory: null, lastAt: null, nextAt: null, enabled: true });
  assert.equal(fs.existsSync(path.join(root, 'backups.json')), false);
  store.update(id, directory, false);
  assert.equal(store.notebookState({ [id]: { dailyBackup: true } }).policies[id].enabled, true);
  assert.ok(store.state().policies[id].nextAt > Date.now());
  store.notebookState({ [id]: { dailyBackup: false } });
  assert.equal(store.state().policies[id].enabled, false); assert.equal(store.state().policies[id].nextAt, null);
  assert.equal(store.state().policies[id].directory, directory);
});

test('failed notebook rename preserves the canonical name and registry cache', t => {
  const root = fixture(t), book = path.join(root, 'book'), data = path.join(root, 'device'); fs.mkdirSync(data);
  let failing = false;
  const registry = new LibraryRegistry(data, book, stage => { if (failing && stage === 'notebook-settings') throw Error('Simulated failure'); });
  try {
    registry.get(); const id = registry.state().entries[0].id; registry.rename(id, 'Before');
    const cache = fs.readFileSync(path.join(data, 'libraries.json')), canonical = fs.readFileSync(path.join(book, 'notebook-settings.json'));
    failing = true; assert.throws(() => registry.rename(id, 'After'), e => e.code === 'WRITE_FAILED');
    assert.deepEqual(fs.readFileSync(path.join(data, 'libraries.json')), cache); assert.deepEqual(fs.readFileSync(path.join(book, 'notebook-settings.json')), canonical);
    assert.equal(registry.currentName(), 'Before');
  } finally { registry.close(); }
});
