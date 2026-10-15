const test = require('node:test'), assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path'), { tmpdir } = require('node:os');
const { guid, UPGRADE_CODE } = require('../scripts/build-msi.cjs');
const { isMsiInstallation, readMsiFeed, validateMsiRelease, newerMsiVersion } = require('../dist/runtime/desktop/msi-updates');
const {updateSourceReady, registerUpdates} = require('../dist/runtime/desktop/updates');
test('MSI upgrade family is stable and product/component identities are distinct', () => {
  assert.equal(UPGRADE_CODE, '2A38E827-A9E4-4B31-A9D5-ED345CB44129');
  assert.equal(guid('resources/APP.asar'), guid('resources/app.asar'));
  assert.notEqual(guid('product:0.15.5'), guid('product:0.15.6'));
  assert.notEqual(guid('NotebookAid.exe'), guid('product:0.15.6'));
});
test('MSI installation never consumes NSIS latest.yml or constructs the NSIS updater', async () => {
  const root = mkdtempSync(join(tmpdir(),'notebookaid-msi-'));
  writeFileSync(join(root,'installation.json'), JSON.stringify({owner:'NotebookAid.Installation.v1',installer:'msi',scope:'user'}));
  writeFileSync(join(root,'app-update.yml'),'provider: generic\nurl: https://example.test\npublisherName: Jin Lu');
  assert.equal(isMsiInstallation(root), true); assert.equal(updateSourceReady(root,root,'win32'), false);
  let loaded = false;
  const service = registerUpdates({root,resources:root,configured:true,enabled:()=>true,publish:()=>{},confirm:async()=>true,flush:async()=>true,beforeInstall:()=>{},createUpdater:async()=>{loaded=true;throw Error('NSIS must not load');}});
  try { await service.check(); assert.equal(loaded,false); assert.equal(service.state().phase,'unconfigured'); } finally {service.close();}
  const feed = {provider:'github-msi',url:'https://github.com/lvbeck/NotebookAid/releases/latest/download/latest-msi.json',publisherName:'Jin Lu'};
  for (const bad of [{...feed,publisherName:''},{...feed,url:'http://github.com/lvbeck/NotebookAid/releases/latest/download/latest-msi.json'},{...feed,url:'https://github.com/other/repository/releases/latest/download/latest-msi.json'}]) {
    writeFileSync(join(root,'msi-update.json'),JSON.stringify(bad)); assert.equal(readMsiFeed(root),null);
  }
  writeFileSync(join(root,'msi-update.json'),JSON.stringify(feed)); assert.equal(updateSourceReady(root,root,'win32'),true);
});
test('MSI release rejects cross-channel payloads, redirects in metadata, oversized files and invalid hashes', () => {
  const value = {version:'0.15.6',url:'https://github.com/lvbeck/NotebookAid/releases/download/v0.15.6/NotebookAid-0.15.6-Setup-x64.msi',sha256:'a'.repeat(64),size:120000};
  assert.deepEqual(validateMsiRelease(value), value);
  for (const bad of [{...value,url:value.url.replace('.msi','.exe')},{...value,url:'https://evil.test/test.msi'},{...value,version:'0.15.6-beta.1'},{...value,version:'256.0.0'},{...value,sha256:'bad'},{...value,size:2**32},{...value,size:-1}]) assert.throws(()=>validateMsiRelease(bad));
  assert.equal(newerMsiVersion('0.15.6','0.15.5'),true); assert.equal(newerMsiVersion('0.15.5','0.15.6'),false); assert.equal(newerMsiVersion('0.15.6','0.15.6'),false);
});
