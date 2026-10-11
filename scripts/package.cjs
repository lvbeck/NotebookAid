const { packager } = require('@electron/packager');
const { mkdirSync, cpSync, writeFileSync, readFileSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { execFileSync } = require('node:child_process');

(async () => {
  const workspace = resolve('.');
  const stage = resolve('dist/package');
  const releaseRoot = resolve('release');
  for (const target of [stage, releaseRoot]) {
    if (!target.startsWith(workspace + require('node:path').sep)) throw new Error('Build target is outside the workspace');
  }
  const temporaryRoot = resolve('.cache/package-temp');
  mkdirSync(temporaryRoot, { recursive: true });
  process.env.TEMP = temporaryRoot;
  process.env.TMP = temporaryRoot;
  mkdirSync(stage, { recursive: true });
  cpSync('dist/runtime', join(stage, 'runtime'), { recursive: true });
  cpSync('dist/renderer', join(stage, 'renderer'), { recursive: true });
  cpSync('LICENSE', join(stage, 'LICENSE'));
  cpSync('assets', join(stage, 'assets'), { recursive: true });
  const project = JSON.parse(readFileSync('package.json', 'utf8'));
  writeFileSync(join(stage, 'package.json'), JSON.stringify({ name: project.name, productName: 'NotebookAid', version: project.version, main: 'runtime/desktop/main.js', author: project.author, license: project.license }));
  const packages = await packager({ dir: stage, out: join(releaseRoot, project.version), name: 'NotebookAid', platform: 'win32', arch: 'x64', electronVersion: project.devDependencies.electron, overwrite: true, asar: true,
    icon: resolve('assets/notebookaid.ico'), appCopyright: 'Copyright (c) 2026, Jin Lu', win32metadata: { CompanyName: 'Jin Lu', FileDescription: 'NotebookAid T06-A native rich text preview', ProductName: 'NotebookAid' },
    download: { cacheRoot: resolve('.cache/electron') }
  });
  const packageRoot = packages[0];
  const compiler = join(process.env.WINDIR || 'C:/Windows', 'Microsoft.NET/Framework64/v4.0.30319/csc.exe');
  execFileSync(compiler, ['/nologo', '/target:exe', '/platform:x64', '/reference:System.Web.Extensions.dll', '/out:' + join(packageRoot, 'NotebookAid.Bridge.exe'), resolve('native/Bridge.cs')], { stdio: 'inherit', windowsHide: true });
  cpSync('scripts/Register-Bridge.ps1', join(packageRoot, 'Register-Bridge.ps1'));
  cpSync('LICENSE', join(packageRoot, 'NotebookAid-LICENSE.txt'));
  cpSync('docs/t02-testing.md', join(packageRoot, 'T02-TESTING.md'));
  cpSync('docs/t03-testing.md', join(packageRoot, 'T03-TESTING.md'));
  cpSync('docs/t03a-testing.md', join(packageRoot, 'T03A-TESTING.md'));
  cpSync('docs/t03b-testing.md', join(packageRoot, 'T03B-TESTING.md'));
  cpSync('docs/t03c-testing.md', join(packageRoot, 'T03C-TESTING.md'));
  cpSync('docs/html-import-policy.md', join(packageRoot, 'html-import-policy.md'));
  cpSync('docs/t04-testing.md', join(packageRoot, 'T04-TESTING.md'));
  cpSync('docs/t06a-testing.md', join(packageRoot, 'T06A-TESTING.md'));
  cpSync('docs/t06-testing.md', join(packageRoot, 'T06-TESTING.md'));
  cpSync('docs/t05-testing.md', join(packageRoot, 'T05-TESTING.md'));
  cpSync('docs/t05a-testing.md', join(packageRoot, 'T05A-TESTING.md'));
  cpSync('node_modules/@angular/cdk/LICENSE', join(packageRoot, 'CDK-LICENSE.txt'));
  cpSync('dist/renderer/3rdpartylicenses.txt', join(packageRoot, 'renderer-THIRD-PARTY-LICENSES.txt'));
  console.log('Packaged:', packageRoot);
})().catch(error => { console.error(error); process.exitCode = 1; });
