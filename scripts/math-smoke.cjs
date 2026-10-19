const fs=require('fs'),path=require('path'),cp=require('child_process');
const root=path.resolve('output/math-ui',String(Date.now()));fs.mkdirSync(root,{recursive:true});
const packaged=process.argv.includes('--packaged'),exe=packaged?path.resolve('release',require('../package.json').version,'NotebookAid-win32-x64/NotebookAid.exe'):require('electron');
for(const flag of ['--self-test','--self-test-reopen']){
 const r=cp.spawnSync(exe,packaged?[flag]:['.',flag],{encoding:'utf8',timeout:180000,windowsHide:true,env:{...process.env,NOTEBOOKAID_TEST_HOME:root,NOTEBOOKAID_MATH_TEST:'1'}});
 console.log(root,flag,r.status,r.stderr);
 if(r.status!==0){console.error(fs.existsSync(path.join(root,'smoke-error.txt'))?fs.readFileSync(path.join(root,'smoke-error.txt'),'utf8'):'No report');process.exit(1);}
 console.log(fs.readFileSync(path.join(root,flag==='--self-test'?'math-report.json':'math-reopen.json'),'utf8'));
}
