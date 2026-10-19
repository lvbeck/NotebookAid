const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
if(process.platform!=='win32')throw Error('Windows probe only');
const root=path.resolve('output/login-startup-native',String(Date.now()));fs.mkdirSync(root,{recursive:true});
const source=path.join(root,'probe.cjs');
fs.writeFileSync(source,`const {app}=require('electron');const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const {synchronizeLoginStartup}=require(${JSON.stringify(path.resolve('dist/runtime/desktop/login-startup.js'))});
const identity='de.zub-systems.notebookaid.StartupProbe.'+randomUUID();app.setAppUserModelId(identity);app.setPath('userData',__dirname);
app.whenReady().then(()=>{let failure;const report={identity,temporaryEntry:true,background:false,window:false,disabled:false,installationExecuted:false};try{
 for(const mode of ['background','window']){synchronizeLoginStartup(app,'win32',true,process.execPath,{enabled:true,mode});const args=['--login-startup',...(mode==='background'?['--background']:[])];if(!app.getLoginItemSettings({path:process.execPath,args}).openAtLogin)throw Error('Native readback mismatch');report[mode]=true;}
 }catch(error){failure=error;}finally{try{synchronizeLoginStartup(app,'win32',true,process.execPath);report.disabled=!app.getLoginItemSettings({path:process.execPath,args:['--login-startup']}).openAtLogin;}catch(error){failure??=error;}}
 fs.writeFileSync(path.join(__dirname,'report.json'),JSON.stringify(report,null,2));if(failure){fs.writeFileSync(path.join(__dirname,'error.txt'),String(failure));app.exit(1);}else app.exit(0);
});`);
const result=cp.spawnSync(require('electron'),[source],{windowsHide:true,timeout:30000,encoding:'utf8'});console.log(root,result.status,result.stderr);if(result.status!==0){console.error(fs.existsSync(path.join(root,'error.txt'))?fs.readFileSync(path.join(root,'error.txt'),'utf8'):'Native probe failed');process.exit(1);}console.log(fs.readFileSync(path.join(root,'report.json'),'utf8'));
