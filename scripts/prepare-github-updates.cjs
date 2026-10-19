const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const yaml=require('js-yaml');
const {readConfig,windowsEnvironment}=require('./github-update-config.cjs');
function sha(file,algorithm) { return crypto.createHash(algorithm).update(fs.readFileSync(file)).digest(algorithm==='sha512'?'base64':'hex'); }
function inside(workspace,file) {
  const full=path.resolve(file);
  if(!full.startsWith(path.resolve(workspace)+path.sep)) throw Error('Update path is outside the workspace.');
  let cursor=full;
  while(cursor!==path.resolve(workspace)) {
    if(fs.existsSync(cursor)&&fs.lstatSync(cursor).isSymbolicLink()) throw Error('Linked update path rejected.');
    cursor=path.dirname(cursor);
  }
  return full;
}
function verifySignatures(files,publisher,version) {
  if(process.platform!=='win32') throw Error('Signed update finalization requires Windows Authenticode verification.');
  cp.execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-File',path.resolve(__dirname,'Verify-UpdateSignatures.ps1')],{
    input:JSON.stringify({files,publisher,version}),encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']
  });
}
function verifyInventory(workspace,root,version) {
  const inventory=JSON.parse(fs.readFileSync(path.join(root,'installation-files.json'),'utf8'));
  if(inventory.owner!=='NotebookAid.Installation.v1'||inventory.version!==version||!inventory.files) throw Error('Invalid signed payload inventory.');
  for(const file of ['NotebookAid.exe','NotebookAid.Bridge.exe','NotebookAid.Passkey.exe','NotebookAid.Print.exe','NotebookAid.SetupSupport.exe','resources/app-update.yml']) if(!Object.hasOwn(inventory.files,file)) throw Error('Incomplete signed payload inventory.');
  for(const [relative,digest] of Object.entries(inventory.files)) {
    const file=inside(workspace,path.join(root,relative));
    if(!file.startsWith(root+path.sep)||sha(file,'sha256')!==digest) throw Error('Signed payload inventory mismatch.');
  }
}
function prepare(options={}) {
  const workspace=path.resolve(options.workspace||'.'),version=options.version||require('../package.json').version;
  if(!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) throw Error('Numeric update version required.');
  const mode=options.mode||'candidate';
  if(!['candidate','signed'].includes(mode)) throw Error('Unknown update preparation mode.');
  const config=options.config||readConfig(), environment=windowsEnvironment(options.environment||process.env,config);
  if(mode==='signed'&&config.windows.mode!=='signed') throw Error('Signed update output is disabled by policy.');
  if(mode==='candidate'&&config.windows.mode!=='prepare-only') throw Error('Candidate builds require prepare-only policy.');
  const release=inside(workspace,path.join(workspace,'release'));
  const output=inside(workspace,path.join(release,mode==='candidate'?'update-candidate':'update-ready'));
  const name=`NotebookAid-${version}-Setup-x64`,exe=inside(workspace,path.join(release,'installer',name+'.exe')),msi=inside(workspace,path.join(release,'msi',name+'.msi')),blockmap=inside(workspace,exe+'.blockmap');
  for(const file of [exe,msi,blockmap]) if(!fs.statSync(file).isFile()||fs.statSync(file).size===0) throw Error('Missing or empty update artifact: '+path.basename(file));
  const nsisResources=inside(workspace,path.join(release,version,'NotebookAid-win32-x64/resources'));
  const msiResources=inside(workspace,path.join(workspace,'dist/msi/app/resources'));
  const nsisConfig=path.join(nsisResources,'app-update.yml'),msiConfig=path.join(msiResources,'msi-update.json');
  if(mode==='candidate') {
    for(const file of [nsisConfig,msiConfig]) if(fs.existsSync(file)) throw Error('Candidate package unexpectedly enables an update source.');
  } else {
    const nsis=yaml.load(fs.readFileSync(nsisConfig,'utf8')),native=JSON.parse(fs.readFileSync(msiConfig,'utf8'));
    const publisher=environment.NOTEBOOKAID_UPDATE_PUBLISHER;
    if(nsis.provider!=='generic'||nsis.url!==config.windows.feedBaseUrl||![].concat(nsis.publisherName||[]).includes(publisher)||native.provider!=='github-msi'||native.url!==config.windows.msiFeedUrl||native.publisherName!==publisher) throw Error('Packaged update configuration mismatch.');
    const programRoot=path.dirname(nsisResources);
    const helpers=[programRoot,path.dirname(msiResources)].flatMap(root=>['NotebookAid.exe','NotebookAid.Bridge.exe','NotebookAid.Passkey.exe','NotebookAid.Print.exe','NotebookAid.SetupSupport.exe'].map(file=>inside(workspace,path.join(root,file))));
    verifyInventory(workspace,programRoot,version);
    verifySignatures([exe,msi,...helpers],publisher,version);
  }
  fs.mkdirSync(output,{recursive:true});
  if(fs.readdirSync(output).length) throw Error('Update output must be empty; retain or remove the old candidate explicitly.');
  const files=[exe,msi,blockmap];
  for(const file of files) fs.copyFileSync(file,path.join(output,path.basename(file)));
  const copiedExe=path.join(output,path.basename(exe)),copiedMsi=path.join(output,path.basename(msi));
  if(mode==='signed') verifySignatures([copiedExe,copiedMsi],environment.NOTEBOOKAID_UPDATE_PUBLISHER,version);
  // Metadata describes the copied final bytes, not a potentially changing source.
  const size=fs.statSync(copiedExe).size,digest=sha(copiedExe,'sha512');
  const nsis={version,files:[{url:path.basename(exe),sha512:digest,size}],path:path.basename(exe),sha512:digest,releaseDate:new Date().toISOString()};
  const native={version,url:`${config.repository}/releases/download/v${version}/${path.basename(msi)}`,sha256:sha(copiedMsi,'sha256'),size:fs.statSync(copiedMsi).size};
  const prefix=mode==='candidate'?'candidate-':'';
  fs.writeFileSync(path.join(output,prefix+'latest.yml'),yaml.dump(nsis,{lineWidth:-1}));
  fs.writeFileSync(path.join(output,prefix+'latest-msi.json'),JSON.stringify(native,null,2)+'\n');
  const inventory=Object.fromEntries(fs.readdirSync(output).sort().map(file=>[file,sha(path.join(output,file),'sha256')]));
  const report={schemaVersion:1,version,mode,updateEnabled:mode==='signed',published:false,repository:config.repository,macOS:'manual',files:inventory};
  fs.writeFileSync(path.join(output,'update-build-report.json'),JSON.stringify(report,null,2)+'\n');
  fs.writeFileSync(path.join(output,'README.txt'),mode==='candidate'?'UNSIGNED TEST CANDIDATE. Updates are disabled. Do not rename or publish these metadata files as an update feed.\n':'SIGNED UPDATE ASSETS. Not published. Separate explicit approval is required before uploading to a Release.\n');
  return {output,report};
}
module.exports={prepare};
if(require.main===module) {
  try { const args=process.argv.slice(2); if(args.length>1||args.length&& !['--candidate','--signed'].includes(args[0])) throw Error('Usage: node scripts/prepare-github-updates.cjs [--candidate|--signed]'); console.log(JSON.stringify(prepare({mode:args[0]==='--signed'?'signed':'candidate'}),null,2)); }
  catch(error) { console.error(error.message);process.exitCode=1; }
}
