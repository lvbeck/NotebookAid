const { test } = require('node:test');
const assert = require('node:assert/strict');
const { notebookSkinColors, notebookSkinNames, notebookSkinIndex, skinTokens } = require('../dist/runtime/shared/notebook-skin.js');
const luminance = hex => hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0);
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);

test('twenty notebook schemes preserve readable text and the accepted blue accents', () => {
  assert.equal(notebookSkinColors.length, 10);
  for (let index = 0; index < 10; index++) for (const dark of [false, true]) {
    const t = skinTokens(index, dark);
    assert.ok(contrast(t.accent, t.on) >= 4.5);
    for (const surface of ['surface', 'bg', 'sidebar', 'soft']) {
      assert.ok(contrast(t.text, t[surface]) >= 4.5, `${index}/${dark}/${surface}`);
    }
    assert.equal(notebookSkinIndex(notebookSkinColors[index].toUpperCase()), index);
  }
  assert.equal(skinTokens(3, false).accent, '#456987');
  assert.equal(skinTokens(3, true).accent, '#aec4d5');
  assert.equal(skinTokens(0, false).accent, '#7460c9');
  assert.equal(skinTokens(0, true).accent, '#b4a1f5');
});

test('legacy blue and custom colors resolve without changing stored values', () => {
  assert.equal(notebookSkinIndex('#92A8BA'), 3);
  assert.equal(notebookSkinIndex('#78B9E8'), 3);
  for (const value of [undefined, '', 'invalid', '#fff']) assert.equal(notebookSkinIndex(value), 0);
  assert.equal(notebookSkinIndex('#888888'), 5);
  assert.equal(notebookSkinIndex('#0088ff'), 3);
});

test('all ten languages provide ten distinct skin names', () => {
  assert.equal(Object.keys(notebookSkinNames).length, 10);
  for (const values of Object.values(notebookSkinNames)) {
    assert.equal(values.length, 10);
    assert.equal(new Set(values).size, 10);
    assert.ok(values.every(value => value.trim().length > 0));
  }
  assert.equal(notebookSkinNames['zh-CN'][3], '雾蓝');
});
