const fs=require('fs'),path=require('path'),cp=require('child_process');
const base=path.resolve('output/exit-packaged/'+Date.now()),dev=process.argv.includes('--dev');
const exe=dev?require('electron'):path.resolve('release',require('../package.json').version,'NotebookAid-win32-x64/NotebookAid.exe');
for(const mode of ['clean','save','discard']){
  const root=path.join(base,mode);fs.mkdirSync(root,{recursive:true});
  for(const [arg,report] of [['--self-test','exit-report.json'],['--self-test-reopen','exit-reopen.json']]){
    const result=cp.spawnSync(exe,dev?['.',arg]:[arg],{windowsHide:true,timeout:90000,env:{...process.env,NOTEBOOKAID_TEST_HOME:root,NOTEBOOKAID_EXIT_TEST:mode},encoding:'utf8'});
    console.log(root,arg,result.status,result.stderr);
    if(result.status!==0 || !fs.existsSync(path.join(root,report)) || !fs.existsSync(path.join(root,'user-stopped.json')) || fs.existsSync(path.join(root,'smoke-error.txt'))){console.error(fs.existsSync(path.join(root,'smoke-error.txt'))?fs.readFileSync(path.join(root,'smoke-error.txt'),'utf8'):'No completed exit report');process.exit(1);}
    console.log(fs.readFileSync(path.join(root,report),'utf8'));
  }
}
