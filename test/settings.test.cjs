const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { SettingsStore } = require('../dist/runtime/core/settings');
const { effectiveAutosave } = require('../dist/runtime/shared/settings');
const empty = { locale: null, theme: null, autosave: null };
function fixture() { const root = path.resolve('output/settings-tests'); fs.mkdirSync(root, { recursive: true }); return fs.mkdtempSync(path.join(root, 'case-')); }
const code = expected => error => error.code === expected;
test('legacy settings are backed up before import and imported only once', () => {
  const root = fixture(); const legacy = { locale: 'de', theme: 'dark', autosave: JSON.stringify({ enabled: false, minutes: 10 }) };
  const store = new SettingsStore(root, legacy);
  assert.deepEqual(store.get().global, { locale: 'de', theme: 'dark', autosave: { enabled: false, minutes: 10 } });
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'settings-legacy.t03c-backup.json'), 'utf8')), legacy);
  store.update({ autosave: { enabled: true } });
  assert.equal(new SettingsStore(root, empty).get().global.autosave.enabled, true);
  assert.equal(new SettingsStore(root, empty).get().global.autosave.minutes, 10);
});
test('default inheritance, per-library isolation, restoration and restart preserve effective settings', () => {
  const root = fixture(); const store = new SettingsStore(root, empty); const a = randomUUID(), b = randomUUID();
  assert.deepEqual(effectiveAutosave(store.get(), a), { enabled: true, minutes: 5 });
  store.override(a, { enabled: false, minutes: 7 }); store.update({ autosave: { minutes: 10 } });
  assert.deepEqual(effectiveAutosave(store.get(), a), { enabled: false, minutes: 7 });
  assert.deepEqual(effectiveAutosave(store.get(), b), { enabled: true, minutes: 10 });
  const reopened = new SettingsStore(root, empty); assert.deepEqual(reopened.get(), store.get());
  reopened.override(a, null); assert.deepEqual(effectiveAutosave(reopened.get(), a), { enabled: true, minutes: 10 });
});
test('partial writes preserve other settings and returned snapshots cannot mutate storage', () => {
  const store = new SettingsStore(fixture(), empty);
  store.update({ autosave: { minutes: 60 } }); store.update({ autosave: { enabled: false } }); store.update({ theme: 'light' }); store.update({ locale: 'en' });
  assert.deepEqual(store.get().global, { locale: 'en', theme: 'light', autosave: { enabled: false, minutes: 60 } });
  const state = store.get(); state.global.autosave.minutes = 1; assert.equal(store.get().global.autosave.minutes, 60);
});
test('invalid input and foreign fields never change stored settings', () => {
  const store = new SettingsStore(fixture(), empty); const before = store.get();
  for (const value of [null, [], {}, { theme: 'remote' }, { locale: 'xx' }, { secret: 'not allowed' }, { autosave: { enabled: 1 } }, { autosave: { minutes: 0 } }, { autosave: { minutes: 61 } }, { autosave: { minutes: 1.5 } }, { autosave: { minutes: null } }, { autosave: { minutes: '5' } }, { autosave: { body: 'not allowed' } }]) assert.throws(() => store.update(value), code('INVALID_INPUT'));
  assert.throws(() => store.override('__proto__', { enabled: true, minutes: 5 }), code('INVALID_INPUT'));
  assert.throws(() => store.override(randomUUID(), { enabled: true }), code('INVALID_INPUT')); assert.deepEqual(store.get(), before);
});
test('failed writes retain previous runtime and disk values and preserve import backup', () => {
  const root = fixture(); let fail = false; const store = new SettingsStore(root, empty, () => { if (fail) throw Error('Fixture'); });
  const before = fs.readFileSync(path.join(root, 'settings.json'), 'utf8'); fail = true;
  assert.throws(() => store.update({ theme: 'dark' }), code('WRITE_FAILED'));
  assert.throws(() => store.override(randomUUID(), { enabled: false, minutes: 2 }), code('WRITE_FAILED'));
  assert.equal(JSON.stringify(store.get()), before); assert.equal(fs.readFileSync(path.join(root, 'settings.json'), 'utf8'), before);
  const first = fixture(); assert.throws(() => new SettingsStore(first, empty, () => { throw Error('Fixture'); }), code('WRITE_FAILED'));
  assert.ok(fs.existsSync(path.join(first, 'settings-legacy.t03c-backup.json'))); assert.equal(fs.existsSync(path.join(first, 'settings.json')), false);
});
test('corrupt or unsupported configuration and malformed legacy settings are never silently overwritten', () => {
  for (const text of ['broken', JSON.stringify({ schemaVersion: 999 })]) {
    const root = fixture(); fs.writeFileSync(path.join(root, 'settings.json'), text);
    assert.throws(() => new SettingsStore(root, empty), code('REGISTRY_INVALID')); assert.equal(fs.readFileSync(path.join(root, 'settings.json'), 'utf8'), text);
  }
  const root = fixture(); const legacy = { ...empty, autosave: 'broken' };
  assert.throws(() => new SettingsStore(root, legacy), code('INVALID_INPUT')); assert.equal(fs.existsSync(path.join(root, 'settings.json')), false);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'settings-legacy.t03c-backup.json'), 'utf8')), legacy);
});
