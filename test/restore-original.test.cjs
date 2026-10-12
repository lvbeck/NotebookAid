const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { randomUUID } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { NoteLibrary } = require('../dist/runtime/core/library');
const { LibraryRegistry } = require('../dist/runtime/core/registry');
const { createBackup, restoreBackup } = require('../dist/runtime/core/backups');
const { restoreGuardPath } = require('../dist/runtime/core/restore-guard');
const code = name => error => error.code === name;
function fixture(fault) {
  const base = path.resolve('output/restore-tests'); fs.mkdirSync(base, { recursive:true }); const root = fs.mkdtempSync(path.join(base,'case-'));
  const registry = new LibraryRegistry(root, path.join(root,'book'), fault), lib = registry.get(), id = registry.state().activeId;
  const note = lib.create(randomUUID(), { primaryFormat:'text',title:'Restore fixture',body:'Snapshot' }).note;
  const backup = createBackup(lib.path, path.join(root,'copies')).path;
  const edit = lib.begin(note.id,'test'); lib.save({ noteId:note.id,token:edit.token,generation:edit.generation,expectedVersion:note.version,operationId:randomUUID(),title:note.title,body:'Current' },'test'); lib.end(edit.token,edit.generation,'test');
  return { root,registry,id,note,backup,target:lib.path,libraryId:lib.libraryId };
}
test('in-place restore preserves original content as rollback copy and does not mix files', () => {
  const f = fixture();
  try { fs.writeFileSync(path.join(f.target,'extra-current.txt'),'Retain only in rollback'); const result = f.registry.maintenance(f.id,'restore',f.target,f.backup); assert.equal(result.path,f.target); assert.equal(f.registry.get().read(f.note.id).body,'Snapshot'); assert.equal(fs.existsSync(path.join(f.target,'extra-current.txt')),false); const old = new NoteLibrary(result.previousPath,undefined,'existing'); try { assert.equal(old.read(f.note.id).body,'Current'); assert.equal(fs.readFileSync(path.join(result.previousPath,'extra-current.txt'),'utf8'),'Retain only in rollback'); } finally { old.close(); } assert.equal(fs.existsSync(restoreGuardPath(f.target)),false); } finally { f.registry.close(); }
});
for (const checkpoint of ['restore-prepared','restore-original-moved','restore-replacement-moved','restore-verified']) {
  test('failure at ' + checkpoint + ' retains current notebook', () => {
    let fail = false; const f = fixture(stage => { if (fail && stage === checkpoint) throw Error('Fixture'); });
    try { fail = true; assert.throws(()=>f.registry.maintenance(f.id,'restore',f.target,f.backup),code(checkpoint==='restore-prepared'?'WRITE_FAILED':'RESTORE_FAILED_ROLLED_BACK')); assert.equal(f.registry.get().read(f.note.id).body,'Current'); assert.equal(fs.existsSync(restoreGuardPath(f.target)),false); } finally { f.registry.close(); }
  });
}
test('corrupt and foreign backups and active sessions leave original directory untouched', () => {
  const f = fixture();
  try { const s=f.registry.get().begin(f.note.id,'test'); assert.throws(()=>f.registry.maintenance(f.id,'restore',f.target,f.backup),code('NOTE_IN_USE')); f.registry.get().end(s.token,s.generation,'test'); const foreign=new NoteLibrary(path.join(f.root,'foreign')); const b=createBackup(foreign.path,path.join(f.root,'other-copies')).path; foreign.close(); assert.throws(()=>f.registry.maintenance(f.id,'restore',f.target,b),code('LIBRARY_ID_MISMATCH')); fs.writeFileSync(path.join(f.backup,'notebook/library.json'),'broken'); assert.throws(()=>f.registry.maintenance(f.id,'restore',f.target,f.backup),code('INTEGRITY_CHECK_FAILED')); assert.equal(f.registry.get().read(f.note.id).body,'Current'); } finally { f.registry.close(); }
});
test('inactive original restore does not switch the active notebook; foreign writer is rejected', () => {
  const f = fixture();
  try { f.registry.add(path.join(f.root,'active'),'create'); const active=f.registry.state().entries[1].id; f.registry.activate(active); const held=new NoteLibrary(f.target,undefined,'existing'); try { assert.throws(()=>f.registry.maintenance(f.id,'restore',f.target,f.backup),code('LIBRARY_IN_USE')); } finally { held.close(); } f.registry.maintenance(f.id,'restore',f.target,f.backup); assert.equal(f.registry.state().activeId,active); const restored=new NoteLibrary(f.target,undefined,'existing'); try { assert.equal(restored.read(f.note.id).body,'Snapshot'); } finally { restored.close(); } } finally { f.registry.close(); }
});
test('failed rollback retains copies and an application restart retries rollback', () => {
  let fail=false; const f=fixture(stage=>{if(fail&&['restore-replacement-moved','restore-rollback'].includes(stage))throw Error('Fixture');});
  try { fail=true; let details; assert.throws(()=>f.registry.maintenance(f.id,'restore',f.target,f.backup),error=>{details=error.details;return error.code==='RESTORE_ROLLBACK_FAILED';}); assert.ok(fs.existsSync(details.rollbackPath)); assert.ok(fs.existsSync(restoreGuardPath(f.target))); assert.throws(()=>new NoteLibrary(f.target,undefined,'existing'),code('RESTORE_INTERRUPTED')); const staging = JSON.parse(fs.readFileSync(restoreGuardPath(f.target),'utf8')).staging; f.registry.close(); const reopened=new LibraryRegistry(f.root,f.target); try { assert.equal(reopened.get().read(f.note.id).body,'Current'); assert.ok(fs.existsSync(staging)); assert.equal(fs.existsSync(restoreGuardPath(f.target)),false); } finally { reopened.close(); } } finally { f.registry.close(); }
});
for (const phase of ['original-moved','replacement-moved','verified']) {
  test('restart recovers durable checkpoint ' + phase,()=>{
    const f=fixture(), token=randomUUID(), staging=f.target+'.restore-staging-'+token, rollback=f.target+'.restore-rollback-'+token;
    f.registry.close(); restoreBackup(f.backup,staging,f.libraryId); fs.renameSync(f.target,rollback); if(phase!=='original-moved')fs.renameSync(staging,f.target);
    fs.writeFileSync(restoreGuardPath(f.target),JSON.stringify({format:'NotebookAidRestore',version:1,token,target:f.target,staging,rollback,libraryId:f.libraryId,phase}));
    const reopened=new LibraryRegistry(f.root,f.target); try { assert.equal(reopened.get().read(f.note.id).body,phase==='verified'?'Snapshot':'Current'); assert.equal(fs.existsSync(restoreGuardPath(f.target)),false); if(phase==='verified')assert.ok(fs.existsSync(rollback)); } finally { reopened.close(); }
  });
}
test('restore guard excludes foreign clients and cannot be deleted by a competing recovery',()=>{
  let ready=false, f; f=fixture(stage=>{if(ready&&stage==='restore-prepared'){assert.throws(()=>new NoteLibrary(f.target,undefined,'existing'),code('RESTORE_INTERRUPTED'));const other=new LibraryRegistry(f.root,f.target);try{assert.throws(()=>other.get(),code('LIBRARY_IN_USE'));assert.ok(fs.existsSync(restoreGuardPath(f.target)));}finally{other.close();}}});
  try {ready=true;f.registry.maintenance(f.id,'restore',f.target,f.backup);assert.equal(f.registry.get().read(f.note.id).body,'Snapshot');} finally {f.registry.close();}
});
test('unsafe recovery journal paths are rejected without touching another directory',()=>{
  const f=fixture(),token=randomUUID(),external=path.join(f.root,'external');f.registry.close();fs.mkdirSync(external);fs.writeFileSync(path.join(external,'keep'),'Keep');
  fs.writeFileSync(restoreGuardPath(f.target),JSON.stringify({format:'NotebookAidRestore',version:1,token,target:f.target,staging:f.target+'.restore-staging-'+token,rollback:external,libraryId:f.libraryId,phase:'original-moved'}));
  const reopened=new LibraryRegistry(f.root,f.target);try{assert.throws(()=>reopened.get(),code('RESTORE_INTERRUPTED'));assert.equal(fs.readFileSync(path.join(external,'keep'),'utf8'),'Keep');}finally{reopened.close();}
});
test('encrypted in-place restore stays locked and retains original encrypted history',async()=>{
  const f=fixture();
  try { const lib=f.registry.get();await lib.securityCommand({action:'setup',password:'Restore fixture password'});let note=lib.read(f.note.id);lib.protect(note.id,note.version,true);const backup=createBackup(lib.path,path.join(f.root,'encrypted-copies')).path;lib.lockSecurity();const result=f.registry.maintenance(f.id,'restore',f.target,backup);assert.equal(f.registry.get().securityState().unlocked,false);assert.throws(()=>f.registry.get().read(note.id),code('NOTEBOOK_LOCKED'));await f.registry.get().securityCommand({action:'unlock',credential:'Restore fixture password'});assert.equal(f.registry.get().read(note.id).body,'Current');const previous=new NoteLibrary(result.previousPath,undefined,'existing');try{await previous.securityCommand({action:'unlock',credential:'Restore fixture password'});assert.equal(previous.read(note.id).body,'Current');}finally{previous.close();} } finally {f.registry.close();}
});
