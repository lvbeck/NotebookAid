const { test } = require('node:test');
const assert = require('node:assert/strict');
const { translations, regionalLocale } = require('../dist/runtime/src/app/i18n.js');
test('Every language has a complete independent dictionary', () => {
  const keys = Object.keys(translations.en).sort();
  for (const locale of Object.keys(translations)) {
    assert.deepEqual(Object.keys(translations[locale]).sort(), keys, locale);
    for (const value of Object.values(translations[locale])) assert.ok(typeof value === 'string' && value.trim());
  }
  assert.equal(Object.keys(translations).length, 10);
});
test('Traditional Chinese preferences use Hong Kong conventions', () => {
  assert.equal(regionalLocale('zh-TW'), 'zh-HK');
  assert.equal(translations['zh-TW'].save, '儲存');
  assert.equal(translations['zh-TW'].settings, '設定');
  assert.equal(translations['zh-TW'].folders, '資料夾');
});
