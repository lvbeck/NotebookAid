const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { SettingsStore } = require('../dist/runtime/core/settings');
const { zoomPercentages, validZoom, nextZoom } = require('../dist/runtime/shared/ui');
const { uiTranslations, errorText } = require('../dist/runtime/src/app/ui-i18n');

test('zoom is bounded, persistent, backward compatible and invalid input leaves settings intact', () => {
  fs.mkdirSync('output/ui-tests', { recursive: true });
  const root = fs.mkdtempSync(path.resolve('output/ui-tests/case-'));
  const store = new SettingsStore(root, { locale: null, theme: null, autosave: null });
  assert.equal(store.get().global.zoomPercent ?? 100, 100);
  const before = store.get();
  for (const value of [0, 74, 76, 201, Infinity, NaN, '125', null, {}, 125.5]) {
    assert.equal(validZoom(value), false);
    assert.throws(() => store.update({ zoomPercent: value }), error => error.code === 'INVALID_INPUT');
    assert.deepEqual(store.get(), before);
  }
  for (const percent of zoomPercentages) {
    store.update({ zoomPercent: percent });
    assert.equal(new SettingsStore(root, { locale: null, theme: null, autosave: null }).get().global.zoomPercent, percent);
  }
  assert.equal(nextZoom(75, -1), 75); assert.equal(nextZoom(200, 1), 200);
  assert.equal(nextZoom(100, 1), 110); assert.equal(nextZoom(125, -1), 110);
  assert.equal(nextZoom(200, 0), 100);
});

test('interface messages are complete in ten languages and never disclose unknown exception payloads', () => {
  const keys = Object.keys(uiTranslations.en).sort();
  assert.equal(Object.keys(uiTranslations).length, 10);
  for (const [locale, entries] of Object.entries(uiTranslations)) {
    assert.deepEqual(Object.keys(entries).sort(), keys);
    for (const value of Object.values(entries)) assert.ok(typeof value === 'string' && value.trim(), locale);
    for (const code of ['INVALID_INPUT','WRITE_FAILED','VERSION_CONFLICT','NOTEBOOK_LOCKED','COMMIT_STATUS_UNKNOWN','INTEGRITY_CHECK_FAILED']) assert.ok(errorText(locale, code).includes(code));
    for (const unknown of ['SECRET TOKEN IN ERROR', '__proto__', 'constructor', 'toString']) assert.equal(errorText(locale, unknown), entries.unexpected);
  }
});
