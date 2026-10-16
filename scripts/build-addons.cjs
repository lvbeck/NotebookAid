const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { archive } = require('app-builder-lib/out/targets/archive');
const { getPath7za } = require('app-builder-lib/out/toolsets/7zip');
process.env.ELECTRON_BUILDER_CACHE ||= path.resolve('.cache/electron-builder');
const addons = { 'NotebookAid.xpi': 'thunderbird', 'NotebookAid-Compatibility.xpi': 'thunderbird-compat' };
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

async function verifyAddons(root, reference) {
  const sevenZip = await getPath7za(), hashes = {};
  for (const [name, source] of Object.entries(addons)) {
    const file = path.join(root, name);
    if (!fs.existsSync(file) || fs.lstatSync(file).isSymbolicLink()) throw Error('Missing or linked addon: ' + file);
    const read = entry => execFileSync(sevenZip, ['x', '-so', file, entry], { windowsHide: true });
    const manifest = JSON.parse(read('manifest.json').toString('utf8'));
    const expected = JSON.parse(fs.readFileSync(path.join(source, 'manifest.json'), 'utf8'));
    if (manifest.version !== expected.version || manifest.browser_specific_settings.gecko.id !== expected.browser_specific_settings.gecko.id) throw Error('Addon identity or version mismatch: ' + file);
    if (!read('LICENSE').equals(fs.readFileSync('LICENSE'))) throw Error('Addon license mismatch: ' + file);
    require('./license-catalog.cjs').verifyAddonMaterials(source,read);
    hashes[name] = digest(file);
    if (reference && hashes[name] !== digest(path.join(reference, name))) throw Error('Embedded addon differs from standalone addon: ' + file);
  }
  return hashes;
}

async function buildAddons(output = path.resolve('release')) {
  require('./check-version.cjs').checkVersion();
  if (!path.resolve(output).startsWith(path.resolve('.') + path.sep)) throw Error('Addon output must be inside the workspace.');
  fs.mkdirSync(output, { recursive: true });
  fs.mkdirSync('.cache', { recursive: true });
  for (const [name, source] of Object.entries(addons)) {
    const stage = fs.mkdtempSync(path.resolve('.cache/addon-'));
    try {
      fs.cpSync(source, stage, { recursive: true });
      fs.copyFileSync('LICENSE', path.join(stage, 'LICENSE'));
      require('./license-catalog.cjs').prepareAddon(source,stage);
      await archive('zip', path.join(output, name), stage, { withoutDir: true });
    } finally { fs.rmSync(stage, { recursive: true, force: true }); }
  }
  return verifyAddons(output);
}
module.exports = { buildAddons, verifyAddons, addons };
if (require.main === module) buildAddons().then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error); process.exitCode = 1; });
