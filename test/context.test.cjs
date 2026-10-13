const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs'),path=require('node:path');const {randomUUID}=require('node:crypto');
const {NoteLibrary}=require('../dist/runtime/core/library');
const root=()=>{fs.mkdirSync('output/context-tests',{recursive:true});return fs.mkdtempSync(path.resolve('output/context-tests/case-'));};
const req=session=>({noteId:session.note.id,token:session.token,generation:session.generation,expectedVersion:session.note.version,operationId:randomUUID()});
test('duplicate keeps independent attachment bytes, placement and idempotent identity',()=>{
 const dir=root(),lib=new NoteLibrary(path.join(dir,'book'));try{
 let note=lib.create(randomUUID(),{title:'Original',body:'Body',primaryFormat:'text'}).note;let session=lib.begin(note.id,'owner');
 const file=path.join(dir,'payload.txt');fs.writeFileSync(file,'Attachment payload');note=lib.addAttachment(req(session),'owner',file).note;session={...session,note};
 const folder=randomUUID(),tag=randomUUID();lib.editOrganization({kind:'folder',id:folder,name:'Nested',parentId:null,expectedVersion:lib.organization().version});lib.editOrganization({kind:'tag',id:tag,name:'Tag',color:'#7460c9',expectedVersion:lib.organization().version});
 note=lib.place({...req(session),folderId:folder,tagIds:[tag],pinned:true},'owner').note;session={...session,note};const request=req(session),copy=lib.duplicate(request,'owner','Copy').note;
 assert.notEqual(copy.id,note.id);assert.equal(copy.body,note.body);assert.equal(copy.version,1);assert.equal(copy.folderId,folder);assert.deepEqual(copy.tagIds,[tag]);assert.equal(copy.pinned,false);assert.equal(lib.duplicate(request,'owner','Copy').note.id,copy.id);
 assert.equal(lib.attachmentBytes(copy.id,copy.attachments[0].id).toString(),'Attachment payload');assert.throws(()=>lib.duplicate(request,'other','Copy'),e=>e.code==='SESSION_EXPIRED');assert.throws(()=>lib.duplicate({...request,operationId:randomUUID(),expectedVersion:1},'owner','Copy'),e=>e.code==='VERSION_CONFLICT');
 fs.writeFileSync(path.join(lib.path,'notes',note.id,'attachments',note.attachments[0].id),'Damaged');assert.equal(lib.attachmentBytes(copy.id,copy.attachments[0].id).toString(),'Attachment payload');assert.throws(()=>lib.duplicate({...request,operationId:randomUUID()},'owner','Corrupt copy'),e=>e.code==='INTEGRITY_CHECK_FAILED');
 }finally{lib.close();}
});
test('encrypted duplicates stay encrypted on disk and become inaccessible when locked',async()=>{
 const dir=root(),lib=new NoteLibrary(path.join(dir,'book'));try{
 let note=lib.create(randomUUID(),{title:'SECRET_SOURCE',body:'SECRET_CONTEXT_BODY',primaryFormat:'markdown'}).note;const session=lib.begin(note.id,'owner');const file=path.join(dir,'secret.txt');fs.writeFileSync(file,'SECRET_CONTEXT_ATTACHMENT');note=lib.addAttachment({...req(session),expectedVersion:note.version},'owner',file).note;lib.end(session.token,session.generation,'owner');
 await lib.securityCommand({action:'setup',password:'Context test password 123'});lib.protect(note.id,note.version,true);lib.setVisibility(note.id,note.version,false);const encrypted=lib.begin(note.id,'owner'),copy=lib.duplicate(req(encrypted),'owner','SECRET_COPY').note;
 assert.equal(copy.encrypted,true);assert.equal(copy.visibleInThunderbird,false);assert.equal(lib.attachmentBytes(copy.id,copy.attachments[0].id).toString(),'SECRET_CONTEXT_ATTACHMENT');
 const walk=directory=>fs.readdirSync(directory).flatMap(name=>{const file=path.join(directory,name);return fs.statSync(file).isDirectory()?walk(file):[file];});for(const file of walk(path.join(lib.path,'notes',copy.id))){const bytes=fs.readFileSync(file);assert.equal(bytes.includes(Buffer.from('SECRET_')),false,file);}
 lib.lockSecurity();assert.throws(()=>lib.read(copy.id),e=>e.code==='NOTEBOOK_LOCKED');
 }finally{lib.close();}
});
test('a committed duplicate with an interrupted response replays once without changing the source',()=>{
 const dir=root();let fault='';const lib=new NoteLibrary(path.join(dir,'book'),stage=>{if(stage===fault)throw Error('Injected failure');});try{
 const source=lib.create(randomUUID(),{title:'Source',body:'Original body',primaryFormat:'markdown'}).note,session=lib.begin(source.id,'owner'),request=req(session);
 fault='head';const result=lib.duplicate(request,'owner','Copy');assert.equal(result.indexed,false);fault='';assert.equal(lib.duplicate(request,'owner','Copy').note.id,result.note.id);assert.deepEqual(lib.read(source.id),source);assert.equal(lib.list().length,2);
 assert.throws(()=>lib.duplicate(request,'owner','Different request'),e=>e.code==='INVALID_INPUT');
 }finally{lib.close();}
});
