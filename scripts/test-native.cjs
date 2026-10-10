const { execFileSync } = require('node:child_process');
const { resolve, join } = require('node:path');
const { mkdirSync, writeFileSync } = require('node:fs');
const directory = resolve('output/native-lifecycle', String(Date.now()));
mkdirSync(directory, { recursive: true });
const harness = join(directory, 'NativeLifecycle.exe');
execFileSync(join(process.env.WINDIR || 'C:/Windows', 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'),
  ['/nologo', '/target:exe', '/platform:x64', '/reference:System.Web.Extensions.dll', '/out:' + harness, resolve('test/NativeLifecycle.cs')],
  { stdio: 'inherit', windowsHide: true });
try {
  const output = execFileSync(harness, [resolve('release', require('../package.json').version, 'NotebookAid-win32-x64/NotebookAid.Bridge.exe')], {
    windowsHide: true, encoding: 'utf8', timeout: 30000, env: { ...process.env, NOTEBOOKAID_TEST_HOME: directory }
  });
  writeFileSync(join(directory, 'report.json'), output);
  console.log(output);
  console.log('Artifacts:', directory);
} catch (error) { console.error(String(error.stderr || error.message)); process.exitCode = 1; }
