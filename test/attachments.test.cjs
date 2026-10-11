const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { NoteLibrary } = require('../dist/runtime/core/library');
const { planImport, executeImport } = require('../dist/runtime/core/library-import');
const { exportAttachmentFile } = require('../dist/runtime/core/attachments');
const root = () => { fs.mkdirSync('output/attachment-tests',{recursive:true}); return fs.mkdtempSync(path.resolve('output/attachment-tests/case-')); };
const request = (lib,id) => { const s=lib.begin(id,'test'); return { noteId:id,token:s.token,generation:s.generation,expectedVersion:s.note.version,operationId:randomUUID() }; };

test('Attachments preserve bytes, names, revisions, duplicate names, paths and restart', () => {
  const base=root(), dir=path.join(base,'book'), file=path.join(base,'test.txt');fs.writeFileSync(file,'Attachment content');
  let lib=new NoteLibrary(dir);const id=lib.create(randomUUID(),{title:'Note',body:'',primaryFormat:'markdown'}).note.id;
  try {
    const req=request(lib,id), first=lib.addAttachment(req,'test',file).note;
    assert.equal(lib.addAttachment(req,'test',file).note.version,first.version);
    assert.equal(first.attachments[0].name,'test.txt');
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'library.json'))).schemaVersion,4);
    const backups=fs.readdirSync(dir+'.attachment-backups');assert.equal(backups.length,1);
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir+'.attachment-backups',backups[0],'library.json'))).schemaVersion,1);
    const second=lib.addAttachment(request(lib,id),'test',file).note;assert.equal(second.attachments[1].name,'test (2).txt');
    const aid=first.attachments[0].id;
    lib.renameAttachment(request(lib,id),'test',aid,'renamed.txt');
    assert.throws(()=>lib.renameAttachment(request(lib,id),'test',aid,'../escape.txt'));
    assert.throws(()=>lib.renameAttachment(request(lib,id),'test',aid,'test (2).txt'));
    const folder=randomUUID();lib.editOrganization({kind:'folder',id:folder,name:'Folder',parentId:null,expectedVersion:0});
    lib.place({...request(lib,id),folderId:folder,tagIds:[],pinned:false},'test');
    assert.equal(lib.attachmentBytes(id,aid).toString(),'Attachment content');
    const historic=JSON.parse(fs.readFileSync(path.join(dir,'notes',id,'revisions',first.revisionId,'metadata.json')));assert.equal(historic.attachments[0].name,'test.txt');
    lib.close();lib=new NoteLibrary(dir);assert.equal(lib.read(id).attachments[0].name,'renamed.txt');
    assert.equal(lib.attachmentList(id)[0].available,true);
    fs.writeFileSync(path.join(dir,'notes',id,'attachments',aid),'corrupt');assert.equal(lib.attachmentList(id)[0].available,false);
    assert.throws(()=>lib.attachmentBytes(id,aid));assert.equal(lib.read(id).title,'Note');
    fs.unlinkSync(path.join(dir,'notes',id,'attachments',aid));assert.equal(lib.attachmentList(id)[0].available,false);
  } finally {lib.close();}
});

test('Attachment writes enforce sessions, size and version; exports never overwrite or enter protected roots', () => {
  const base=root(), file=path.join(base,'data.bin');fs.writeFileSync(file,'hello');const lib=new NoteLibrary(path.join(base,'book'));
  try {
    const id=lib.create(randomUUID()).note.id,req=request(lib,id);
    assert.throws(()=>lib.addAttachment(req,'other',file),e=>e.code==='SESSION_EXPIRED');
    lib.addAttachment(req,'test',file);
    assert.throws(()=>lib.addAttachment({...req,operationId:randomUUID()},'test',file),e=>e.code==='VERSION_CONFLICT');
    const big=path.join(base,'big.bin');const fd=fs.openSync(big,'w');fs.ftruncateSync(fd,20*1024*1024+1);fs.closeSync(fd);
    assert.throws(()=>lib.addAttachment(request(lib,id),'test',big));
    const target=path.join(base,'copy.bin');exportAttachmentFile(target,Buffer.from('hello'),[lib.path]);assert.equal(fs.readFileSync(target,'utf8'),'hello');
    assert.throws(()=>exportAttachmentFile(target,Buffer.from('overwritten'),[]));
    assert.throws(()=>exportAttachmentFile(path.join(lib.path,'copy.bin'),Buffer.from('x'),[lib.path]));
  } finally {lib.close();}
});

