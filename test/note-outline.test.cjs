const { test } = require('node:test');
const assert = require('node:assert/strict');
const { noteOutline } = require('../dist/runtime/shared/note-outline');
test('Markdown outline keeps exact CRLF offsets and skipped heading levels', () => {
  const body = 'Preamble\r\n# Root\r\nBody\r\n### Child ###\r\nChild body\r\n# Root\r\nEnd';
  const snapshot = body, outline = noteOutline(body, 'markdown'), nodes = outline.nodes;
  assert.deepEqual(nodes.map(n => [n.title, n.depth, n.parent]), [['Root',0,null],['Child',1,0],['Root',0,null]]);
  assert.equal(outline.preambleEnd, body.indexOf('# Root'));
  assert.equal(nodes[0].end, nodes[2].start);
  assert.equal(body.slice(nodes[0].contentStart,nodes[0].contentEnd), 'Body\r\n');
  assert.equal(body.slice(nodes[1].start,nodes[1].end), '### Child ###\r\nChild body\r\n');
  assert.equal(body,snapshot);
});
test('Markdown fences, comments, escaped markers and indented code cannot create headings', () => {
  const body = ['# Real','```md','# Fenced','```','~~~','# Tilde','~~~','<!--','# Comment','-->','    # Indented','\\# Escaped','#not-a-heading','####### Too deep','> # Quote','## Final'].join('\n');
  assert.deepEqual(noteOutline(body,'markdown').nodes.map(n=>n.title),['Real','Final']);
  assert.deepEqual(noteOutline('# Real\n```\n# Unterminated','markdown').nodes.map(n=>n.title),['Real']);
});
test('TXT outline follows actual spaces and tab stops without rewriting list markers', () => {
  const body='Intro\n- Root\n  - Child\n\t- Grandchild\n  - Sibling\n- [x] Next\n  continuation\n- \n---\n* Other\n';
  const nodes=noteOutline(body,'text').nodes;
  assert.deepEqual(nodes.map(n=>[n.title,n.depth,n.parent]),[['Root',0,null],['Child',1,0],['Grandchild',2,1],['Sibling',1,0],['[x] Next',0,null]]);
  assert.equal(body.slice(nodes[4].contentStart,nodes[4].end),'  continuation\n- \n---\n* Other\n');
});
test('Empty, unsupported, duplicate and malicious titles stay plain source data', () => {
  for(const format of ['text','markdown','html','delta']) assert.equal(noteOutline('',format).nodes.length,0);
  assert.equal(noteOutline('# Header','html').nodes.length,0);
  assert.deepEqual(noteOutline('#\n# <script>alert(1)</script>\n# Same\n# Same','markdown').nodes.map(n=>n.title),['','<script>alert(1)</script>','Same','Same']);
});
test('Every source byte belongs to the preamble, a marker, or an own-content span', () => {
  for(const [format,body] of [['markdown','intro\n# A\nbody\n## B\nmore\n# C'],['text','intro\r\n- A\r\n  - B\r\nend\r\n']]){
    const outline=noteOutline(body,format);
    const rebuilt=body.slice(0,outline.preambleEnd)+outline.nodes.map(n=>body.slice(n.start,n.contentStart)+body.slice(n.contentStart,n.contentEnd)).join('');
    assert.equal(rebuilt,body);
  }
});
