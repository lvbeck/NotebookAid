const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const {NoteLibrary}=require('../dist/runtime/core/library'),{decryptNotes}=require('../dist/runtime/core/decrypt-bulk'),{verifyBackup}=require('../dist/runtime/core/backups');
const password='Bulk decryption test password';
const root=()=>{fs.mkdirSync('output/decrypt-tests',{recursive:true});return fs.mkdtempSync(path.resolve('output/decrypt-tests/case-'));};
const request=session=>({noteId:session.note.id,expectedVersion:session.note.version,token:session.token,generation:session.generation,operationId:randomUUID()});
test('bulk decryption includes trash, retains history and attachments, and backs up encrypted originals',async()=>{
 const dir=root();let lib=new NoteLibrary(path.join(dir,'book'));try{
  let note=lib.create(randomUUID(),{title:'Private note',body:'Private body',primaryFormat:'markdown'}).note;
  const session=lib.begin(note.id,'test'),file=path.join(dir,'attachment.txt');fs.writeFileSync(file,'Private attachment');note=lib.addAttachment(request(session),'test',file).note;lib.end(session.token,session.generation,'test');
  const trash=lib.create(randomUUID(),{title:'Deleted private note',body:'Deleted body',primaryFormat:'text'}).note;
  const plain=lib.create(randomUUID(),{title:'Plain note',body:'Plain body',primaryFormat:'text'}).note;
  await lib.securityCommand({action:'setup',password});lib.protect(note.id,note.version,true);lib.protect(trash.id,trash.version,true);lib.trash(trash.id,trash.version,randomUUID());
  const before=lib.read(note.id);assert.equal(lib.encryptedNotes().length,2);assert.equal(lib.encryptedNotes().some(row=>row.deleted),true);
  lib.lockSecurity();assert.throws(()=>lib.encryptedNotes(),e=>e.code==='NOTEBOOK_LOCKED');
  await assert.rejects(decryptNotes(lib,'Wrong password',()=>{},()=>{}),e=>e.code==='BAD_CREDENTIAL');assert.equal(fs.existsSync(path.join(dir,'book.security-backups')),false);
  const progress=[],report=await decryptNotes(lib,password,p=>progress.push(p),()=>{});assert.equal(report.succeeded,2);assert.equal(report.failed,0);verifyBackup(report.backupPath);
  assert.equal(fs.existsSync(path.join(report.backupPath,'notebook','notes',note.id,'security.json')),true);
  assert.equal(lib.securityState().configured,true);assert.equal(lib.encryptedNotes().length,0);assert.equal(lib.read(note.id).body,before.body);assert.equal(lib.read(note.id).version,before.version);assert.equal(lib.attachmentBytes(note.id,note.attachments[0].id).toString(),'Private attachment');assert.equal(lib.read(trash.id).deletedAt!==null,true);assert.deepEqual(lib.read(plain.id),plain);assert.deepEqual(progress.map(p=>p.processed),[0,1,2]);
  await lib.securityCommand({action:'disable',credential:password});lib.close();lib=new NoteLibrary(path.join(dir,'book'));assert.equal(lib.read(note.id).body,'Private body');assert.equal(lib.securityState().configured,false);
 }finally{lib.close();}
});
test('active editing or a cancelled guard prevents bulk plaintext writes and backups',async()=>{
 const dir=root(),lib=new NoteLibrary(path.join(dir,'book'));try{
  const note=lib.create(randomUUID(),{title:'Note',body:'Body',primaryFormat:'text'}).note;await lib.securityCommand({action:'setup',password});lib.protect(note.id,note.version,true);
  const session=lib.begin(note.id,'other');await assert.rejects(decryptNotes(lib,password,()=>{},()=>{}),e=>e.code==='NOTE_IN_USE');lib.end(session.token,session.generation,'other');
  await assert.rejects(decryptNotes(lib,password,()=>{},()=>{throw Error('Cancelled');}));assert.equal(lib.read(note.id).encrypted,true);assert.equal(fs.existsSync(path.join(dir,'book.security-backups')),false);
 }finally{lib.close();}
});
test('corrupt encrypted attachments stop the batch and retain master protection',async()=>{
 const dir=root(),lib=new NoteLibrary(path.join(dir,'book'));try{
  let note=lib.create(randomUUID(),{title:'Note',body:'Body',primaryFormat:'text'}).note;const file=path.join(dir,'attachment.txt');fs.writeFileSync(file,'Attachment');const session=lib.begin(note.id,'test');note=lib.addAttachment(request(session),'test',file).note;lib.end(session.token,session.generation,'test');
  await lib.securityCommand({action:'setup',password});lib.protect(note.id,note.version,true);fs.writeFileSync(path.join(lib.path,'notes',note.id,'attachments',note.attachments[0].id),'Corrupt');
  const report=await decryptNotes(lib,password,()=>{},()=>{});assert.equal(report.failed,1);assert.equal(report.succeeded,0);assert.equal(report.errors[0].code,'INTEGRITY_CHECK_FAILED');assert.equal(lib.read(note.id).encrypted,true);assert.equal(lib.securityState().configured,true);verifyBackup(report.backupPath);
 }finally{lib.close();}
});
