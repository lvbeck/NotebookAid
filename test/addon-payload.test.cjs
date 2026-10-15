const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { buildAddons, verifyAddons, addons } = require('../scripts/build-addons.cjs');

test('installer addon payload rejects missing, modified and wrong-version plugins', async () => {
  fs.mkdirSync('output', { recursive: true });
  const root = fs.mkdtempSync(path.resolve('output/addon-payload-'));
  try {
    const reference = path.join(root, 'reference'), payload = path.join(root, 'payload');
    const hashes = await buildAddons(reference);
    fs.cpSync(reference, payload, { recursive: true });
    assert.deepEqual(await verifyAddons(payload, reference), hashes);
    for (const name of Object.keys(addons)) {
      const file = path.join(payload, name), saved = fs.readFileSync(file);
      fs.unlinkSync(file);
      await assert.rejects(verifyAddons(payload, reference), /Missing or linked addon/);
      fs.writeFileSync(file, Buffer.concat([saved, Buffer.from('changed')]));
      await assert.rejects(verifyAddons(payload, reference), /Embedded addon differs/);
      fs.writeFileSync(file, saved);
    }
    const { archive } = require('app-builder-lib/out/targets/archive');
    const bad = path.join(root, 'bad'); fs.cpSync('thunderbird', bad, { recursive: true });
    fs.copyFileSync('LICENSE', path.join(bad, 'LICENSE'));
    const manifest = JSON.parse(fs.readFileSync(path.join(bad, 'manifest.json'), 'utf8')); manifest.version = '0.0.0';
    fs.writeFileSync(path.join(bad, 'manifest.json'), JSON.stringify(manifest));
    fs.unlinkSync(path.join(payload, 'NotebookAid.xpi'));
    await archive('zip', path.join(payload, 'NotebookAid.xpi'), bad, { withoutDir: true });
    await assert.rejects(verifyAddons(payload), /Addon identity or version mismatch/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
