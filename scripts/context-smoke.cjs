const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve('output/context-packaged/'+Date.now());fs.mkdirSync(root,{recursive:true});
const dev=process.argv.includes('--dev'),exe=dev?require('electron'):path.resolve('release',require('../package.json').version,'NotebookAid-win32-x64/NotebookAid.exe');
const result=cp.spawnSync(exe,dev?['.','--self-test']:['--self-test'],{windowsHide:true,timeout:150000,env:{...process.env,NOTEBOOKAID_TEST_HOME:root,NOTEBOOKAID_CONTEXT_TEST:'1',NOTEBOOKAID_DIALOG_TEST:'1'},encoding:'utf8'});
console.log(root,result.status,result.stderr);if(result.status!==0||!fs.existsSync(path.join(root,'context-report.json'))){console.error(fs.existsSync(path.join(root,'smoke-error.txt'))?fs.readFileSync(path.join(root,'smoke-error.txt'),'utf8'):'No report');process.exit(1);}console.log(fs.readFileSync(path.join(root,'context-report.json'),'utf8'));
