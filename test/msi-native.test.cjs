const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process'), crypto = require('node:crypto');
const {writeNativeAssemblyInfo} = require('../scripts/native-assembly-info.cjs');
test('native MSI verifier rejects untrusted payloads, hashes and worker copies without PowerShell', {skip:process.platform !== 'win32'}, () => {
  fs.mkdirSync('output',{recursive:true}); const root = fs.mkdtempSync(path.resolve('output/msi-native-'));
  const helper = path.join(root,'NotebookAid.SetupSupport.exe'), version=require('../package.json').version;
  cp.execFileSync(path.join(process.env.WINDIR,'Microsoft.NET/Framework64/v4.0.30319/csc.exe'),['/nologo','/target:exe','/platform:x64','/define:MSI_UPDATE','/reference:System.Web.Extensions.dll','/reference:System.Core.dll','/out:'+helper,path.resolve('native/SetupSupport.cs'),path.resolve('native/MsiUpdate.cs'),writeNativeAssemblyInfo(root)],{windowsHide:true,stdio:'pipe'});
  fs.writeFileSync(path.join(root,'installation.json'),JSON.stringify({owner:'NotebookAid.Installation.v1',installer:'msi',scope:'user'}));
  const file=path.join(root,`NotebookAid-${version}-Setup-x64.msi`); fs.writeFileSync(file,'Synthetic unsigned payload');
  const hash=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const run=(digest=hash, installedRoot=root)=>cp.spawnSync(helper,['msi-verify',file,version,'Jin Lu',digest,installedRoot],{encoding:'utf8',windowsHide:true});
  let result=run(); assert.equal(result.status,1); assert.match(result.stderr,/Authenticode signature is not trusted/);
  result=run('0'.repeat(64)); assert.equal(result.status,1); assert.match(result.stderr,/checksum mismatch/);
  const foreign=path.join(root,'foreign');fs.mkdirSync(foreign);fs.writeFileSync(path.join(foreign,'NotebookAid.SetupSupport.exe'),'foreign');
  result=run(hash,foreign); assert.equal(result.status,1);assert.match(result.stderr,/differs from the installed helper/);
  const worker=path.join(root,'NotebookAid.UpdateWorker.exe');fs.copyFileSync(helper,worker);
  result=cp.spawnSync(worker,['msi-verify',file,version,'Jin Lu',hash,root],{encoding:'utf8',windowsHide:true});assert.equal(result.status,1);assert.match(result.stderr,/Authenticode signature is not trusted/);
});
