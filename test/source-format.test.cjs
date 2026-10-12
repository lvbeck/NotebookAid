const { test } = require('node:test');
const assert = require('node:assert/strict');
const { formatSource } = require('../dist/runtime/shared/source-format');
const { emptyDelta } = require('../dist/runtime/shared/delta-document');

test('Delta formatting is reversible and preserves string spaces and escapes', () => {
  const source = JSON.stringify({ format: 'NotebookAidDelta', version: 1, ops: [{ insert: '  a\n b " c\t\n' }] });
  const pretty = formatSource(source, 'delta', true);
  assert.ok(pretty.includes('\n  "ops"'));
  assert.equal(formatSource(pretty, 'delta', false), source);
  assert.throws(() => formatSource('{bad', 'delta', true));
  assert.throws(() => formatSource('{"ops":[]}', 'delta', false));
  assert.equal(formatSource(emptyDelta, 'delta', false), emptyDelta);
});

test('HTML formats block structure while retaining inline whitespace, links, code and comments', () => {
  const source = '<div><p>A <a href="https://example.org/?x=>" target="_blank">B</a> C</p><pre><code>  a\n b &lt;x&gt; </code></pre><!--keep--><p>D</p></div>';
  const pretty = formatSource(source, 'html', true);
  assert.ok(pretty.includes('<div>\n  <p>'));
  assert.ok(pretty.includes('A <a href="https://example.org/?x=>" target="_blank">B</a> C'));
  assert.ok(pretty.includes('<pre><code>  a\n b &lt;x&gt; </code></pre>'));
  assert.equal(formatSource(pretty, 'html', false), source);
  assert.equal(formatSource(pretty, 'html', true), pretty);
  assert.equal(formatSource('<span>A</span> <span>B</span>', 'html', false), '<span>A</span> <span>B</span>');
});

test('HTML retains CSS-sensitive whitespace, raw elements and quoted attributes', () => {
  for (const source of [
    '<div style="white-space:pre"> <p>a</p>   <p>b</p> </div>',
    '<style>div { white-space: pre }</style><div>  <p>a</p>  <p>b</p></div>',
    '<script>const a="<p> x </p>";</script>',
    '<textarea>  <p> literal </p>\n </textarea>',
    '<plaintext><p  title="literal">  unchanged',
    '<listing><p>a</p>   <p>b</p></listing>',
    '<svg><text> a   b </text></svg>'
  ]) for (const pretty of [false, true]) assert.equal(formatSource(source, 'html', pretty), source);
  assert.equal(formatSource('<p  title=" a   b "   class="x" > A   B </p>', 'html', false), '<p title=" a   b " class="x"> A   B </p>');
  assert.equal(formatSource('<img src=example.png  />', 'html', false), '<img src=example.png />');
  assert.throws(() => formatSource('<pre>unclosed', 'html', true));
  assert.throws(() => formatSource('a'.repeat(2 * 1024 * 1024 + 1), 'html', true));
});
