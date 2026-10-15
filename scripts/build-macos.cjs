const { build, Platform, Arch } = require('electron-builder');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const project = require('../package.json');
require('./check-version.cjs').checkVersion();
if (process.platform !== 'darwin') throw Error('DMG test builds require macOS.');
const arch = process.argv[2] || process.arch;
if (!['arm64', 'x64'].includes(arch)) throw Error('Unsupported macOS architecture.');
process.env.ELECTRON_BUILDER_CACHE = path.resolve('.cache/electron-builder');
(async () => {
const app = path.resolve('release', project.version, `NotebookAid-darwin-${arch}/NotebookAid.app`);
// Prepackaged apps bypass electron-builder signing; sign the complete bundle after adding bridge resources.
const { sign } = await import('@electron/osx-sign');
await sign({ app, identity: '-', identityValidation: false, platform: 'darwin', preAutoEntitlements: false, optionsForFile: () => ({ hardenedRuntime: false, timestamp: 'none' }) });
const files = await build({ prepackaged: app, targets: Platform.MAC.createTarget(['dmg', 'zip'], Arch[arch]), publish: 'never', config: {
  appId: 'de.zub-systems.notebookaid', productName: 'NotebookAid', publish: null,
  directories: { output: 'release/macos' },
  mac: { category: 'public.app-category.productivity', icon: 'assets/notebookaid.icns', identity: '-', hardenedRuntime: false, notarize: false, artifactName: 'NotebookAid-${version}-mac-${arch}.${ext}' },
  dmg: { sign: false, title: 'NotebookAid', contents: [{ x: 130, y: 220, type: 'file' }, { x: 410, y: 220, type: 'link', path: '/Applications' }] },
} });
  const records = files.filter(file => /\.(dmg|zip)$/.test(file) && fs.existsSync(file)).map(file => `${crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}  ${path.basename(file)}`);
  fs.writeFileSync(`release/macos/SHA256-${arch}.txt`, records.join('\n') + '\n'); console.log(records.join('\n'));
})().catch(error => { console.error(error); process.exitCode = 1; });
