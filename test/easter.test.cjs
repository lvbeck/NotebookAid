const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {SettingsStore}=require('../dist/runtime/core/settings');
const {eggIds,defaultEasterState,validEasterState}=require('../dist/runtime/shared/easter-eggs');
const legacy={locale:null,theme:null,autosave:null};
function fixture(){const root=path.resolve('output/easter-tests');fs.mkdirSync(root,{recursive:true});return fs.mkdtempSync(path.join(root,'case-'));}
test('easter progress is optional, durable, and retains progress while disabled',()=>{
  const root=fixture(),store=new SettingsStore(root,legacy);
  assert.equal(store.get().global.easterEggs,undefined);
  store.update({easterEggs:{...defaultEasterState,found:[...eggIds],celebrated:true}});
  store.update({easterEggs:{...store.get().global.easterEggs,enabled:false,reducedMotion:true}});
  const saved=new SettingsStore(root,legacy).get().global.easterEggs;
  assert.deepEqual(saved.found,[...eggIds]);assert.equal(saved.enabled,false);assert.equal(saved.celebrated,true);
  store.update({easterEggs:{...saved,found:[],celebrated:false}});
  assert.equal(store.get().global.locale,'zh-CN');assert.deepEqual(store.get().libraries,{});
});
test('invalid or spoofed progress is rejected without changing saved settings',()=>{
  const store=new SettingsStore(fixture(),legacy),before=store.get();
  for(const patch of [{found:['hello','hello']},{found:['unknown']},{found:['hello'],celebrated:true},{enabled:1},{found:null},{debug:true},{found:new Array(7).fill('hello')}]){
    const state={...defaultEasterState,...patch};assert.equal(validEasterState(state),false);
    assert.throws(()=>store.update({easterEggs:state}),e=>e.code==='INVALID_INPUT');assert.deepEqual(store.get(),before);
  }
});
test('easter write failure preserves previously persisted progress',()=>{
  const root=fixture();new SettingsStore(root,legacy).update({easterEggs:{...defaultEasterState,found:['hello']}});
  const store=new SettingsStore(root,legacy,()=>{throw Error('Simulated failure');});
  assert.throws(()=>store.update({easterEggs:{...defaultEasterState,found:['echo']}}),e=>e.code==='WRITE_FAILED');
  assert.deepEqual(new SettingsStore(root,legacy).get().global.easterEggs.found,['hello']);
});
