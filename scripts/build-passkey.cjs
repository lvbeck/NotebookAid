const { execFileSync } = require('node:child_process');
const { join, resolve } = require('node:path');
const compiler = join(process.env.WINDIR || 'C:/Windows', 'Microsoft.NET/Framework64/v4.0.30319/csc.exe');
execFileSync(compiler, ['/nologo', '/target:exe', '/platform:x64', '/reference:System.Web.Extensions.dll', '/out:' + resolve('dist/NotebookAid.Passkey.exe'), resolve('native/Passkey.cs')], { stdio: 'inherit', windowsHide: true });