test('Native import carries attachment history without changing source; repeat imports skip', () => {
  const base=root(), sourcePath=path.join(base,'source'),targetPath=path.join(base,'target');let source=new NoteLibrary(sourcePath);let target=new NoteLibrary(targetPath);
  const file=path.join(base,'test.txt');fs.writeFileSync(file,'native attachment');
  const id=source.create(randomUUID()).note.id;const note=source.addAttachment(request(source,id),'test',file).note;source.close();
  try {
    const before=fs.readFileSync(path.join(sourcePath,'library.json'),'utf8');
    const result=executeImport(planImport(sourcePath,targetPath));assert.equal(result.targetVersion,4);
    target.reloadImported();assert.equal(target.attachmentBytes(id,note.attachments[0].id).toString(),'native attachment');
    assert.equal(executeImport(planImport(sourcePath,targetPath)).skipped,1);
    assert.equal(fs.readFileSync(path.join(sourcePath,'library.json'),'utf8'),before);
  } finally {target.close();}
});

test('Failed attachment commit retains the old revision; uncertain committed result is replayable', () => {
  const base=root(),dir=path.join(base,'book'),file=path.join(base,'note.txt');fs.writeFileSync(file,'payload');let fault='';
  const lib=new NoteLibrary(dir,stage=>{if(stage===fault)throw Error('injected');});
  try {
    const id=lib.create(randomUUID()).note.id, before=lib.read(id);
    fault='journal';assert.throws(()=>lib.addAttachment(request(lib,id),'test',file));assert.equal(lib.read(id).version,before.version);assert.equal(lib.read(id).attachments,undefined);
    fault='head';const req=request(lib,id);assert.equal(lib.addAttachment(req,'test',file).indexed,false);
    fault='';const result=lib.addAttachment(req,'test',file);assert.equal(result.note.attachments.length,1);assert.equal(lib.attachmentBytes(id,result.note.attachments[0].id).toString(),'payload');
  } finally {lib.close();}
});

test('Unlink retains payload, body and history; replays safely and imports historical files', () => {
  const base=root(),dir=path.join(base,'book'),file=path.join(base,'data.txt');fs.writeFileSync(file,'retained payload');
  const lib=new NoteLibrary(dir);const target=new NoteLibrary(path.join(base,'target'));let closed=false;
  try {
    const id=lib.create(randomUUID(),{title:'Note',body:'Unchanged body',primaryFormat:'markdown'}).note.id;
    const before=lib.addAttachment(request(lib,id),'test',file).note, aid=before.attachments[0].id;
    const req=request(lib,id);
    assert.throws(()=>lib.unlinkAttachment(req,'other',aid),e=>e.code==='SESSION_EXPIRED');
    assert.throws(()=>lib.unlinkAttachment({...req,expectedVersion:0},'test',aid),e=>e.code==='VERSION_CONFLICT');
    const after=lib.unlinkAttachment(req,'test',aid).note;
    assert.equal(after.body,before.body);assert.equal(after.contentVersion,before.contentVersion);assert.deepEqual(after.attachments,[]);
    assert.equal(lib.unlinkAttachment(req,'test',aid).note.version,after.version);
    assert.throws(()=>lib.attachmentBytes(id,aid),e=>e.code==='NOT_FOUND_OR_UNAVAILABLE');
    assert.equal(fs.readFileSync(path.join(dir,'notes',id,'attachments',aid),'utf8'),'retained payload');
    assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'notes',id,'revisions',before.revisionId,'metadata.json'))).attachments[0].id,aid);
    lib.close();closed=true;executeImport(planImport(dir,target.path));target.reloadImported();
    assert.deepEqual(target.read(id).attachments,[]);
    assert.equal(fs.readFileSync(path.join(target.path,'notes',id,'attachments',aid),'utf8'),'retained payload');
  } finally {if(!closed)lib.close();target.close();}
});

test('SVG attachments are recognized after renaming while retaining schema 4 compatibility', () => {
  const base=root(),file=path.join(base,'drawing.svg');fs.writeFileSync(file,'<svg xmlns="http://www.w3.org/2000/svg" width="10" height="5"><rect width="10" height="5"/></svg>');
  const lib=new NoteLibrary(path.join(base,'book'));
  try {
    const id=lib.create(randomUUID()).note.id;
    const note=lib.addAttachment(request(lib,id),'test',file).note, aid=note.attachments[0].id;
    assert.equal(note.attachments[0].mediaType,'application/octet-stream');
    assert.equal(lib.attachmentList(id)[0].mediaType,'image/svg+xml');
    lib.renameAttachment(request(lib,id),'test',aid,'drawing.txt');
    assert.equal(lib.attachmentList(id)[0].mediaType,'image/svg+xml');
    assert.deepEqual(lib.attachmentBytes(id,aid),fs.readFileSync(file));
  } finally {lib.close();}
});
