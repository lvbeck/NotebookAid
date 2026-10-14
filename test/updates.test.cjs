const { test } = require('node:test'), assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { mkdtempSync, writeFileSync, mkdirSync } = require('node:fs');
const { join } = require('node:path'), { tmpdir } = require('node:os');
const { registerUpdates, updateSourceReady } = require('../dist/runtime/desktop/updates');
const { installationLocale } = require('../dist/runtime/core/installation-locale');
const { SettingsStore } = require('../dist/runtime/core/settings');
test('update source requires installed identity, HTTPS and publisher signature metadata', () => {
  const root = mkdtempSync(join(tmpdir(), 'notebookaid-update-'));
  writeFileSync(join(root, 'installation.json'), JSON.stringify({owner:'NotebookAid.Installation.v1',locale:'de'}));
  assert.equal(installationLocale(root), 'de');
  for (const config of ['provider: generic\nurl: http://example.test\npublisherName: Jin Lu', 'provider: generic\nurl: https://example.test', 'provider: generic\nurl: https://user:password@example.test\npublisherName: Jin Lu']) {
    writeFileSync(join(root,'app-update.yml'),config); assert.equal(updateSourceReady(root,root),false);
  }
  writeFileSync(join(root,'app-update.yml'),'provider: generic\nurl: https://example.test\npublisherName: Jin Lu'); assert.equal(updateSourceReady(root,root),true);
  const data=join(root,'state'); mkdirSync(data);
  assert.equal(new SettingsStore(data,{locale:null,theme:null,autosave:null},undefined,'de').get().global.locale,'de');
  const store=new SettingsStore(data,{locale:null,theme:null,autosave:null},undefined,'fr');assert.equal(store.get().global.locale,'de');
  store.update({autoUpdates:false});assert.equal(new SettingsStore(data,{locale:null,theme:null,autosave:null}).get().global.autoUpdates,false);
  assert.throws(()=>store.update({autoUpdates:'yes'}));
});
test('no configuration does not load updater or send a request',async()=>{
  let loads=0;const service=registerUpdates({root:'not-installed',resources:'none',configured:false,enabled:()=>true,publish:()=>{},confirm:async()=>true,flush:async()=>true,beforeInstall:()=>{},createUpdater:async()=>{loads++;}});
  try {await service.check();await service.install();assert.equal(loads,0);}finally{service.close();}
});
test('updates deduplicate checks and require confirmation plus successful save before restart', async()=>{
  let checks=0,downloads=0,restarts=0,confirmed=false,saved=false;const fake=new EventEmitter();
  fake.checkForUpdates=async()=>{checks++;return {isUpdateAvailable:true,updateInfo:{version:'1.0.0'}};};fake.downloadUpdate=async()=>{downloads++;fake.emit('update-downloaded',{version:'1.0.0'});};fake.quitAndInstall=()=>{restarts++;};
  const service=registerUpdates({root:'fixture',resources:'fixture',configured:true,enabled:()=>true,publish:()=>{},confirm:async()=>confirmed,flush:async()=>saved,beforeInstall:()=>{},createUpdater:async()=>fake});
  try {await Promise.all([service.check(),service.check()]);assert.equal(checks,1);assert.equal(downloads,1);assert.equal(fake.autoInstallOnAppQuit,false);assert.equal(fake.allowDowngrade,false);await service.install();assert.equal(restarts,0);confirmed=true;await service.install();assert.equal(restarts,0);saved=true;await service.install();assert.equal(restarts,1);}finally{service.close();}
});
test('failed update installation restores the normal application shutdown guard',async()=>{
  let restored=0;const fake=new EventEmitter();fake.checkForUpdates=async()=>({isUpdateAvailable:true,updateInfo:{version:'1.0.0'}});fake.downloadUpdate=async()=>fake.emit('update-downloaded',{version:'1.0.0'});fake.quitAndInstall=()=>{throw Error('fixture launch failure');};
  const service=registerUpdates({root:'fixture',resources:'fixture',configured:true,enabled:()=>true,publish:()=>{},confirm:async()=>true,flush:async()=>true,beforeInstall:()=>{},installFailed:()=>{restored++;},createUpdater:async()=>fake});
  try{await service.check();await service.install();assert.equal(service.state().phase,'error');assert.equal(restored,1);}finally{service.close();}
});
