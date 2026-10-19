const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { parseProbeInput, assertProbeHome } = require('../dist/runtime/desktop/mcp-probe.js');

test('MCP probe rejects unbounded, path-bearing and invalid create requests', () => {
  const base = { requestId: randomUUID(), title: 'Synthetic note', body: 'Text' };
  assert.deepEqual(parseProbeInput(base), base);
  for (const input of [null, [], { ...base, requestId: '../note' }, { ...base, title: '  ' },
    { ...base, title: 'line\nbreak' }, { ...base, body: '\u4e2d'.repeat(8193) },
    { ...base, body: null }, { ...base, format: 'html' }, { ...base, path: 'C:\\private' }]) {
    assert.throws(() => parseProbeInput(input), error => error.code === 'INVALID_INPUT');
  }
});

test('MCP probe confines fixture registries to the isolated notebook', () => {
  const root = path.resolve('output/mcp01'); fs.mkdirSync(root, { recursive: true });
  const home = fs.mkdtempSync(path.join(root, 'unit-'));
  fs.writeFileSync(path.join(home, 'mcp-probe-fixture.json'), JSON.stringify({ purpose: 'NotebookAid MCP-01 synthetic data only' }));
  assert.doesNotThrow(() => assertProbeHome(path.resolve('.'), home));
  fs.writeFileSync(path.join(home, 'library-location.json'), JSON.stringify({ path: path.resolve('output') }));
  assert.throws(() => assertProbeHome(path.resolve('.'), home), /UNSAFE_PROBE_HOME/);
  fs.unlinkSync(path.join(home, 'library-location.json'));
  fs.writeFileSync(path.join(home, 'libraries.json'), JSON.stringify({ entries: [{ path: path.resolve('output') }] }));
  assert.throws(() => assertProbeHome(path.resolve('.'), home), /UNSAFE_PROBE_HOME/);
  assert.throws(() => assertProbeHome(path.resolve('.'), root), /UNSAFE_PROBE_HOME/);
  fs.writeFileSync(path.join(home, 'mcp-probe-fixture.json'), '{}');
  assert.throws(() => assertProbeHome(path.resolve('.'), home), /UNSAFE_PROBE_HOME/);
});
