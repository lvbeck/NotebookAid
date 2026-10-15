const { build } = require('electron-builder');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const project = require('../package.json');
require('./check-version.cjs').checkVersion();
process.env.ELECTRON_BUILDER_CACHE = path.resolve('.cache/electron-builder');
(async () => {
const root = path.resolve('release', project.version, 'NotebookAid-win32-x64');
const resources = path.resolve('dist/installer-resources');
fs.mkdirSync(resources, { recursive: true });
const helper = path.join(root, 'NotebookAid.SetupSupport.exe');
execFileSync(path.join(process.env.WINDIR, 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'), ['/nologo', '/target:exe', '/platform:x64', '/reference:System.Web.Extensions.dll', '/reference:System.Core.dll', '/out:' + helper, path.resolve('native/SetupSupport.cs'), require('./native-assembly-info.cjs').writeNativeAssemblyInfo()], { stdio: 'inherit', windowsHide: true });
fs.copyFileSync(helper, path.join(resources, 'NotebookAid.SetupSupport.exe'));
const elevate = await require('app-builder-lib/out/toolsets/windows').getNsisElevatePath();
fs.copyFileSync(elevate, path.join(root, 'resources/elevate.exe'));
fs.copyFileSync(path.join(path.dirname(elevate), 'COPYING'), path.join(root, 'NSIS-COPYING.txt'));
fs.copyFileSync('node_modules/electron-builder/LICENSE', path.join(root, 'INSTALLER-BUILDER-LICENSE.txt'));
fs.copyFileSync('docs/third-party/LGPL-2.1.txt', path.join(root, 'INSTALLER-LGPL-2.1.txt'));
fs.copyFileSync('node_modules/app-builder-lib/templates/nsis/include/StdUtils.nsh', path.join(root, 'STDUTILS-NOTICE.nsh'));
const files = {};
function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw Error('Linked package rejected');
    if (entry.isDirectory()) collect(file);
    else if (path.relative(root, file) !== 'installation-files.json') files[path.relative(root, file).replaceAll('\\', '/')] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  }
}
collect(root);
fs.writeFileSync(path.join(root, 'installation-files.json'), JSON.stringify({ owner: 'NotebookAid.Installation.v1', version: project.version, files }));
const paths = await build({ prepackaged: root, config: require('./installer-config.cjs'), publish: 'never' });
  console.log(paths);
  for (const file of paths.filter(file => fs.existsSync(file) && fs.statSync(file).isFile())) console.log(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), path.basename(file));
})().catch(error => { console.error(error); process.exit(1); });
