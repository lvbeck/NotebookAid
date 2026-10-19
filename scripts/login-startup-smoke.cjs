const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve('output/login-startup-ui',String(Date.now()));fs.mkdirSync(root,{recursive:true});
const packaged=process.argv.includes('--packaged'),exe=packaged?path.resolve('release',require('../package.json').version,'NotebookAid-win32-x64/NotebookAid.exe'):require('electron');
const result=cp.spawnSync(exe,packaged?['--self-test']:['.','--self-test'],{windowsHide:true,timeout:120000,encoding:'utf8',env:{...process.env,NOTEBOOKAID_TEST_HOME:root,NOTEBOOKAID_LOGIN_STARTUP_TEST:'1'}});
console.log(root,result.status,result.stderr);
if(result.status!==0||!fs.existsSync(path.join(root,'login-startup-report.json'))){console.error(fs.existsSync(path.join(root,'smoke-error.txt'))?fs.readFileSync(path.join(root,'smoke-error.txt'),'utf8'):'Missing report');process.exit(1);}
console.log(fs.readFileSync(path.join(root,'login-startup-report.json'),'utf8'));
