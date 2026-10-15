const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const { verifyAddons } = require('./build-addons.cjs');
async function verifyMacAddons(arch) {
  if (process.platform !== 'darwin' || !['arm64', 'x64'].includes(arch)) throw Error('macOS architecture required.');
  const version = require('../package.json').version, reference = path.resolve('release');
  const output = path.resolve('output/macos-smoke', arch);
  fs.mkdirSync(output, { recursive: true });
  const temporary = fs.mkdtempSync(path.join(output, 'addon-check-'));
  const zipRoot = path.join(temporary, 'zip'), mount = path.join(temporary, 'dmg');
  fs.mkdirSync(zipRoot); fs.mkdirSync(mount);
  let mounted = false;
  try {
    cp.execFileSync('ditto', ['-x', '-k', path.resolve(`release/macos/NotebookAid-${version}-mac-${arch}.zip`), zipRoot]);
    const zip = await verifyAddons(path.join(zipRoot, 'NotebookAid.app/Contents/Resources'), reference);
    cp.execFileSync('codesign', ['--verify', '--deep', '--strict', path.join(zipRoot, 'NotebookAid.app')]);
    cp.execFileSync('hdiutil', ['attach', '-readonly', '-nobrowse', '-mountpoint', mount, path.resolve(`release/macos/NotebookAid-${version}-mac-${arch}.dmg`)]);
    mounted = true;
    const dmg = await verifyAddons(path.join(mount, 'NotebookAid.app/Contents/Resources'), reference);
    cp.execFileSync('codesign', ['--verify', '--deep', '--strict', path.join(mount, 'NotebookAid.app')]);
    await verifyAddons(path.resolve('release/macos'), reference);
    fs.writeFileSync(path.join(output, 'addons-verification.json'), JSON.stringify({ version, arch, zip, dmg, signaturesVerified: true }, null, 2));
  } finally {
    if (mounted) cp.execFileSync('hdiutil', ['detach', mount]);
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}
if (require.main === module) verifyMacAddons(process.argv[2]).catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { verifyMacAddons };
