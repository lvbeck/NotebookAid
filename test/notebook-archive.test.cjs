const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), { randomUUID } = require('node:crypto');
const yauzl = require('yauzl'), yazl = require('yazl');
const { pipeline } = require('node:stream/promises');
const { NoteLibrary } = require('../dist/runtime/core/library');
const { LibraryRegistry } = require('../dist/runtime/core/registry');
const { exportNotebookArchive, importNotebookArchive } = require('../dist/runtime/core/notebook-archive');
function fixture(t) { fs.mkdirSync('output/archive-tests', {recursive:true}); const root=fs.mkdtempSync(path.resolve('output/archive-tests/case-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root; }
async function entries(file) { const zip=await yauzl.openPromise(file), rows=[];try{for await(const entry of zip.eachEntry()){const chunks=[];for await(const chunk of await zip.openReadStreamPromise(entry))chunks.push(chunk);rows.push([entry.fileName,Buffer.concat(chunks)]);}}finally{zip.close();}return rows; }
async function archive(file, rows) { const zip=new yazl.ZipFile(); for(const [name,data,options] of rows)zip.addBuffer(data,name,options);const writing=pipeline(zip.outputStream,fs.createWriteStream(file));zip.end();await writing; }
const ignore = () => {};

test('ZIP notebook export/import preserves identity, organization, settings, attachments and revisions without replacing another notebook', async t => {
  const root=fixture(t), lib=new NoteLibrary(path.join(root,'source'),undefined,'create'), file=path.join(root,'测试笔记本.nabook'), parent=path.join(root,'imports');fs.mkdirSync(parent);
  let imported;
  try {
    const folder=randomUUID(),tag=randomUUID();lib.editOrganization({kind:'folder',id:folder,name:'Work',parentId:null,expectedVersion:0});lib.editOrganization({kind:'tag',id:tag,name:'Important',color:'#7755aa',expectedVersion:1});
    lib.updateNotebookSettings({name:'Shared notebook',autosave:{enabled:false,minutes:13},dailyBackup:true});
    const note=lib.create(randomUUID(),{primaryFormat:'text',title:'Round trip',body:'Original',folderId:folder}).note;
    const session=lib.begin(note.id,'test');lib.save({noteId:note.id,expectedVersion:note.version,token:session.token,generation:session.generation,title:'Round trip',body:'Revised',operationId:randomUUID()},'test');lib.end(session.token,session.generation,'test');
    const attachmentFile=path.join(root,'fixture.txt');fs.writeFileSync(attachmentFile,'Attachment bytes');const attach=lib.begin(note.id,'test');const saved=lib.addAttachment({noteId:note.id,expectedVersion:attach.note.version,token:attach.token,generation:attach.generation,operationId:randomUUID()},'test',attachmentFile);lib.end(attach.token,attach.generation,'test');
    const progress=[];await exportNotebookArchive(lib.path,file,value=>progress.push(value));assert.equal(fs.readFileSync(file).subarray(0,2).toString(),'PK');
    assert.ok(progress.some(value=>value.phase==='hashing'));const rows=await entries(file);assert.ok(rows.some(([name])=>name==='archive.json'));assert.ok(!rows.some(([name])=>name.includes('.writer.sqlite')||name.startsWith('notebook/index/')));
    const result=await importNotebookArchive(file,parent,ignore);assert.equal(result.libraryId,lib.libraryId);assert.equal(path.dirname(result.path),parent);
    imported=new NoteLibrary(result.path,undefined,'existing');assert.equal(imported.read(note.id).body,'Revised');assert.equal(imported.read(note.id).version,saved.note.version);assert.equal(imported.attachmentBytes(note.id,saved.note.attachments[0].id).toString(),'Attachment bytes');assert.equal(imported.organization().folders[0].id,folder);assert.equal(imported.organization().tags[0].id,tag);assert.equal(imported.notebookSettings().autosave.minutes,13);assert.equal(imported.notebookSettings().name,'Shared notebook');
    assert.equal(lib.read(note.id).body,'Revised');assert.ok(!fs.readdirSync(parent).some(name=>name.startsWith('.notebookaid')));
  } finally { imported?.close();lib.close(); }
});

test('encrypted notebooks remain encrypted and unlock after importing the complete archive', async t => {
  const root=fixture(t),lib=new NoteLibrary(path.join(root,'source'),undefined,'create'),file=path.join(root,'encrypted.nabook'),parent=path.join(root,'imports');fs.mkdirSync(parent);let imported;
  try {
    const note=lib.create(randomUUID(),{primaryFormat:'text',title:'Private',body:'Sensitive fixture content'}).note;
    await lib.securityCommand({action:'setup',password:'Notebook archive test password'});lib.protect(note.id,note.version,true);await lib.securityCommand({action:'lock'});
    await lib.verifyIntegrityAsync(ignore);await exportNotebookArchive(lib.path,file,ignore);
    for(const [name,data] of await entries(file))if(name.startsWith('notebook/notes/'))assert.ok(!data.includes(Buffer.from('Sensitive fixture content')));
    const result=await importNotebookArchive(file,parent,ignore);imported=new NoteLibrary(result.path,undefined,'existing');assert.equal(imported.securityState().unlocked,false);
    await imported.securityCommand({action:'unlock',credential:'Notebook archive test password'});assert.equal(imported.read(note.id).body,'Sensitive fixture content');
  } finally { imported?.close();lib.close(); }
});

test('damaged ZIPs, traversal, case collisions, links and checksum changes never publish a notebook', async t => {
  const root=fixture(t),lib=new NoteLibrary(path.join(root,'source'),undefined,'create'),valid=path.join(root,'valid.nabook'),parent=path.join(root,'imports');fs.mkdirSync(parent);
  try {
    lib.create(randomUUID());await exportNotebookArchive(lib.path,valid,ignore);const rows=await entries(valid);
    const cases=[['damaged',null],['descriptor-size',rows.map(([name,data])=>[name,name==='archive.json'?Buffer.alloc(5000):data])],['checksum',rows.map(([name,data])=>[name,name==='notebook/library.json'?Buffer.from('{}'):data])],['case',[...rows,['notebook/LIBRARY.json',Buffer.from('{}')]]],['link',[...rows,['notebook/link',Buffer.from('outside'),{mode:0o120777}]]]];
    for(const [name,data] of cases){const file=path.join(root,name+'.nabook');if(data)await archive(file,data);else fs.writeFileSync(file,'broken');await assert.rejects(importNotebookArchive(file,parent,ignore));assert.deepEqual(fs.readdirSync(parent),[]);}
    const traversal=path.join(root,'traversal.nabook');await archive(traversal,[['aa/escape',Buffer.from('outside')]]);fs.writeFileSync(traversal,Buffer.from(fs.readFileSync(traversal).toString('latin1').replaceAll('aa/escape','../escape'),'latin1'));await assert.rejects(importNotebookArchive(traversal,parent,ignore));assert.equal(fs.existsSync(path.join(root,'escape')),false);assert.deepEqual(fs.readdirSync(parent),[]);
  } finally { lib.close(); }
});

test('registration failures retain a verified imported notebook and report its recovery path', async t => {
  const root=fixture(t),source=new NoteLibrary(path.join(root,'source'),undefined,'create'),file=path.join(root,'book.nabook'),parent=path.join(root,'imports'),data=path.join(root,'device');fs.mkdirSync(parent);fs.mkdirSync(data);let failing=false;
  const registry=new LibraryRegistry(data,path.join(root,'other'),stage=>{if(failing&&stage==='registry')throw Error('Simulated registry failure');});
  try {
    const note=source.create(randomUUID(),{primaryFormat:'text',title:'Retained',body:'Preserved on failure'}).note;await exportNotebookArchive(source.path,file,ignore);failing=true;
    let retained;await assert.rejects(registry.importArchive(file,parent,ignore),error=>{retained=error.details?.targetPath;return error.code==='WRITE_FAILED'&&!!retained;});
    assert.equal(registry.state().entries.length,1);const imported=new NoteLibrary(retained,undefined,'existing');try{assert.equal(imported.read(note.id).body,'Preserved on failure');}finally{imported.close();}
  } finally { source.close();registry.close(); }
});

test('export refuses existing destinations and notebook paths, and duplicate imports leave registry and target unchanged', async t => {
  const root=fixture(t),data=path.join(root,'device');fs.mkdirSync(data);const registry=new LibraryRegistry(data,path.join(root,'source')),file=path.join(root,'book.nabook'),parent=path.join(root,'imports');fs.mkdirSync(parent);
  try {
    const library=registry.get(),id=registry.state().entries[0].id;library.create(randomUUID());await registry.exportArchive(id,file,ignore);const original=fs.readFileSync(file);
    await assert.rejects(registry.exportArchive(id,file,ignore));assert.deepEqual(fs.readFileSync(file),original);
    await assert.rejects(exportNotebookArchive(library.path,path.join(library.path,'bad.nabook'),ignore));
    await assert.rejects(registry.importArchive(file,parent,ignore),error=>error.code==='DUPLICATE_LIBRARY');assert.deepEqual(fs.readdirSync(parent),[]);assert.equal(registry.state().entries.length,1);
    assert.ok(!fs.readdirSync(root).some(name=>name.startsWith('.notebookaid')));
  } finally { registry.close(); }
});
