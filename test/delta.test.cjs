const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const { NoteLibrary } = require('../dist/runtime/core/library');
const { parseDelta, deltaSnapshot, emptyDelta } = require('../dist/runtime/shared/delta-document');
const { parseNative, serializeNative } = require('../dist/runtime/core/delta-files');
const { importNote, exportNote } = require('../dist/runtime/core/note-files');
const { planImport, executeImport } = require('../dist/runtime/core/library-import');
const root = () => { fs.mkdirSync('output/delta-tests',{recursive:true});return fs.mkdtempSync(path.resolve('output/delta-tests/case-')); };
const body = deltaSnapshot([{insert:'Searchable Delta text',attributes:{bold:true}},{insert:'\n'},{insert:'Task'},{insert:'\n',attributes:{list:'checked',indent:2}},{insert:'let x=1;'},{insert:'\n',attributes:{'code-block':'javascript'}},{insert:'Cell'},{insert:'\n',attributes:{table:'row-1','cell-header':'true'}}]);
test('Delta full snapshots persist, search, recover, replay and reject invalid saves',()=>{
 const dir=root(),book=path.join(dir,'book');let lib=new NoteLibrary(book);
 try {
  const legacy=lib.create(randomUUID()).note;assert.equal(JSON.parse(fs.readFileSync(path.join(book,'library.json'))).schemaVersion,1);
  const op=randomUUID(),note=lib.create(op,{title:'Native',primaryFormat:'delta',body}).note;
  assert.equal(lib.create(op,{title:'Native',primaryFormat:'delta',body}).note.id,note.id);
  assert.equal(JSON.parse(fs.readFileSync(path.join(book,'library.json'))).schemaVersion,5);
  assert.equal(fs.readdirSync(book+'.delta-backups').length,1);
  assert.equal(lib.read(legacy.id).primaryFormat,'markdown');
  assert.equal(lib.query({text:'Searchable Delta text'}).total,1);
  const session=lib.begin(note.id,'test'),req={noteId:note.id,token:session.token,generation:session.generation,expectedVersion:note.version,operationId:randomUUID(),title:'Native',body:'{"ops":[{"delete":1}]}'};
  assert.throws(()=>lib.save(req,'test'));assert.equal(lib.read(note.id).body,body);
  const updated=deltaSnapshot([{insert:'Changed complete document\n'}]);lib.save({...req,body:updated},'test');
  lib.close();lib=new NoteLibrary(book);assert.equal(lib.read(note.id).body,updated);lib.rebuild();assert.equal(lib.list().length,2);
 }finally{lib.close();}
});
test('Delta rejects incremental operations, unknown versions, attributes, unsafe URLs and malformed blocks',()=>{
 const wrap=ops=>JSON.stringify({format:'NotebookAidDelta',version:1,ops});
 for(const ops of [[{retain:1}],[{delete:1}],[{insert:'no newline'}],[{insert:'x\n',attributes:{onclick:'evil'}}],[{insert:{video:'https://example.com'}},{insert:'\n'}],[{insert:'x',attributes:{link:'javascript:alert(1)'}},{insert:'\n'}],[{insert:'x\n',attributes:{header:1}}],[{insert:{image:'file:///C:/private'}},{insert:'\n'}]])assert.throws(()=>parseDelta(wrap(ops)));
 assert.throws(()=>parseDelta(emptyDelta.replace('"version":1','"version":9')),e=>e.code==='UNSUPPORTED_DELTA');
 assert.deepEqual(parseDelta(body).ops,JSON.parse(body).ops);
});
test('Native exchange verifies metadata, attachment bytes, paths and missing resources',()=>{
 const dir=root(),id=randomUUID(),bytes=Buffer.from('attachment fixture'),file={id,name:'test.txt',size:bytes.length,mediaType:'application/octet-stream',sha256:createHash('sha256').update(bytes).digest('hex'),data:bytes.toString('base64')};
 const input={title:'Native exchange',primaryFormat:'delta',body:deltaSnapshot([{insert:{image:'attachments/'+id},attributes:{width:'200',height:'100'}},{insert:'\n'}]),nativeAttachments:[file]};
 const serialized=serializeNative(input);assert.equal(parseNative(serialized).body,input.body);
 assert.throws(()=>parseNative(serialized.replace('Native exchange','Changed title')));
 assert.throws(()=>serializeNative({...input,nativeAttachments:[]}));
 assert.throws(()=>serializeNative({...input,nativeAttachments:[{...file,data:'AAAA'}]}));
 assert.throws(()=>serializeNative({...input,nativeAttachments:[{...file,name:'../escape'}]}));
 const target=path.join(dir,'copy.nadelta');exportNote(target,input,[]);assert.deepEqual(importNote(target),input);assert.throws(()=>exportNote(target,input,[]));
 let a=new NoteLibrary(path.join(dir,'a')),b=new NoteLibrary(path.join(dir,'b'));
 try {const note=a.create(randomUUID(),importNote(target)).note;assert.equal(a.attachmentBytes(note.id,id).toString(),bytes.toString());a.close();a=null;executeImport(planImport(path.join(dir,'a'),b.path));b.close();b=new NoteLibrary(path.join(dir,'b'));assert.equal(b.read(note.id).body,input.body);assert.equal(b.attachmentBytes(note.id,id).toString(),bytes.toString());}finally{a?.close();b.close();}
});

