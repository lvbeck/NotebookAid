const {test}=require('node:test');
const assert=require('node:assert/strict');
const {synchronizeLoginStartup}=require('../dist/runtime/desktop/login-startup');
test('Windows login registration uses the current executable and changes window/background arguments',()=>{
  let current;const calls=[],port={setLoginItemSettings(value){current=value;calls.push(value);},getLoginItemSettings(options){assert.equal(options.path,'C:/Program Files/NotebookAid/NotebookAid.exe');assert.deepEqual(options.args,current.args);return{openAtLogin:current.openAtLogin};}};
  for(const mode of ['background','window']){synchronizeLoginStartup(port,'win32',true,'C:/Program Files/NotebookAid/NotebookAid.exe',{enabled:true,mode});assert.deepEqual(current.args,mode==='background'?['--login-startup','--background']:['--login-startup']);assert.equal(current.name,undefined);}
  synchronizeLoginStartup(port,'win32',true,'C:/Program Files/NotebookAid/NotebookAid.exe');assert.equal(current.openAtLogin,false);assert.equal(calls.length,3);
});
test('macOS login items use the main application service and development builds cannot register',()=>{
  let enabled=false;const port={setLoginItemSettings(value){assert.deepEqual(Object.keys(value),['openAtLogin']);enabled=value.openAtLogin;},getLoginItemSettings(){return{openAtLogin:enabled};}};
  synchronizeLoginStartup(port,'darwin',true,'/Applications/NotebookAid.app',{enabled:true,mode:'background'});assert.equal(enabled,true);
  assert.throws(()=>synchronizeLoginStartup(port,'win32',false,'electron.exe'),/WRITE_FAILED/);
  assert.throws(()=>synchronizeLoginStartup(port,'linux',true,'app'),/WRITE_FAILED/);
  assert.throws(()=>synchronizeLoginStartup({...port,getLoginItemSettings:()=>({openAtLogin:false})},'darwin',true,'app',{enabled:true,mode:'window'}),/WRITE_FAILED/);
});

test('manual startup remains visible and only automatic/background launches are hidden',()=>{
  const {loginLaunchHidden}=require('../dist/runtime/desktop/login-startup');
  const preference={enabled:true,mode:'background'};
  assert.equal(loginLaunchHidden('win32',[],preference),false);
  assert.equal(loginLaunchHidden('win32',['--login-startup'],{enabled:true,mode:'window'}),false);
  assert.equal(loginLaunchHidden('win32',['--login-startup','--background'],preference),true);
  assert.equal(loginLaunchHidden('darwin',[],preference,false),false);
  assert.equal(loginLaunchHidden('darwin',[],preference,true),true);
  assert.equal(loginLaunchHidden('darwin',[],{enabled:true,mode:'window'},true),false);
});

test('Windows registration matches Electron openAtLogin lookup by using the default application identity',()=>{
  const entries=new Map(),identity='de.zub-systems.notebookaid';
  const port={setLoginItemSettings(value){const name=value.name??identity;if(value.openAtLogin)entries.set(name,JSON.stringify([value.path,value.args]));else entries.delete(name);},getLoginItemSettings(options){return{openAtLogin:entries.get(identity)===JSON.stringify([options.path,options.args])};}};
  for(const mode of ['background','window']){synchronizeLoginStartup(port,'win32',true,'C:/Program Files/NotebookAid/NotebookAid.exe',{enabled:true,mode});assert.equal(entries.has(identity),true);assert.equal(entries.has('NotebookAid'),false);}
  synchronizeLoginStartup(port,'win32',true,'C:/Program Files/NotebookAid/NotebookAid.exe');assert.equal(entries.size,0);
});
