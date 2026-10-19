const { copyFileSync } = require('node:fs');
require('./check-version.cjs').checkVersion();
copyFileSync('node_modules/dompurify/dist/purify.js', 'dist/runtime/desktop/purify.js');
if (process.platform === 'win32') require('./build-passkey.cjs');
if (process.platform === 'win32') require('./build-print-helper.cjs').buildPrintHelper();

const {cpSync}=require("node:fs"); cpSync("thunderbird", "dist/addon", {recursive:true});
if (process.platform === 'win32') {
  const {execFileSync}=require("node:child_process"),{join,resolve}=require("node:path");execFileSync(join(process.env.WINDIR||"C:/Windows","Microsoft.NET/Framework64/v4.0.30319/csc.exe"),["/nologo","/target:exe","/platform:x64","/reference:System.Web.Extensions.dll","/out:"+resolve("dist/NotebookAid.Bridge.exe"),resolve("native/Bridge.cs"),require("./native-assembly-info.cjs").writeNativeAssemblyInfo()],{stdio:"inherit",windowsHide:true});
}
