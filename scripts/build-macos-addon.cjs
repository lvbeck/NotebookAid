const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { archive } = require('app-builder-lib/out/targets/archive');
const { checkVersion } = require('./check-version.cjs');
const locales = {"en-US":"English","zh-CN":"简体中文","zh-HK":"繁體中文（香港）","de-DE":"Deutsch","fr-FR":"Français","it-IT":"Italiano","es-ES":"Español","pt-PT":"Português (Portugal)","ja-JP":"日本語","ko-KR":"한국어"};

async function buildMacAddon(output = path.resolve('release/macos')) {
  const version = checkVersion(), workspace = path.resolve('.');
  process.env.ELECTRON_BUILDER_CACHE = path.resolve('.cache/electron-builder');
  if (!path.resolve(output).startsWith(workspace + path.sep)) throw Error('Addon output must be inside the workspace.');
  fs.mkdirSync(output, { recursive: true });
  const temporaryRoot = path.resolve('.cache/mac-addon-');
  fs.mkdirSync(path.dirname(temporaryRoot), { recursive: true });
  const stage = fs.mkdtempSync(temporaryRoot);
  try {
    fs.cpSync('thunderbird', stage, { recursive: true });
    fs.copyFileSync('LICENSE', path.join(stage, 'LICENSE'));
    await archive('zip', path.join(output, 'NotebookAid.xpi'), stage, { withoutDir: true });
  } finally {
    if (!path.resolve(stage).startsWith(temporaryRoot)) throw Error('Unexpected addon staging path.');
    fs.rmSync(stage, { recursive: true, force: true });
  }
  const guides = path.join(output, 'Guides');
  fs.mkdirSync(guides, { recursive: true });
  const navigation = Object.entries(locales).map(([locale, label]) => '[' + label + '](README.' + locale + '.md)').join(' | ');
  for (const locale of Object.keys(locales)) {
    const source = fs.readFileSync('docs/macos-addon/README.' + locale + '.md', 'utf8');
    fs.writeFileSync(path.join(guides, 'README.' + locale + '.md'), source.replace('@LANGUAGES@', navigation).replaceAll('@VERSION@', version).replaceAll('../../README.de-DE.md', 'https://github.com/lvbeck/NotebookAid/blob/main/README.de-DE.md'));
  }
  fs.writeFileSync(path.join(output, 'INSTALL.md'), '# NotebookAid ' + version + ' — macOS test bundle\n\n' + Object.entries(locales).map(([locale, label]) => '- [' + label + '](Guides/README.' + locale + '.md)').join('\n') + '\n\nNotebookAid.xpi is the Thunderbird addon. These are test artifacts, not a formal release. The app uses ad-hoc signing without Apple notarization. See the guides before installing.\n');
  fs.copyFileSync('docs/msi-testing.md', path.join(output, 'msi-testing.md'));
  const files = ['NotebookAid.xpi', 'INSTALL.md', 'msi-testing.md', ...Object.keys(locales).map(locale => 'Guides/README.' + locale + '.md')];
  const checksums = files.map(file => crypto.createHash('sha256').update(fs.readFileSync(path.join(output, file))).digest('hex') + '  ' + file);
  fs.writeFileSync(path.join(output, 'SHA256-addon.txt'), checksums.join('\n') + '\n');
  return { version, output, files };
}

module.exports = { buildMacAddon, locales };
if (require.main === module) buildMacAddon().then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error); process.exitCode = 1; });
