const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const UPGRADE_CODE = '2A38E827-A9E4-4B31-A9D5-ED345CB44129';
const xml = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const id = value => 'N' + crypto.createHash('sha256').update(value.toLowerCase()).digest('hex').slice(0, 30);
const guid = value => {
  const bytes = crypto.createHash('sha256').update('NotebookAid.MSI.x64:' + value.toLowerCase()).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 80; bytes[8] = (bytes[8] & 63) | 128;
  const text = bytes.toString('hex'); return [text.slice(0, 8), text.slice(8, 12), text.slice(12, 16), text.slice(16, 20), text.slice(20)].join('-').toUpperCase();
};
function declarations(root) {
  const components = [], digest = crypto.createHash('sha256');
  function walk(directory) {
    let content = '';
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      if (entry.isSymbolicLink()) throw Error('Linked MSI payload rejected.');
      const file = path.join(directory, entry.name), relative = path.relative(root, file).replaceAll('\\', '/');
      if (entry.isDirectory()) content += `<Directory Id="${id(relative)}" Name="${xml(entry.name)}">${walk(file)}</Directory>`;
      else {
        digest.update(relative); digest.update(crypto.createHash('sha256').update(fs.readFileSync(file)).digest());
        const component = id('component:' + relative); components.push(`<ComponentRef Id="${component}"/>`);
        content += `<Component Id="${component}" Guid="${guid(relative)}" Win64="yes"><File Id="${id(relative)}" Name="${xml(entry.name)}" Source="${xml(file)}" KeyPath="yes"/></Component>`;
      }
    }
    return content;
  }
  const files = walk(root); return { files, components: components.join(''), digest:digest.digest('hex') };
}
async function buildMsi(version = require('../package.json').version, outputDirectory = path.resolve('release/msi'), testFailure = false) {
  if (process.platform !== 'win32') throw Error('Native MSI requires Windows.');
  require('./check-version.cjs').checkVersion();
  const parts = version.split('.').map(Number);
  if (!/^\d+\.\d+\.\d+$/.test(version) || parts[0] > 255 || parts[1] > 255 || parts[2] > 65535) throw Error('Invalid Windows Installer version.');
  const workspace = path.resolve('.'), stage = path.resolve('dist/msi'), root = path.join(stage, 'app');
  for (const target of [stage, path.resolve(outputDirectory)]) if (!target.startsWith(workspace + path.sep)) throw Error('MSI output must remain inside the workspace.');
  if (testFailure && !path.resolve(outputDirectory).startsWith(path.resolve('output/msi-fixtures') + path.sep)) throw Error('Failure fixtures must remain inside output/msi-fixtures.');
  process.env.ELECTRON_BUILDER_CACHE = path.resolve('.cache/electron-builder');
  process.env.TEMP = process.env.TMP = path.resolve('.cache/msi-temp'); fs.mkdirSync(process.env.TEMP, {recursive:true});
  fs.mkdirSync(stage, {recursive:true}); fs.mkdirSync(outputDirectory, {recursive:true});
  const source = path.resolve('release', require('../package.json').version, 'NotebookAid-win32-x64');
  await require('./build-addons.cjs').verifyAddons(source, path.resolve('release'));
  if (fs.existsSync(root)) fs.rmSync(root, {recursive:true});
  fs.cpSync(source, root, {recursive:true, filter: file => !['installation.json', 'native-host.json', 'native-host-legacy.json', 'Uninstall NotebookAid.exe'].includes(path.basename(file))});
  const csc = path.join(process.env.WINDIR, 'Microsoft.NET/Framework64/v4.0.30319/csc.exe');
  execFileSync(csc, ['/nologo', '/target:exe', '/platform:x64', '/define:MSI_UPDATE', '/reference:System.Web.Extensions.dll', '/reference:System.Core.dll', '/out:' + path.join(root, 'NotebookAid.SetupSupport.exe'), path.resolve('native/SetupSupport.cs'), path.resolve('native/MsiUpdate.cs'), require('./native-assembly-info.cjs').writeNativeAssemblyInfo(stage)], {stdio:'inherit', windowsHide:true});
  for (const file of ['NotebookAid.exe', 'NotebookAid.Bridge.exe', 'NotebookAid.Passkey.exe', 'NotebookAid.SetupSupport.exe', 'resources/app.asar']) if (!fs.existsSync(path.join(root, file))) throw Error('Missing MSI program resource: ' + file);
  fs.writeFileSync(path.join(root, 'msi-owner.txt'), 'NotebookAid.MSI.v1\n');
  // MSI uses its own update feed and must never consume latest.yml / NSIS installers.
  fs.rmSync(path.join(root, 'resources/app-update.yml'), {force:true});
  const publisher = process.env.NOTEBOOKAID_MSI_PUBLISHER;
  if (publisher?.trim()) fs.writeFileSync(path.join(root, 'resources/msi-update.json'), JSON.stringify({provider:'github-msi',url:'https://github.com/lvbeck/NotebookAid/releases/latest/download/latest-msi.json',publisherName:publisher.trim()}));
  const wix = await require('app-builder-lib/out/binDownload').getBinFromUrl('wix-4.0.0.5512.2', 'wix-4.0.0.5512.2.7z', 'fe677fcd837b18c9b912985d91636bbd8a1e800c3b3a6a841b6f96e89624e839');
  fs.copyFileSync(path.join(wix, 'LICENSE.TXT'), path.join(root, 'WIX-LICENSE.txt'));
  const notice = 'WiX build tools: Microsoft Reciprocal License (MS-RL). Bundled toolset pinned by electron-builder 26.15.3. Source: https://github.com/wixtoolset/wix3. No WiX source modifications.\n';
  fs.writeFileSync(path.join(root, 'WIX-NOTICE.txt'), notice);
  const vswhere = path.join(process.env['ProgramFiles(x86)'], 'Microsoft Visual Studio/Installer/vswhere.exe');
  const vs = execFileSync(vswhere, ['-latest', '-products', '*', '-requires', 'Microsoft.VisualStudio.Component.VC.Tools.x86.x64', '-property', 'installationPath'], {encoding:'utf8', windowsHide:true}).trim();
  if (!vs) throw Error('Visual C++ x64 build tools are required for MSI custom actions.');
  fs.writeFileSync(path.join(stage, 'MsiLocalization.h'), require('./msi-localization.cjs').nativeHeader());
  const batch = path.join(stage, 'compile.cmd');
  fs.writeFileSync(batch, `@echo off\r\ncall "${vs}\\VC\\Auxiliary\\Build\\vcvars64.bat" >nul\r\nif errorlevel 1 exit /b 1\r\ncl /nologo /utf-8 /I"${stage}" /std:c++17 /EHsc /MT /LD /W4 /O2 "${path.resolve('native/MsiActions.cpp')}" /Fo"${stage}\\MsiActions.obj" /link /OUT:"${stage}\\MsiActions.dll" /IMPLIB:"${stage}\\MsiActions.lib" msi.lib advapi32.lib shell32.lib ole32.lib shlwapi.lib\r\n`);
  if (testFailure) {
    const fixture = path.join(stage, 'FixtureFailure.cpp');
    fs.writeFileSync(fixture, '#include <windows.h>\n#include <msi.h>\nextern "C" __declspec(dllexport) UINT __stdcall Fail(MSIHANDLE) { return ERROR_INSTALL_FAILURE; }\n');
    fs.appendFileSync(batch, `if errorlevel 1 exit /b 1\r\ncl /nologo /MT /LD "${fixture}" /Fo"${stage}\\FixtureFailure.obj" /link /OUT:"${stage}\\FixtureFailure.dll" /IMPLIB:"${stage}\\FixtureFailure.lib"\r\n`);
  }
  execFileSync(process.env.ComSpec || 'cmd.exe', ['/d', '/c', batch], {stdio:'inherit', windowsHide:true});
  const payload = declarations(root);
  const template = fs.readFileSync('installer/msi/NotebookAid.wxs', 'utf8').replace('@UI@', require('./msi-localization.cjs').localizedUi(fs.readFileSync('installer/msi/UI.xml', 'utf8')));
  const fixtureAction = testFailure ? `<Binary Id="FixtureFailureDll" SourceFile="${xml(path.join(stage, 'FixtureFailure.dll'))}"/><CustomAction Id="FixtureFailure" BinaryKey="FixtureFailureDll" DllEntry="Fail" Execute="deferred" Impersonate="yes" Return="check"/>` : '';
  const project = template.replaceAll('@VERSION@', version).replaceAll('@UPGRADE_CODE@', UPGRADE_CODE).replaceAll('@PRODUCT_CODE@', guid('product:' + version)).replaceAll('@ACTION_DLL@', xml(path.join(stage, 'MsiActions.dll'))).replaceAll('@ICON@', xml(path.resolve('assets/notebookaid.ico'))).replaceAll('@SIDEBAR@', xml(path.resolve('assets/installer-sidebar.bmp'))).replaceAll('@LICENSE@', xml(path.join(stage, 'license.rtf'))).replace('@FILES@', payload.files).replace('@COMPONENTS@', payload.components).replace('@TEST_ACTION@', fixtureAction).replace('@TEST_SEQUENCE@', testFailure ? '<Custom Action="FixtureFailure" After="ApplyUserMetadata">NOT REMOVE</Custom>' : '');
  fs.writeFileSync(path.join(stage, 'license.rtf'), '{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Segoe UI;}}\\f0\\fs18 ' + fs.readFileSync('LICENSE','utf8').replaceAll('\\','\\\\').replaceAll('{','\\{').replaceAll('}','\\}').replaceAll('\n','\\par\n') + '}');
  const wxs = path.join(stage, 'NotebookAid.wxs'); fs.writeFileSync(wxs, project);
  execFileSync(path.join(wix, 'candle.exe'), ['-nologo', '-arch', 'x64', '-out', stage + path.sep, wxs], {stdio:'inherit', windowsHide:true});
  const output = path.join(outputDirectory, `NotebookAid-${version}-Setup-x64.msi`);
  const cabinetCache = path.join(stage, 'cabinet-cache', payload.digest); fs.mkdirSync(cabinetCache, {recursive:true});
  execFileSync(path.join(wix, 'light.exe'), ['-nologo', '-out', output, '-spdb', '-cc', cabinetCache, path.join(stage, 'NotebookAid.wixobj')], {stdio:'inherit', windowsHide:true});
  const digest = crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex');
  fs.writeFileSync(path.join(outputDirectory, 'SHA256-MSI.txt'), `${digest}  ${path.basename(output)}\n`);
  fs.copyFileSync('docs/msi-testing.md', path.join(outputDirectory, 'INSTALL.md'));
  console.log(JSON.stringify({output, version, sha256:digest, upgradeCode:UPGRADE_CODE})); return output;
}
if (require.main === module) buildMsi(process.argv[2]).catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { buildMsi, declarations, guid, UPGRADE_CODE };
