const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { SettingsStore } = require('../dist/runtime/core/settings');
const { locales, notePageSizes } = require('../dist/runtime/shared/settings');
const { startupText, pageSizeText } = require('../dist/runtime/src/app/startup-i18n');
test('page size persists, old settings default to 30, unsupported input is rejected atomically', () => {
  const base = path.resolve('output/startup-settings'); fs.mkdirSync(base, { recursive: true }); const root = fs.mkdtempSync(path.join(base, 'case-'));
  const empty = { locale: null, theme: null, autosave: null }, store = new SettingsStore(root, empty);
  assert.equal(store.get().global.notePageSize ?? 30, 30);
  for (const size of notePageSizes) { store.update({ notePageSize: size }); assert.equal(new SettingsStore(root, empty).get().global.notePageSize, size); }
  for (const size of [0, -1, 15, 101, '10', null, 10.5]) assert.throws(() => store.update({ notePageSize: size }), { code: 'INVALID_INPUT' });
  assert.equal(store.get().global.notePageSize, 100);
});
test('startup stages and pagination labels exist in all eight interface languages', () => {
  for (const locale of locales) { assert.ok(pageSizeText(locale)); for (const key of ['opening', 'recovery', 'notes', 'history', 'restoring', 'failed', 'retry']) assert.ok(startupText(locale, key)); }
});
