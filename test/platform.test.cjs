const { test } = require('node:test'), assert = require('node:assert/strict');
const { bridgeEndpoint } = require('../dist/runtime/desktop/bridge-endpoint');
const { updateSourceReady } = require('../dist/runtime/desktop/updates');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');

test('Windows bridge names remain case insensitive; Unix endpoints are private, short and case sensitive', () => {
  const windows = bridgeEndpoint('C:\\Users\\Fixture\\NotebookAid', 'win32', 501);
  assert.equal(windows.address, '\\\\.\\pipe\\' + windows.name);
  assert.deepEqual(windows, bridgeEndpoint('c:\\users\\fixture\\notebookaid', 'win32', 501));
  const mac = bridgeEndpoint('/Users/Fixture/Library/Application Support/NotebookAid/state', 'darwin', 501);
  assert(mac.address.startsWith('/tmp/NotebookAid-501-')); assert(mac.address.length < 104);
  assert.notEqual(mac.address, bridgeEndpoint('/Users/fixture/Library/Application Support/NotebookAid/state', 'darwin', 501).address);
  assert.notEqual(mac.address, bridgeEndpoint('/Users/Fixture/Library/Application Support/NotebookAid/state', 'darwin', 502).address);
});

test('macOS updates remain unconfigured unless a HTTPS source and publisher are supplied', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'notebookaid-mac-update-'));
  t.after(() => fs.rmSync(root, { recursive:true,force:true }));
  assert.equal(updateSourceReady(root, root, 'darwin'), false);
  fs.writeFileSync(path.join(root,'app-update.yml'), 'provider: generic\nurl: https://example.test');
  assert.equal(updateSourceReady(root, root, 'darwin'), false);
  fs.writeFileSync(path.join(root,'app-update.yml'), 'provider: generic\nurl: https://example.test\npublisherName: Fixture Publisher');
  assert.equal(updateSourceReady(root, root, 'darwin'), true);
  assert.equal(updateSourceReady(root, root, 'win32'), false);
});
