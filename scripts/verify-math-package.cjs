const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const asar = require('@electron/asar');
const version = require('../package.json').version;
const root = path.resolve('release', version, 'NotebookAid-win32-x64');
const archive = path.join(root, 'resources/app.asar');
const files = asar.listPackage(archive).map(file => file.replace(/\\/g, '/').replace(/^\//, ''));
let compared = 0;
function compare(directory, prefix) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const source = path.join(directory, entry.name), target = path.join(prefix, entry.name);
    if (entry.isDirectory()) compare(source, target);
    else { assert.deepEqual(asar.extractFile(archive, target), fs.readFileSync(source), target); compared++; }
  }
}
compare('dist/renderer', 'renderer');
compare('dist/runtime', 'runtime');
const katex = JSON.parse(asar.extractFile(archive, path.join('node_modules', 'katex', 'package.json')));
assert.equal(katex.version, require('../package.json').dependencies.katex);
const fonts = files.filter(file => /^renderer\/browser\/media\/KaTeX_.*\.woff2$/.test(file));
assert.equal(fonts.length, 20);
const components = JSON.parse(fs.readFileSync(path.join(root, 'distribution-dependencies.json'))).components;
for (const [name, notice, source] of [
  ['katex', 'KATEX-LICENSE.txt', 'node_modules/katex/LICENSE'],
  ['KaTeX bundled fonts', 'KATEX-FONTS-LICENSE.txt', 'docs/third-party/KaTeX-fonts-MIT.txt']
]) {
  const item = components.find(item => item.name === name && item.version === katex.version);
  assert.ok(item && item.license === 'MIT' && item.notices.includes(notice), name);
  assert.deepEqual(fs.readFileSync(path.join(root, notice)), fs.readFileSync(source), notice);
}
assert.ok(components.some(item => item.name === 'commander' && item.version === '15.0.0' && item.license === 'MIT'));
assert.ok(!files.some(file => /t15a-shell-probe|notebookaid-note\.(?:ico|svg)$/.test(file)));
const report = { version, compared, woff2Fonts: fonts.length, katex: katex.version, licenseNoticesExact: true, t15aExcluded: true };
fs.writeFileSync('output/math-resource-verification.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
