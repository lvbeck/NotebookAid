const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve('output/ui-packaged/'+Date.now());fs.mkdirSync(root,{recursive:true});
fs.writeFileSync(path.join(root,'backups.json'),JSON.stringify({version:1,policies:{'00000000-0000-0000-0000-000000000000':{directory:path.join(root,'backup-fixture'),enabled:true,nextAt:1,lastAt:null}}}));
const dev=process.argv.includes('--dev'),exe=dev?require('electron'):path.resolve('release',require('../package.json').version,'NotebookAid-win32-x64/NotebookAid.exe');
for(const [arg,report] of [['--self-test','ui-report.json'],['--self-test-reopen','ui-reopen.json']]){
  const result=cp.spawnSync(exe,dev?['.',arg]:[arg],{windowsHide:true,timeout:150000,env:{...process.env,NOTEBOOKAID_TEST_HOME:root,NOTEBOOKAID_UI_TEST:'1'},encoding:'utf8'});
  console.log(root,arg,result.status,result.stderr);
  if(result.status!==0||!fs.existsSync(path.join(root,report))||fs.existsSync(path.join(root,'smoke-error.txt'))){console.error(fs.existsSync(path.join(root,'smoke-error.txt'))?fs.readFileSync(path.join(root,'smoke-error.txt'),'utf8'):'No report');process.exit(1);}
  console.log(fs.readFileSync(path.join(root,report),'utf8'));
}
