const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const yaml=require('js-yaml');
const {prepare}=require('../scripts/prepare-github-updates.cjs');
const {readConfig,validateConfig,windowsEnvironment}=require('../scripts/github-update-config.cjs');
const {validateMsiRelease}=require('../dist/runtime/desktop/msi-updates');
fs.mkdirSync('output',{recursive:true});
function fixture(t) {
  const workspace=fs.mkdtempSync(path.resolve('output/update-build-')),version='1.2.3';
  for(const dir of ['release/installer','release/msi',`release/${version}/NotebookAid-win32-x64/resources`,'dist/msi/app/resources']) fs.mkdirSync(path.join(workspace,dir),{recursive:true});
  for(const file of [`installer/NotebookAid-${version}-Setup-x64.exe`,`installer/NotebookAid-${version}-Setup-x64.exe.blockmap`,`msi/NotebookAid-${version}-Setup-x64.msi`]) fs.writeFileSync(path.join(workspace,'release',file),'fixture '+file);
  t.after(()=>fs.rmSync(workspace,{recursive:true,force:true}));
  return {workspace,version,config:structuredClone(readConfig())};
}
test('default update policy disables activation even when old update variables are set',()=>{
  const config=readConfig();
  assert.equal(config.windows.mode,'prepare-only');assert.equal(config.macOS.mode,'manual');assert.equal(config.windows.requireSignature,true);
  assert.deepEqual(windowsEnvironment({},config),{});
  const installer=require('../scripts/installer-config.cjs');
  assert.equal(installer.publish,null);assert.notEqual(installer.forceCodeSigning,true);
  for(const key of ['NOTEBOOKAID_UPDATE_URL','NOTEBOOKAID_UPDATE_PUBLISHER','NOTEBOOKAID_MSI_PUBLISHER']) assert.throws(()=>windowsEnvironment({[key]:'unexpected'},config),/prepare-only/);
  for(const mutate of [c=>c.windows.requireSignature=false,c=>c.windows.feedBaseUrl='https://other.test/',c=>c.macOS.mode='automatic',c=>c.windows.publisherName='Unapproved']) {const copy=structuredClone(config);mutate(copy);assert.throws(()=>validateConfig(copy));}
});
test('candidate contains correct final hashes and MSI metadata without active latest feed names',t=>{
  const options=fixture(t),{output,report}=prepare(options);
  assert.equal(report.updateEnabled,false);assert.equal(report.published,false);assert.equal(report.macOS,'manual');
  assert.equal(fs.existsSync(path.join(output,'latest.yml')),false);assert.equal(fs.existsSync(path.join(output,'latest-msi.json')),false);
  const nsis=yaml.load(fs.readFileSync(path.join(output,'candidate-latest.yml'),'utf8'));
  const exe=fs.readFileSync(path.join(output,nsis.path));
  assert.equal(nsis.files[0].size,exe.length);assert.equal(nsis.sha512,crypto.createHash('sha512').update(exe).digest('base64'));
  const msi=validateMsiRelease(JSON.parse(fs.readFileSync(path.join(output,'candidate-latest-msi.json'),'utf8')));
  assert.equal(msi.url,'https://github.com/lvbeck/NotebookAid/releases/download/v1.2.3/NotebookAid-1.2.3-Setup-x64.msi');
  assert.equal(msi.sha256,crypto.createHash('sha256').update(fs.readFileSync(path.join(output,'NotebookAid-1.2.3-Setup-x64.msi'))).digest('hex'));
  for(const [file,digest] of Object.entries(report.files)) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(output,file))).digest('hex'),digest);
  assert.throws(()=>prepare(options),/empty/);
});
test('candidate rejects stale active package configuration, missing blockmaps and linked output',t=>{
  const options=fixture(t),file=path.join(options.workspace,'dist/msi/app/resources/msi-update.json');
  fs.writeFileSync(file,'{}');assert.throws(()=>prepare(options),/unexpectedly enables/);fs.unlinkSync(file);
  fs.unlinkSync(path.join(options.workspace,'release/installer/NotebookAid-1.2.3-Setup-x64.exe.blockmap'));assert.throws(()=>prepare(options));
  fs.writeFileSync(path.join(options.workspace,'release/installer/NotebookAid-1.2.3-Setup-x64.exe.blockmap'),'restored fixture');
  const target=path.join(options.workspace,'link-target');fs.mkdirSync(target);fs.symlinkSync(target,path.join(options.workspace,'release/update-candidate'),process.platform==='win32'?'junction':'dir');
  assert.throws(()=>prepare(options),/Linked update path/);
});
test('signed metadata cannot be emitted under suspended signing policy or by changing CLI mode',t=>{
  const options=fixture(t);
  assert.throws(()=>prepare({...options,mode:'signed'}),/disabled by policy/);
  assert.equal(fs.existsSync(path.join(options.workspace,'release/update-ready')),false);
  assert.throws(()=>prepare({...options,mode:'unsigned-active'}),/Unknown/);
  assert.throws(()=>prepare({...options,version:'1.2.3-beta'}),/Numeric/);
});
test('future signed configuration requires one publisher and fixed GitHub repository',()=>{
  const config=structuredClone(readConfig());config.windows.mode='signed';
  assert.throws(()=>windowsEnvironment({},config),/actual certificate publisher/);
  config.windows.publisherName='Future Certificate Publisher';
  const env=windowsEnvironment({},config);assert.equal(env.NOTEBOOKAID_UPDATE_PUBLISHER,env.NOTEBOOKAID_MSI_PUBLISHER);
  assert.throws(()=>windowsEnvironment({NOTEBOOKAID_MSI_PUBLISHER:'Other'},config),/must match/);
});
test('unsigned artifacts never pass the future signed finalizer even with matching feed configuration',t=>{
  const options=fixture(t),config=options.config;config.windows.mode='signed';config.windows.publisherName='Future Certificate Publisher';
  const program=path.join(options.workspace,'release/1.2.3/NotebookAid-win32-x64'),native=path.join(options.workspace,'dist/msi/app');
  fs.writeFileSync(path.join(program,'resources/app-update.yml'),yaml.dump({provider:'generic',url:config.windows.feedBaseUrl,publisherName:config.windows.publisherName}));
  fs.writeFileSync(path.join(native,'resources/msi-update.json'),JSON.stringify({provider:'github-msi',url:config.windows.msiFeedUrl,publisherName:config.windows.publisherName}));
  const files={};
  for(const file of ['NotebookAid.exe','NotebookAid.Bridge.exe','NotebookAid.Passkey.exe','NotebookAid.SetupSupport.exe']) {
    for(const root of [program,native]) fs.writeFileSync(path.join(root,file),'unsigned fixture');
    files[file]=crypto.createHash('sha256').update(fs.readFileSync(path.join(program,file))).digest('hex');
  }
  files['resources/app-update.yml']=crypto.createHash('sha256').update(fs.readFileSync(path.join(program,'resources/app-update.yml'))).digest('hex');
  fs.writeFileSync(path.join(program,'installation-files.json'),JSON.stringify({owner:'NotebookAid.Installation.v1',version:'1.2.3',files}));
  fs.appendFileSync(path.join(program,'NotebookAid.exe'),'tampered');
  assert.throws(()=>prepare({...options,mode:'signed'}),/inventory mismatch/);
  fs.writeFileSync(path.join(program,'NotebookAid.exe'),'unsigned fixture');
  assert.throws(()=>prepare({...options,mode:'signed'}));
  assert.equal(fs.existsSync(path.join(options.workspace,'release/update-ready')),false);
});
test('candidate workflow is manual, pinned and has no release-writing permissions',()=>{
  const workflow=yaml.load(fs.readFileSync('.github/workflows/windows-update-candidate.yml','utf8'));
  assert.deepEqual(Object.keys(workflow.on),['workflow_dispatch']);assert.deepEqual(workflow.permissions,{contents:'read'});
  for(const step of workflow.jobs.prepare.steps) if(step.uses) assert.match(step.uses,/@[a-f0-9]{40}$/);
  assert.ok(workflow.jobs.prepare.steps.some(step=>step.run==='node scripts/prepare-github-updates.cjs --candidate'));
});
