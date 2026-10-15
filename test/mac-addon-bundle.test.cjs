const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { buildMacAddon, locales } = require('../scripts/build-macos-addon.cjs');
const { getPath7za } = require('app-builder-lib/out/toolsets/7zip');

test('macOS addon bundle contains root manifest, project license and ten linked setup guides', async () => {
  fs.mkdirSync('output', { recursive: true });
  const output = fs.mkdtempSync(path.resolve('output/mac-addon-test-'));
  const result = await buildMacAddon(output), zip = path.join(output, 'NotebookAid.xpi');
  const sevenZip = await getPath7za();
  const manifest = JSON.parse(execFileSync(sevenZip, ['x', '-so', zip, 'manifest.json'], { encoding: 'utf8', windowsHide: true }));
  assert.equal(manifest.version, require('../package.json').version);
  assert.equal(manifest.browser_specific_settings.gecko.id, 'notebookaid@zub-systems.de');
  assert.equal(execFileSync(sevenZip, ['x', '-so', zip, 'LICENSE'], { encoding: 'utf8', windowsHide: true }), fs.readFileSync('LICENSE', 'utf8'));
  assert.equal(Object.keys(locales).length, 10);
  for (const locale of Object.keys(locales)) {
    const guide = fs.readFileSync(path.join(output, 'Guides/README.' + locale + '.md'), 'utf8');
    assert.ok(!guide.includes('@LANGUAGES@') && !guide.includes('@VERSION@'));
    assert.ok(guide.includes('ELECTRON_RUN_AS_NODE=1 "/Applications/NotebookAid.app/Contents/MacOS/NotebookAid"'));
    assert.ok(guide.includes('Register-Bridge-macOS.cjs') && guide.includes('--remove'));
    for (const key of Object.keys(locales)) assert.ok(guide.includes('(README.' + key + '.md)'));
  }
  for (const line of fs.readFileSync(path.join(output, 'SHA256-addon.txt'), 'utf8').trim().split('\n')) {
    const [digest, file] = line.split('  ');
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(output, file))).digest('hex'), digest);
  }
  assert.equal(result.version, require('../package.json').version);
});
