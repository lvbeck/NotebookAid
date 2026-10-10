const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { runSqliteProbe } = require('../dist/runtime/core/probe.js');
const { encodeFrame, FrameDecoder, MAX_FRAME_SIZE } = require('../dist/runtime/desktop/framing.js');

test('SQLite survives closing and reopening and preserves Unicode', () => {
  const { mkdirSync } = require('node:fs');
  mkdirSync('output/tests', { recursive: true });
  const directory = mkdtempSync(join(resolve('output/tests'), 'sqlite-'));
  const first = runSqliteProbe(directory);
  const second = runSqliteProbe(directory);
  assert.equal(second.writes, first.writes + 1);
  assert.match(second.value, /中文/);
  assert.equal(second.integrity, 'ok');
});
test('Native framing accepts fragmented and concatenated messages', () => {
  const decoder = new FrameDecoder();
  const first = encodeFrame({ method: 'status', title: '中文' });
  const second = encodeFrame({ method: 'open' });
  assert.deepEqual(decoder.push(first.subarray(0, 2)), []);
  assert.deepEqual(decoder.push(Buffer.concat([first.subarray(2), second])), [{ method: 'status', title: '中文' }, { method: 'open' }]);
});
test('Native framing rejects oversized, empty and malformed requests', () => {
  for (const length of [0, 1, MAX_FRAME_SIZE + 1]) {
    const header = Buffer.alloc(4); header.writeUInt32LE(length);
    assert.throws(() => new FrameDecoder().push(header));
  }
  assert.throws(() => new FrameDecoder().push(Buffer.from([2, 0, 0, 0, 123, 125 + 1])));
});
