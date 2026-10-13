const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve('output/onboarding-packaged/'+Date.now());fs.mkdirSync(root,{recursive:true});
const dev=process.argv.includes('--dev'),exe=dev?require('electron'):path.resolve('release',require('../package.json').version,'NotebookAid-win32-x64/NotebookAid.exe');
for(const phase of ['first','resume','completed','disabled']){
 const result=cp.spawnSync(exe,dev?['.','--self-test']:['--self-test'],{windowsHide:true,timeout:90000,env:{...process.env,NOTEBOOKAID_TEST_HOME:root,NOTEBOOKAID_ONBOARDING_TEST:'1',NOTEBOOKAID_GUIDE_PHASE:phase},encoding:'utf8'});
 console.log(root,phase,result.status,result.stderr);const report=path.join(root,'guide-'+phase+'.json');
 if(result.status!==0||!fs.existsSync(report)||fs.existsSync(path.join(root,'smoke-error.txt'))){console.error(fs.existsSync(path.join(root,'smoke-error.txt'))?fs.readFileSync(path.join(root,'smoke-error.txt'),'utf8'):'No report');process.exit(1);}console.log(fs.readFileSync(report,'utf8'));
}
