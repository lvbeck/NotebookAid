const { test }=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve('output/installer-tests/'+Date.now()), guid=crypto.randomUUID().replaceAll('-','');fs.mkdirSync(root,{recursive:true});
const registry='Software\\NotebookAid\\SetupTests\\'+guid;
const exe=path.join(root,'SetupTest.exe');
cp.execFileSync('C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe',['/nologo','/target:exe','/platform:x64','/define:SETUP_TEST','/reference:System.Web.Extensions.dll','/reference:System.Core.dll','/out:'+exe,path.resolve('native/SetupSupport.cs')],{windowsHide:true});
const env={...process.env,NOTEBOOKAID_SETUP_TEST_REGISTRY:registry,NOTEBOOKAID_SETUP_TEST_BACKUPS:path.join(root,'backups')};
const run=(command,folder,scope='user',extra=[],overrides={})=>cp.spawnSync(exe,[command,folder,scope,...extra],{env:{...env,...overrides},encoding:'utf8',windowsHide:true});
const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function fixture(name){const folder=path.join(root,name);fs.mkdirSync(folder);for(const name of ['NotebookAid.exe','NotebookAid.Bridge.exe','NotebookAid.SetupSupport.exe'])fs.writeFileSync(path.join(folder,name),'owned fixture '+name);fs.writeFileSync(path.join(folder,'installation-files.json'),JSON.stringify({owner:'NotebookAid.Installation.v1',version:'0.15.0',files:Object.fromEntries(fs.readdirSync(folder).map(name=>[name,digest(path.join(folder,name))]))}));return folder;}
test('installer protects unknown user files, validates hashes, registers only owned hosts, backs up and restores',()=>{
  const folder=fixture('Installation with spaces 中文');
  try{
    assert.equal(run('check',folder).status,0);
    fs.writeFileSync(path.join(folder,'private-note.txt'),'must remain');assert.notEqual(run('purge',folder).status,0);assert.equal(fs.readFileSync(path.join(folder,'private-note.txt'),'utf8'),'must remain');fs.unlinkSync(path.join(folder,'private-note.txt'));
    assert.notEqual(run('check',folder,'user',[],{NOTEBOOKAID_SETUP_TEST_BUSY:'1'}).status,0);
    fs.appendFileSync(path.join(folder,'NotebookAid.exe'),'tampered');assert.notEqual(run('finish',folder,'user',['de']).status,0);fs.writeFileSync(path.join(folder,'NotebookAid.exe'),'owned fixture NotebookAid.exe');
    assert.equal(run('finish',folder,'user',['de']).status,0);assert.equal(JSON.parse(fs.readFileSync(path.join(folder,'installation.json'))).locale,'de');
    const backup=run('backup',folder);assert.equal(backup.status,0);const backupRoot=backup.stdout.trim();assert.ok(fs.existsSync(path.join(backupRoot,'backup.json')));
    fs.appendFileSync(path.join(folder,'NotebookAid.exe'),'changed');assert.equal(run('restore',folder,'user',[backupRoot]).status,0);assert.equal(fs.readFileSync(path.join(folder,'NotebookAid.exe'),'utf8'),'owned fixture NotebookAid.exe');
    fs.appendFileSync(path.join(backupRoot,'files','NotebookAid.exe'),'corrupt');assert.notEqual(run('restore',folder,'user',[backupRoot]).status,0);
    const other=fixture('other');assert.equal(run('finish',other,'user',['fr']).status,0);assert.equal(run('remove',folder).status,0);
    const query=cp.spawnSync('reg.exe',['query','HKCU\\'+registry+'\\de.zub_systems.notebookaid','/ve'],{encoding:'utf8',windowsHide:true});assert.equal(query.status,0);assert.ok(query.stdout.includes(other));
    assert.equal(run('remove',other).status,0);assert.equal(run('purge',folder).status,0);assert.deepEqual(fs.readdirSync(folder),['NotebookAid.SetupSupport.exe']);
  }finally{cp.spawnSync('reg.exe',['delete','HKCU\\'+registry,'/f'],{windowsHide:true});}
});
test('shortcut selections apply only to owned links and preserve links targeting another program',()=>{
  const folder=fixture('shortcut installation'),links=path.join(root,'links'),overrides={NOTEBOOKAID_SETUP_TEST_LINKS:links};
  const desktop=path.join(links,'Desktop','NotebookAid.lnk'),menu=path.join(links,'Programs','NotebookAid.lnk');
  try {
    assert.equal(run('finish',folder,'user',['en','1','0'],overrides).status,0);assert.ok(fs.existsSync(desktop));assert.equal(fs.existsSync(menu),false);
    assert.equal(run('finish',folder,'user',['en','0','1'],overrides).status,0);assert.equal(fs.existsSync(desktop),false);assert.ok(fs.existsSync(menu));
    assert.equal(run('finish',folder,'user',['en','1','1'],overrides).status,0);assert.ok(fs.existsSync(desktop));assert.ok(fs.existsSync(menu));
    assert.equal(run('remove',folder,'user',[],overrides).status,0);assert.equal(fs.existsSync(desktop),false);assert.equal(fs.existsSync(menu),false);
    fs.mkdirSync(path.dirname(desktop),{recursive:true});fs.writeFileSync(desktop,'not an owned shortcut');
    assert.notEqual(run('finish',folder,'user',['en','1','0'],overrides).status,0);assert.equal(fs.readFileSync(desktop,'utf8'),'not an owned shortcut');
  } finally {cp.spawnSync('reg.exe',['delete','HKCU\\'+registry,'/f'],{windowsHide:true});}
});
