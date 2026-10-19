const { packager } = require('@electron/packager');
const { mkdirSync, cpSync, writeFileSync, readFileSync, existsSync, rmSync } = require('node:fs');
const { resolve, join, dirname, relative, sep } = require('node:path');
const { execFileSync } = require('node:child_process');

(async () => {
  require('./check-version.cjs').checkVersion();
  const workspace = resolve('.');
  const mac = process.argv.includes('--mac');
  await require('./build-mcp.cjs').buildMcp();
  const arch = mac ? process.argv.find(value => value === 'arm64' || value === 'x64') || process.arch : 'x64';
  if (mac && process.platform !== 'darwin') throw Error('macOS test packages must be built on macOS.');
  const stage = resolve('dist/package');
  const releaseRoot = resolve('release');
  for (const target of [stage, releaseRoot]) {
    if (!target.startsWith(workspace + require('node:path').sep)) throw new Error('Build target is outside the workspace');
  }
  const temporaryRoot = resolve('.cache/package-temp');
  mkdirSync(temporaryRoot, { recursive: true });
  process.env.TEMP = temporaryRoot;
  process.env.TMP = temporaryRoot;
  if (existsSync(stage)) rmSync(stage, { recursive: true, force: true });
  mkdirSync(stage, { recursive: true });
  cpSync('thunderbird', join(stage, 'addon'), { recursive: true });
  cpSync('dist/runtime', join(stage, 'runtime'), { recursive: true });
  cpSync('dist/renderer', join(stage, 'renderer'), { recursive: true });
  cpSync('LICENSE', join(stage, 'LICENSE'));
  cpSync('assets', join(stage, 'assets'), { recursive: true, filter: source => !/notebookaid-note\.(svg|ico)$|installer-sidebar\.(bmp|png)$/.test(source) });
  const project = JSON.parse(readFileSync('package.json', 'utf8'));
  const copied = new Set();
  const copyDependency = (name, from = workspace) => {
    let directory = dirname(require.resolve(name, { paths: [from] }));
    while (!existsSync(join(directory, 'package.json')) || JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')).name !== name) {
      const parent = dirname(directory); if (parent === directory) throw Error('Dependency package was not found: ' + name); directory = parent;
    }
    if (copied.has(directory)) return; copied.add(directory);
    const local = relative(resolve('node_modules'), directory);
    if (local.startsWith('..' + sep) || local === '..') throw Error('Dependency is outside node_modules');
    cpSync(directory, join(stage, 'node_modules', local), { recursive: true });
    const manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
    for (const dependency of Object.keys(manifest.dependencies || {})) copyDependency(dependency, directory);
  };
  copyDependency('@simplewebauthn/server');
  copyDependency('jose');
  copyDependency('parse5');
  copyDependency('marked');
  copyDependency('ical.js');
  copyDependency('electron-updater');
  copyDependency('yauzl');
  copyDependency('yazl');
  writeFileSync(join(stage, 'package.json'), JSON.stringify({ name: project.name, productName: 'NotebookAid', version: project.version, main: 'runtime/desktop/entry.js', author: project.author, license: project.license, dependencies: { '@simplewebauthn/server': project.dependencies['@simplewebauthn/server'], jose: project.dependencies['jose'], parse5: project.dependencies['parse5'], marked: project.dependencies['marked'], 'ical.js': project.dependencies['ical.js'], 'electron-updater': project.dependencies['electron-updater'], yauzl: project.dependencies.yauzl, yazl: project.dependencies.yazl } }));
  const electronNotices = resolve('dist/electron-notices'); mkdirSync(electronNotices, { recursive: true });
  const packages = await packager({ dir: stage, out: join(releaseRoot, project.version), name: 'NotebookAid', platform: mac ? 'darwin' : 'win32', arch, electronVersion: project.devDependencies.electron, overwrite: true, asar: true, prune: false,
    afterExtract: [({ buildPath }) => require('./license-catalog.cjs').copyElectronNotices(electronNotices, buildPath)],
    extendInfo: mac ? { CFBundleLocalizations: ['en', 'de', 'fr', 'it', 'es', 'pt-PT', 'zh-CN', 'zh-HK', 'ja', 'ko'], CFBundleDevelopmentRegion: 'en', CFBundleDocumentTypes: [{CFBundleTypeName:'NotebookAid Notebook Archive',CFBundleTypeRole:'Editor',LSHandlerRank:'Owner',CFBundleTypeIconFile:'notebookaid-notebook.icns',LSItemContentTypes:['de.zub-systems.notebookaid.notebook']}],UTExportedTypeDeclarations:[{UTTypeIdentifier:'de.zub-systems.notebookaid.notebook',UTTypeDescription:'NotebookAid Notebook Archive',UTTypeConformsTo:['public.zip-archive'],UTTypeTagSpecification:{'public.filename-extension':['nabook']}}] } : undefined,
    icon: resolve(mac ? 'assets/notebookaid.icns' : 'assets/notebookaid.ico'), appBundleId: 'de.zub-systems.notebookaid', appCopyright: 'Copyright (c) 2026, Jin Lu', win32metadata: { CompanyName: 'Jin Lu', FileDescription: 'NotebookAid', ProductName: 'NotebookAid' },
    download: { cacheRoot: resolve('.cache/electron') }
  });
  const packageRoot = mac ? join(packages[0], 'NotebookAid.app/Contents/Resources') : packages[0];
  if (mac) {
    cpSync('assets/notebookaid-notebook.icns', join(packageRoot, 'notebookaid-notebook.icns'));
    const bridge = join(packageRoot, 'bridge'); mkdirSync(bridge, { recursive: true });
    cpSync('native/macos/bridge.cjs', join(bridge, 'bridge.cjs'));
    cpSync('native/macos/NotebookAid.Bridge', join(bridge, 'NotebookAid.Bridge'));
    require('node:fs').chmodSync(join(bridge, 'NotebookAid.Bridge'), 0o755);
    cpSync('dist/runtime/desktop/framing.js', join(bridge, 'framing.cjs'));
    cpSync('dist/runtime/desktop/bridge-endpoint.js', join(bridge, 'bridge-endpoint.cjs'));
    cpSync('scripts/Register-Bridge-macOS.cjs', join(packageRoot, 'Register-Bridge-macOS.cjs'));
    cpSync('docs/macos-testing.md', join(packageRoot, 'MACOS-TESTING.md'));
    cpSync('node_modules/@electron/osx-sign/LICENSE', join(packageRoot, 'OSX-SIGN-LICENSE.txt'));
  } else {
  cpSync('assets/notebookaid-notebook.ico', join(packageRoot, 'resources/notebookaid-notebook.ico'));
  cpSync(require('./build-print-helper.cjs').buildPrintHelper(), join(packageRoot, 'NotebookAid.Print.exe'));
  cpSync('dist/NotebookAid.Passkey.exe', join(packageRoot, 'NotebookAid.Passkey.exe'));
  cpSync('dist/NotebookAid.McpCrypt.exe', join(packageRoot, 'NotebookAid.McpCrypt.exe'));
  const compiler = join(process.env.WINDIR || 'C:/Windows', 'Microsoft.NET/Framework64/v4.0.30319/csc.exe');
  execFileSync(compiler, ['/nologo', '/target:exe', '/platform:x64', '/reference:System.Web.Extensions.dll', '/out:' + join(packageRoot, 'NotebookAid.Bridge.exe'), resolve('native/Bridge.cs'), require('./native-assembly-info.cjs').writeNativeAssemblyInfo()], { stdio: 'inherit', windowsHide: true });
  cpSync('scripts/Register-Bridge.ps1', join(packageRoot, 'Register-Bridge.ps1'));
  cpSync('scripts/Recover-Installation.ps1', join(packageRoot, 'Recover-Installation.ps1'));
  }
  cpSync('dist/mcp', join(packageRoot, mac ? 'NotebookAid.app/Contents/Resources/mcp' : 'resources/mcp'), { recursive: true });
  cpSync('docs/t15-testing.md', join(packageRoot, 'T15-TESTING.md'));
  cpSync('docs/release-support.md', join(packageRoot, 'RELEASE-SUPPORT.md'));
  cpSync('docs/mcp-final-testing.md', join(packageRoot, 'MCP-FINAL-TESTING.md'));
  cpSync('LICENSE', join(packageRoot, 'NotebookAid-LICENSE.txt'));
  cpSync('docs/t02-testing.md', join(packageRoot, 'T02-TESTING.md'));
  cpSync('docs/t03-testing.md', join(packageRoot, 'T03-TESTING.md'));
  cpSync('docs/t03a-testing.md', join(packageRoot, 'T03A-TESTING.md'));
  cpSync('docs/t03b-testing.md', join(packageRoot, 'T03B-TESTING.md'));
  cpSync('docs/t03c-testing.md', join(packageRoot, 'T03C-TESTING.md'));
  cpSync('docs/html-import-policy.md', join(packageRoot, 'html-import-policy.md'));
  cpSync('docs/t04-testing.md', join(packageRoot, 'T04-TESTING.md'));
  cpSync('docs/t07-testing.md', join(packageRoot, 'T07-TESTING.md'));
  cpSync('docs/t10-testing.md', join(packageRoot, 'T10-TESTING.md'));
  cpSync('docs/t11-testing.md', join(packageRoot, 'T11-TESTING.md'));
  cpSync('docs/t12-testing.md', join(packageRoot, 'T12-TESTING.md'));
  cpSync('docs/t13-testing.md', join(packageRoot, 'T13-TESTING.md'));
  cpSync('docs/menu-testing.md', join(packageRoot, 'MENU-TESTING.md'));
  cpSync('docs/context-testing.md', join(packageRoot, 'CONTEXT-TESTING.md'));
  cpSync('docs/decrypt-testing.md', join(packageRoot, 'DECRYPT-TESTING.md'));
  cpSync('docs/easter-testing.md', join(packageRoot, 'EASTER-TESTING.md'));
  cpSync('docs/startup-testing.md', join(packageRoot, 'STARTUP-TESTING.md'));
  cpSync('docs/advanced-search-testing.md', join(packageRoot, 'ADVANCED-SEARCH-TESTING.md'));
  cpSync('docs/notebook-skins-testing.md', join(packageRoot, 'NOTEBOOK-SKINS-TESTING.md'));
  cpSync('node_modules/driver.js/license', join(packageRoot, 'DRIVER-JS-LICENSE.txt'));
  cpSync('node_modules/ical.js/LICENSE', join(packageRoot, 'ICAL-LICENSE.txt'));
  cpSync('node_modules/parse5/LICENSE', join(packageRoot, 'PARSE5-LICENSE.txt'));
  cpSync('node_modules/marked/LICENSE', join(packageRoot, 'MARKED-LICENSE.txt'));
  cpSync('node_modules/jose/LICENSE.md', join(packageRoot, 'JOSE-LICENSE.txt'));
  cpSync('docs/t09-testing.md', join(packageRoot, 'T09-TESTING.md'));
  cpSync('docs/t09-restore-testing.md', join(packageRoot, 'T09-RESTORE-TESTING.md'));
  cpSync('docs/t09-appearance-testing.md', join(packageRoot, 'T09-APPEARANCE-TESTING.md'));
  cpSync('docs/t08-testing.md', join(packageRoot, 'T08-TESTING.md'));
  cpSync('docs/t08-security-design.md', join(packageRoot, 't08-security-design.md'));
  cpSync('docs/t06a-testing.md', join(packageRoot, 'T06A-TESTING.md'));
  cpSync('docs/t06-testing.md', join(packageRoot, 'T06-TESTING.md'));
  cpSync('docs/t05-testing.md', join(packageRoot, 'T05-TESTING.md'));
  cpSync('docs/t05a-testing.md', join(packageRoot, 'T05A-TESTING.md'));
  cpSync('node_modules/@angular/cdk/LICENSE', join(packageRoot, 'CDK-LICENSE.txt'));
  cpSync('dist/renderer/3rdpartylicenses.txt', join(packageRoot, 'renderer-THIRD-PARTY-LICENSES.txt'));
  require('./license-catalog.cjs').copyElectronNotices(packageRoot, electronNotices);
  require('./distribution-licenses.cjs').distributionLicenses(packageRoot, stage);
  await require('./build-addons.cjs').buildAddons(releaseRoot);
  for (const name of Object.keys(require('./build-addons.cjs').addons)) cpSync(join(releaseRoot, name), join(packageRoot, name));
  await require('./build-addons.cjs').verifyAddons(packageRoot, releaseRoot);
  console.log('Packaged:', packageRoot);
})().catch(error => { console.error(error); process.exitCode = 1; });