test('Native limits match note attachment limits and failed exports leave no partial file',()=>{
 const {writeNative}=require('../dist/runtime/core/delta-files');
 const {validateAttachments}=require('../dist/runtime/core/attachments');
 const meta=(size)=>({id:randomUUID(),name:randomUUID()+'.bin',size,sha256:'0'.repeat(64),mediaType:'application/octet-stream'});
 assert.doesNotThrow(()=>validateAttachments(Array.from({length:10},()=>meta(20*1024*1024))));
 assert.doesNotThrow(()=>validateAttachments(Array.from({length:50},()=>meta(4*1024*1024))));
 for(const items of [Array.from({length:51},()=>meta(0)),[meta(20*1024*1024+1)],Array.from({length:11},()=>meta(20*1024*1024))]){
  const dir=root(),target=path.join(dir,'invalid.nadelta');
  assert.throws(()=>exportNote(target,{primaryFormat:'delta',title:'Limit',body:emptyDelta},[],{items,read:()=>{throw Error('Should reject metadata before reading')}}));
  assert.equal(fs.existsSync(target),false);
 }
 const dir=root(),target=path.join(dir,'corrupt.nadelta');
 assert.throws(()=>exportNote(target,{primaryFormat:'delta',title:'Limit',body:emptyDelta},[],{items:[meta(1)],read:()=>Buffer.from('x')}));
 assert.equal(fs.existsSync(target),false);
});
test('Native import tokens bind owner, notebook, payload and retry operation',()=>{
 const {NativeImportCache}=require('../dist/runtime/desktop/native-import');
 const cache=new NativeImportCache(),input={primaryFormat:'delta',title:'Token',body:emptyDelta,nativeAttachments:[]};
 try {
  const lite=cache.put('owner','book',input);
  assert.equal(lite.nativeAttachments,undefined);
  for(const args of [['other','book','op',lite],['owner','other','op',lite],['owner','book','op',{...lite,title:'Changed'}],['owner','book','op',{...lite,nativeAttachments:[]}]])assert.throws(()=>cache.resolve(...args));
  assert.deepEqual(cache.resolve('owner','book','op',lite).input.nativeAttachments,[]);
  const result={note:{id:'note'}};cache.complete('op',lite,result);
  assert.equal(cache.resolve('owner','book','op',lite).result,result);
  assert.throws(()=>cache.resolve('owner','book','another',lite));
  cache.clear('other');assert.equal(cache.resolve('owner','book','op',lite).result,result);
  cache.clear('owner');assert.throws(()=>cache.resolve('owner','book','op',lite));
 }finally{cache.clear()}
});

test('Native Base64 rejects noncanonical padding bits without a full re-encoding copy',()=>{
 const {validateNative}=require('../dist/runtime/core/delta-files');
 for(const [bytes,canonical,noncanonical] of [[Buffer.from('a'),'YQ==','YR=='],[Buffer.from('ab'),'YWI=','YWJ=']]){
  const item={id:randomUUID(),name:'data.bin',size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),mediaType:'application/octet-stream'};
  assert.doesNotThrow(()=>validateNative(emptyDelta,[{...item,data:canonical}]));
  assert.throws(()=>validateNative(emptyDelta,[{...item,data:noncanonical}]),e=>e.code==='INVALID_DELTA');
 }
});
