const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve('output/easter-packaged/'+Date.now());fs.mkdirSync(root,{recursive:true});
fs.writeFileSync(path.join(root,'settings.json'),JSON.stringify({schemaVersion:1,global:{locale:'zh-CN',theme:'system',autosave:{enabled:true,minutes:5},onboarding:{version:1,enabled:true,started:true,completed:true,step:5}},libraries:{}}));
const dev=process.argv.includes('--dev'),exe=dev?require('electron'):path.resolve('release',require('../package.json').version,'NotebookAid-win32-x64/NotebookAid.exe');
const chunks=fs.readdirSync('dist/renderer/browser').filter(name=>/^chunk-.*\.js$/.test(name)).map(name=>({name,text:fs.readFileSync(path.join('dist/renderer/browser',name),'utf8')}));
const featureChunks=chunks.filter(chunk=>chunk.text.includes('easter-celebration')||chunk.text.includes('easter-enabled')||chunk.text.includes('发现一枚彩蛋'));
const animation=chunks.find(chunk=>chunk.text.includes('.arc(')&&chunk.text.includes('4100'));
if(featureChunks.length<3||!animation)throw Error('Missing independent lazy chunks');
const loaded=(resources,name)=>resources.some(url=>url.endsWith('/'+name));
for(const [arg,report,motion]of [['--self-test','easter-report.json','0'],['--self-test-reopen','easter-reopen.json','0'],['--self-test-reopen','easter-motion.json','1']]){
 const result=cp.spawnSync(exe,dev?['.',arg]:[arg],{windowsHide:true,timeout:120000,env:{...process.env,NOTEBOOKAID_TEST_HOME:root,NOTEBOOKAID_EASTER_TEST:'1',NOTEBOOKAID_EASTER_MOTION:motion},encoding:'utf8'});
 console.log(root,arg,result.status,result.stderr);
 if(result.status!==0||!fs.existsSync(path.join(root,report))||fs.existsSync(path.join(root,'smoke-error.txt'))){console.error(fs.existsSync(path.join(root,'smoke-error.txt'))?fs.readFileSync(path.join(root,'smoke-error.txt'),'utf8'):'No report');process.exit(1);}
 const value=JSON.parse(fs.readFileSync(path.join(root,report),'utf8'));
 if(!value.initialResources.length||[...featureChunks,animation].some(chunk=>loaded(value.initialResources,chunk.name)))throw Error('Feature loaded on startup');
 if(report==='easter-report.json'&&[...featureChunks,animation].some(chunk=>!loaded(value.finalResources,chunk.name)))throw Error('Lazy modules not exercised');
 if(report==='easter-motion.json'&&loaded(value.reducedResources,animation.name))throw Error('Animation imported for system reduced motion');
 console.log(JSON.stringify({...value,initialResources:undefined,finalResources:undefined,reducedResources:undefined,lazyLoadingVerified:true}));
}
