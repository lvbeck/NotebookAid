const { execFileSync } = require('node:child_process');
const { join, resolve } = require('node:path');
const { mkdirSync } = require('node:fs');
module.exports.buildMcpCrypt = () => {
  if (process.platform !== 'win32') return;
  mkdirSync('dist', { recursive: true });
  execFileSync(join(process.env.WINDIR || 'C:/Windows', 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'), ['/nologo', '/target:exe', '/platform:x64', '/reference:System.Web.Extensions.dll', '/reference:System.Security.dll', '/out:' + resolve('dist/NotebookAid.McpCrypt.exe'), resolve('native/McpCrypt.cs'), require('./native-assembly-info.cjs').writeNativeAssemblyInfo()], { stdio: 'inherit', windowsHide: true });
};
if (require.main === module) module.exports.buildMcpCrypt();
