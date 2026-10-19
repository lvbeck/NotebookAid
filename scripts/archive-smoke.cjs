const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),{randomUUID}=require('node:crypto');
const {NoteLibrary}=require('../dist/runtime/core/library'),{exportNotebookArchive}=require('../dist/runtime/core/notebook-archive');
(async()=>{
 const root=path.resolve('output/archive-ui/'+Date.now());fs.mkdirSync(root,{recursive:true});const source=path.join(root,'source.nabook'),parent=path.join(root,'imported');fs.mkdirSync(parent);
 const book=new NoteLibrary(path.join(root,'source-notebook'),undefined,'create');let libraryId;
 try{book.create(randomUUID(),{primaryFormat:'text',title:'Archived note',body:'Archive fixture'});book.updateNotebookSettings({name:'Archived notebook'});libraryId=book.libraryId;await exportNotebookArchive(book.path,source,()=>{});}finally{book.close();}
 fs.writeFileSync(path.join(root,'archive-fixture.json'),JSON.stringify({source,parent,libraryId,exportFile:path.join(root,'exported.nabook')}));
 const dev=process.argv.includes('--dev'),exe=dev?require('electron'):path.resolve('release',require('../package.json').version,'NotebookAid-win32-x64/NotebookAid.exe');
 for(const [arg,report] of [['--self-test','archive-report.json'],['--self-test-reopen','archive-reopen.json']]){
  const result=cp.spawnSync(exe,dev?['.',arg]:[arg],{windowsHide:true,timeout:120000,encoding:'utf8',env:{...process.env,NOTEBOOKAID_TEST_HOME:root,NOTEBOOKAID_ARCHIVE_TEST:'1'}});console.log(root,arg,result.status,result.stderr);
  if(result.status!==0||!fs.existsSync(path.join(root,report))||fs.existsSync(path.join(root,'smoke-error.txt'))){console.error(fs.existsSync(path.join(root,'smoke-error.txt'))?fs.readFileSync(path.join(root,'smoke-error.txt'),'utf8'):'No report');process.exit(1);}console.log(fs.readFileSync(path.join(root,report),'utf8'));
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
