const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {addonMaterials,prepareAddon,verifyAddonMaterials,updateCatalog}=require('../scripts/license-catalog.cjs');
fs.mkdirSync('output',{recursive:true});

test('standalone XPI notices cover bundled Quill dependencies and reject missing or changed notices',()=>{
  const root=fs.mkdtempSync(path.resolve('output/license-addon-'));
  try {
    fs.mkdirSync(path.join(root,'vendor'));
    prepareAddon('thunderbird',root);
    const read=file=>fs.readFileSync(path.join(root,file));
    verifyAddonMaterials('thunderbird',read);
    const material=addonMaterials('thunderbird');
    for(const name of ['quill','parchment','quill-delta','fast-diff','eventemitter3','lodash-es','lodash.clonedeep','lodash.isequal','dompurify','marked','lucide']) assert.ok(material.components.some(item=>item.name===name&&item.version&&item.license),name);
    fs.unlinkSync(path.join(root,'vendor/quill.js.LICENSE.txt'));
    assert.throws(()=>verifyAddonMaterials('thunderbird',read));
    prepareAddon('thunderbird',root);
    fs.appendFileSync(path.join(root,'THIRD-PARTY-LICENSES.txt'),'changed');
    assert.throws(()=>verifyAddonMaterials('thunderbird',read),/changed/);
    prepareAddon('thunderbird-compat',root);
    verifyAddonMaterials('thunderbird-compat',read);
    fs.writeFileSync(path.join(root,'vendor/quill.js'),'unexpected source version');
    assert.throws(()=>addonMaterials(root),/Vendored version mismatch/);
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
});

test('catalog merges actual renderer/runtime inventory and rejects missing distribution notices',()=>{
  const root=fs.mkdtempSync(path.resolve('output/license-catalog-'));
  try {
    fs.writeFileSync(path.join(root,'distribution-dependencies.json'),JSON.stringify({runtime:[{name:'marked',version:require('../node_modules/marked/package.json').version,license:'MIT'}]}));
    fs.writeFileSync(path.join(root,'renderer-THIRD-PARTY-LICENSES.txt'),'Package: marked\n');
    for(const file of ['runtime-THIRD-PARTY-LICENSES.txt','LICENSE','LICENSES.chromium.html']) fs.writeFileSync(path.join(root,file),'fixture');
    let catalog=updateCatalog(root);
    assert.equal(catalog.components.filter(item=>item.name==='marked').length,1);
    assert.equal(catalog.components.find(item=>item.name==='marked').notices.length,2);
    assert.ok(catalog.components.some(item=>item.name==='Electron'));
    assert.ok(!catalog.noticeFiles.includes('NotebookAid-LICENSE.txt'));
    fs.unlinkSync(path.join(root,'runtime-THIRD-PARTY-LICENSES.txt'));
    assert.throws(()=>updateCatalog(root),/Missing distribution notice/);
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
});

test('Windows autocrlf checkout preserves exact vendored JavaScript bytes',{skip:!fs.existsSync('.git')},()=>{
  const root=fs.mkdtempSync(path.resolve('output/license-eol-'));
  try {
    const files=[['quill.js','quill/dist/quill.js'],['marked.js','marked/lib/marked.umd.js'],['purify.js','dompurify/dist/purify.js']];
    require('node:child_process').execFileSync('git',['-c','core.autocrlf=true','checkout-index','--prefix='+root.replaceAll('\\','/')+'/','--',...files.map(([file])=>'thunderbird/vendor/'+file)],{windowsHide:true});
    for(const [file,upstream]of files) assert.ok(fs.readFileSync(path.join(root,'thunderbird/vendor',file)).equals(fs.readFileSync(path.join('node_modules',upstream))),file);
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
});
