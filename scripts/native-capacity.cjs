const fs=require('fs'),cp=require('child_process'),path=require('path');
const exe=path.resolve('release',require('../package.json').version,'NotebookAid-win32-x64/NotebookAid.exe');
for(const count of [10,50]){
 const root=path.resolve('output/native-capacity',Date.now()+'-'+count);fs.mkdirSync(root,{recursive:true});
 const {exportNote}=require('../dist/runtime/core/note-files');const {emptyDelta}=require('../dist/runtime/shared/delta-document');const {randomUUID,createHash}=require('crypto');
 const size=200*1024*1024/count;const items=Array.from({length:count},(_,i)=>({id:randomUUID(),name:'附件-'+i+'.bin',size,mediaType:'application/octet-stream',sha256:createHash('sha256').update(Buffer.alloc(size,i+1)).digest('hex')}));
 exportNote(path.join(root,'capacity.nadelta'),{primaryFormat:'delta',title:'满容量交换测试',body:emptyDelta},[],{items,read:item=>Buffer.alloc(size,items.indexOf(item)+1)});
 const env={...process.env,NOTEBOOKAID_TEST_HOME:root,NOTEBOOKAID_NATIVE_CAPACITY_TEST:String(count)};
 for(const [arg,report]of [['--self-test','capacity-report.json'],['--self-test-reopen','capacity-reopen.json']]){
  const r=cp.spawnSync(exe,[arg],{windowsHide:true,timeout:180000,env,encoding:'utf8'});
  console.log(root,arg,r.status,r.stderr);
  if(r.status!==0||!fs.existsSync(path.join(root,report))||fs.existsSync(path.join(root,'smoke-error.txt'))){console.error(fs.existsSync(path.join(root,'smoke-error.txt'))?fs.readFileSync(path.join(root,'smoke-error.txt'),'utf8'):'Missing report');process.exit(1)}
  console.log('Report:',path.join(root,report));
 }
}
