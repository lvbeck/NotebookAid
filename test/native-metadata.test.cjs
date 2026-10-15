const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process');
const { writeNativeAssemblyInfo } = require('../scripts/native-assembly-info.cjs');

test('native helper metadata rejects invalid Windows version values', () => {
  const directory = path.resolve('output/native-metadata-invalid');
  for (const version of ['65536.1.0', '1.0', '1.2.3"bad', '01.2.3', '1.2.3-mac.0']) {
    assert.throws(() => writeNativeAssemblyInfo(directory, version), /Invalid native assembly version/);
  }
});

test('compiled native helpers expose matching product and release metadata', { skip: process.platform !== 'win32' }, () => {
  fs.mkdirSync(path.resolve('output'), { recursive: true });
  const directory = fs.mkdtempSync(path.resolve('output/native-metadata-'));
  const version = require('../package.json').version;
  const info = writeNativeAssemblyInfo(directory);
  const compiler = path.join(process.env.WINDIR || 'C:/Windows', 'Microsoft.NET/Framework64/v4.0.30319/csc.exe');
  for (const name of ['Bridge', 'Passkey', 'SetupSupport']) {
    const file = path.join(directory, 'NotebookAid.' + name + '.exe');
    cp.execFileSync(compiler, ['/nologo', '/target:exe', '/platform:x64', '/reference:System.Web.Extensions.dll', '/reference:System.Core.dll', '/out:' + file, path.resolve('native/' + name + '.cs'), info], { windowsHide: true });
    const result = cp.execFileSync('powershell.exe', ['-NoProfile', '-Command', '$v=(Get-Item -LiteralPath $env:NOTEBOOKAID_METADATA_FILE).VersionInfo; @{product=$v.ProductName;version=$v.ProductVersion;file=$v.FileVersion;company=$v.CompanyName} | ConvertTo-Json -Compress'], { windowsHide: true, encoding: 'utf8', env: { ...process.env, NOTEBOOKAID_METADATA_FILE: file } });
    const metadata = JSON.parse(result);
    assert.equal(metadata.product, 'NotebookAid', name);
    assert.equal(metadata.version, version, name);
    assert.equal(metadata.file, version.match(/^\d+\.\d+\.\d+/)[0] + '.0', name);
    assert.equal(metadata.company, 'Jin Lu', name);
  }
});
