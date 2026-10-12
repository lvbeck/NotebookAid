const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve('output/dialog-packaged/'+Date.now());fs.mkdirSync(root,{recursive:true});
const env={...process.env,NOTEBOOKAID_TEST_HOME:root,NOTEBOOKAID_DIALOG_TEST:'1'};
const dev=process.argv.includes('--dev'),exe=dev?require('electron'):path.resolve('release',require('../package.json').version,'NotebookAid-win32-x64/NotebookAid.exe');
const result=cp.spawnSync(exe,dev?['.','--self-test']:['--self-test'],{windowsHide:true,timeout:90000,env,encoding:'utf8'});
console.log(root,result.status,result.stderr);
if(result.status!==0 || !fs.existsSync(path.join(root,'dialog-report.json')) || fs.existsSync(path.join(root,'smoke-error.txt'))){console.error(fs.existsSync(path.join(root,'smoke-error.txt'))?fs.readFileSync(path.join(root,'smoke-error.txt'),'utf8'):'No report');process.exit(1);}
console.log(fs.readFileSync(path.join(root,'dialog-report.json'),'utf8'));
