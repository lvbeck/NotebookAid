const fs = require('node:fs'), path = require('node:path');
const { execFileSync } = require('node:child_process');

function buildPrintHelper() {
  const stage = path.resolve('dist/native/print');
  fs.mkdirSync(stage, { recursive: true });
  const version = require('../package.json').version;
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw Error('Invalid print helper version.');
  const numbers = version.replaceAll('.', ',') + ',0';
  const resource = path.join(stage, 'Print.rc');
  fs.writeFileSync(resource, `#include <windows.h>
1 VERSIONINFO
FILEVERSION ${numbers}
PRODUCTVERSION ${numbers}
FILEOS VOS_NT_WINDOWS32
FILETYPE VFT_APP
BEGIN
 BLOCK "StringFileInfo" BEGIN BLOCK "040904b0" BEGIN
 VALUE "CompanyName", "Jin Lu\\0"
 VALUE "FileDescription", "NotebookAid native printing\\0"
 VALUE "ProductName", "NotebookAid\\0"
 VALUE "FileVersion", "${version}.0\\0"
 VALUE "ProductVersion", "${version}\\0"
 VALUE "LegalCopyright", "Copyright (c) 2026, Jin Lu\\0"
 END END
 BLOCK "VarFileInfo" BEGIN VALUE "Translation", 0x409, 1200 END
END
`);
  const manifest = path.join(stage, 'Print.manifest');
  fs.writeFileSync(manifest, '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0"><trustInfo xmlns="urn:schemas-microsoft-com:asm.v3"><security><requestedPrivileges><requestedExecutionLevel level="asInvoker" uiAccess="false"/></requestedPrivileges></security></trustInfo><application xmlns="urn:schemas-microsoft-com:asm.v3"><windowsSettings><dpiAwareness xmlns="http://schemas.microsoft.com/SMI/2016/WindowsSettings">PerMonitorV2</dpiAwareness></windowsSettings></application><compatibility xmlns="urn:schemas-microsoft-com:compatibility.v1"><application><supportedOS Id="{8e0f7a12-bfb3-4fe8-b9a5-48fd50a15a9a}"/></application></compatibility></assembly>');
  const vswhere = path.join(process.env['ProgramFiles(x86)'], 'Microsoft Visual Studio/Installer/vswhere.exe');
  const vs = execFileSync(vswhere, ['-latest', '-products', '*', '-requires', 'Microsoft.VisualStudio.Component.VC.Tools.x86.x64', '-property', 'installationPath'], { encoding: 'utf8', windowsHide: true }).trim();
  if (!vs) throw Error('Visual C++ x64 build tools are required for native printing.');
  const batch = path.join(stage, 'compile.cmd');
  const output = path.resolve('dist/NotebookAid.Print.exe');
  fs.writeFileSync(batch, `@echo off\r\ncall "${vs}\\VC\\Auxiliary\\Build\\vcvars64.bat" >nul\r\nif errorlevel 1 exit /b 1\r\nrc /nologo /fo "${stage}\\Print.res" "${resource}"\r\nif errorlevel 1 exit /b 1\r\ncl /nologo /utf-8 /std:c++17 /EHsc /MT /W4 /O2 "${path.resolve('native/Print.cpp')}" /Fo"${stage}\\Print.obj" /link /OUT:"${output}" /SUBSYSTEM:WINDOWS "${stage}\\Print.res" windowsapp.lib d3d11.lib d2d1.lib windows.data.pdf.lib ole32.lib user32.lib\r\n`);
  fs.appendFileSync(batch, `if errorlevel 1 exit /b 1\r\nmt /nologo -manifest "${manifest}" -outputresource:"${output}";1\r\n`);
  execFileSync(process.env.ComSpec || 'cmd.exe', ['/d', '/c', batch], { stdio: 'inherit', windowsHide: true });
  return output;
}
module.exports = { buildPrintHelper };
if (require.main === module) buildPrintHelper();
