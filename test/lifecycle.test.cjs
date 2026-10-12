const {deltaSnapshot}=require('../dist/runtime/shared/delta-document');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {randomUUID}=require('node:crypto');
const {NoteLibrary}=require('../dist/runtime/core/library');
const {planImport,executeImport}=require('../dist/runtime/core/library-import');
function root(){fs.mkdirSync('output/lifecycle-tests',{recursive:true});return fs.mkdtempSync(path.resolve('output/lifecycle-tests/case-'));}
const code=c=>e=>e.code===c;
for(const format of ['markdown','html','text','delta']) test(format+' history, restore, trash and permanent deletion',()=>{
 const dir=root();let lib=new NoteLibrary(dir);try{
 const body=format==='delta'?deltaSnapshot([{insert:'Original\n'}]):'Original';
 let note=lib.create(randomUUID(),{primaryFormat:format,title:'Original',body}).note;
 const first=note.revisionId;const session=lib.begin(note.id,'test');
 const nextBody=format==='delta'?deltaSnapshot([{insert:'Changed\n'}]):'Changed';
 note=lib.save({noteId:note.id,token:session.token,generation:session.generation,expectedVersion:note.version,operationId:randomUUID(),title:'Changed',body:nextBody},'test').note;
 assert.throws(()=>lib.restore(note.id,note.version,randomUUID(),first),code('NOTE_IN_USE'));
 lib.end(session.token,session.generation,'test');
 const restored=lib.restore(note.id,note.version,randomUUID(),first).note;
 assert.equal(restored.body,body);assert.equal(restored.version,3);assert.equal(lib.history(note.id).total,3);
 assert.throws(()=>lib.revision(note.id,randomUUID()),code('NOT_FOUND_OR_UNAVAILABLE'));
 assert.throws(()=>lib.purge(note.id,3,randomUUID()),code('INVALID_INPUT'));
 const trash=lib.trash(note.id,3,randomUUID()).note;assert.equal(lib.list().length,0);assert.equal(lib.query({view:'trash'}).total,1);
 lib.close();lib=new NoteLibrary(dir);assert.equal(lib.query({view:'trash'}).total,1);
 const back=lib.restore(note.id,trash.version,randomUUID()).note;assert.equal(back.deletedAt,null);assert.equal(lib.list().length,1);
 const deleted=lib.trash(note.id,back.version,randomUUID()).note,op=randomUUID();
 lib.purge(note.id,deleted.version,op);lib.purge(note.id,deleted.version,op);
 assert.equal(fs.existsSync(path.join(dir,'notes',note.id)),false);assert.equal(lib.query({view:'trash'}).total,0);
 assert.throws(()=>lib.purge(note.id,deleted.version+1,op),code('INVALID_INPUT'));
 lib.close();lib=new NoteLibrary(dir);assert.equal(lib.list().length,0);assert.throws(()=>lib.history(note.id));
 }finally{lib.close();}
});
for(const stage of ['purge-journal','purge-moved'])test('purge recovery after '+stage,()=>{
 const dir=root();let armed=false;let lib=new NoteLibrary(dir,value=>{if(armed&&value===stage)throw Error('Crash');});try{
 let note=lib.create(randomUUID()).note;note=lib.trash(note.id,note.version,randomUUID()).note;armed=true;
 assert.throws(()=>lib.purge(note.id,note.version,randomUUID()));lib.close();lib=new NoteLibrary(dir);
 assert.equal(lib.query({view:'trash'}).total,0);assert.equal(fs.existsSync(path.join(dir,'notes',note.id)),false);
 }finally{lib.close();}
});
test('organization deletion protects current references and preserves restorable/importable history',()=>{
 const source=root(),target=root();let lib=new NoteLibrary(source),dest=new NoteLibrary(target);dest.close();try{
 const folder=randomUUID(),tag=randomUUID();lib.editOrganization({kind:'folder',id:folder,name:'Folder',parentId:null,expectedVersion:0});lib.editOrganization({kind:'tag',id:tag,name:'Tag',color:'#123456',expectedVersion:1});
 let note=lib.create(randomUUID(),{primaryFormat:'text',title:'Note',body:'Text',folderId:folder}).note;
 const session=lib.begin(note.id,'test');note=lib.place({noteId:note.id,token:session.token,generation:session.generation,expectedVersion:note.version,operationId:randomUUID(),folderId:folder,tagIds:[tag],pinned:true},'test').note;
 const first=note.revisionId;assert.throws(()=>lib.deleteOrganization('tag',tag,2),code('NOTE_IN_USE'));assert.throws(()=>lib.deleteOrganization('folder',folder,2),code('NOTE_IN_USE'));
 note=lib.place({noteId:note.id,token:session.token,generation:session.generation,expectedVersion:note.version,operationId:randomUUID(),folderId:null,tagIds:[],pinned:false},'test').note;lib.end(session.token,session.generation,'test');
 lib.deleteOrganization('folder',folder,2);lib.deleteOrganization('tag',tag,3);
 note=lib.restore(note.id,note.version,randomUUID(),first).note;assert.equal(note.folderId,null);assert.deepEqual(note.tagIds,[]);assert.equal(note.pinned,false);
 assert.equal(JSON.parse(fs.readFileSync(path.join(source,'library.json'))).schemaVersion,6);lib.close();
 const result=executeImport(planImport(source,target));assert.equal(result.imported,1);dest=new NoteLibrary(target);assert.equal(dest.list().length,1);dest.close();lib=new NoteLibrary(source);assert.equal(lib.history(note.id).total,4);
 }finally{lib.close();}
});
test('historical attachments restore their links and reject missing data',()=>{
 const base=root(),dir=path.join(base,'book'),file=path.join(base,'data.txt');fs.writeFileSync(file,'private attachment');const lib=new NoteLibrary(dir);
 try{
 let note=lib.create(randomUUID()).note;const session=lib.begin(note.id,'test');
 const request=()=>({noteId:note.id,token:session.token,generation:session.generation,expectedVersion:note.version,operationId:randomUUID()});
 note=lib.addAttachment(request(),'test',file).note;const revision=note.revisionId,attachment=note.attachments[0];
 note=lib.unlinkAttachment(request(),'test',attachment.id).note;lib.end(session.token,session.generation,'test');assert.equal(note.attachments.length,0);
 note=lib.restore(note.id,note.version,randomUUID(),revision).note;assert.equal(note.attachments[0].id,attachment.id);
 fs.unlinkSync(path.join(dir,'notes',note.id,'attachments',attachment.id));assert.throws(()=>lib.restore(note.id,note.version,randomUUID(),revision));assert.equal(lib.read(note.id).version,note.version);
 }finally{lib.close();}
});
test('history pagination and content validation',()=>{
 const lib=new NoteLibrary(root());try{
 let note=lib.create(randomUUID()).note;const session=lib.begin(note.id,'test');
 for(let i=0;i<21;i++)note=lib.save({noteId:note.id,token:session.token,generation:session.generation,expectedVersion:note.version,operationId:randomUUID(),title:'Version '+i,body:'Text '+i},'test').note;
 assert.equal(lib.history(note.id).revisions.length,20);assert.equal(lib.history(note.id,20).revisions.length,2);assert.throws(()=>lib.history(note.id,-1),code('INVALID_INPUT'));
 const older=lib.history(note.id,20).revisions[0];fs.writeFileSync(path.join(lib.path,'notes',note.id,'revisions',older.revisionId,'content.md'),'corrupt');assert.throws(()=>lib.revision(note.id,older.revisionId),code('INTEGRITY_CHECK_FAILED'));
 }finally{lib.close();}
});
test('permanent deletion rejects linked payloads without touching outside files',()=>{
 const base=root(),outside=path.join(base,'outside'),dir=path.join(base,'book');fs.mkdirSync(outside);fs.writeFileSync(path.join(outside,'keep.txt'),'keep');const lib=new NoteLibrary(dir);
 try{let note=lib.create(randomUUID()).note;note=lib.trash(note.id,note.version,randomUUID()).note;fs.symlinkSync(outside,path.join(dir,'notes',note.id,'linked'),'junction');assert.throws(()=>lib.purge(note.id,note.version,randomUUID()),code('INVALID_INPUT'));assert.equal(fs.readFileSync(path.join(outside,'keep.txt'),'utf8'),'keep');assert.equal(lib.query({view:'trash'}).total,1);}finally{lib.close();}
});
function versions(lib,count){let note=lib.create(randomUUID()).note;const session=lib.begin(note.id,'test');for(let i=1;i<count;i++)note=lib.save({noteId:note.id,token:session.token,generation:session.generation,expectedVersion:note.version,operationId:randomUUID(),title:'Version '+i,body:'Body '+i},'test').note;lib.end(session.token,session.generation,'test');return note;}
test('manual history cleanup keeps the chosen count, survives restart and imports without losing retained versions',()=>{
 const dir=root(),target=root();let lib=new NoteLibrary(dir),dest=new NoteLibrary(target);dest.close();try{
 let note=versions(lib,53);const old=lib.history(note.id,40).revisions.at(-1).revisionId;const op=randomUUID();
 assert.equal(lib.cleanHistory(note.id,note.version,50,op),3);assert.equal(lib.cleanHistory(note.id,note.version,50,op),3);assert.throws(()=>lib.cleanHistory(note.id,note.version,49,op),code('INVALID_INPUT'));assert.equal(lib.history(note.id).total,50);assert.equal(lib.read(note.id).version,53);assert.equal(lib.status().pendingRecovery,0);assert.throws(()=>lib.revision(note.id,old),code('NOT_FOUND_OR_UNAVAILABLE'));
 lib.close();lib=new NoteLibrary(dir);assert.equal(lib.history(note.id).total,50);assert.equal(lib.status().issues.some(x=>x.startsWith('DAMAGED_HISTORY')),false);
 note=lib.restore(note.id,note.version,randomUUID(),lib.history(note.id,40).revisions.at(-1).revisionId).note;assert.equal(lib.history(note.id).total,51);
 lib.close();executeImport(planImport(dir,target));dest=new NoteLibrary(target);assert.equal(dest.history(note.id).total,51);assert.equal(dest.read(note.id).version,54);dest.close();lib=new NoteLibrary(dir);
 assert.equal(lib.cleanHistory(note.id,note.version,1,randomUUID()),50);assert.equal(lib.history(note.id).total,1);assert.equal(lib.read(note.id).version,54);assert.throws(()=>lib.cleanHistory(note.id,note.version,0,randomUUID()),code('INVALID_INPUT'));
 }finally{lib.close();}
});
for(const stage of ['history-floor','history-pruned'])test('manual cleanup resumes after '+stage,()=>{
 const dir=root();let armed=false,lib=new NoteLibrary(dir,value=>{if(armed&&value===stage)throw Error('Crash');});try{const note=versions(lib,4);armed=true;assert.throws(()=>lib.cleanHistory(note.id,note.version,2,randomUUID()));lib.close();lib=new NoteLibrary(dir);assert.equal(lib.history(note.id).total,2);assert.equal(fs.readdirSync(path.join(dir,'notes',note.id,'revisions')).length,2);assert.equal(lib.status().pendingRecovery,0);}finally{lib.close();}
});
