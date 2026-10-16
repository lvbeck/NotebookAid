const fs=require('node:fs'),path=require('node:path');
const configPath=path.resolve(__dirname,'../config/github-updates.json');
function validateConfig(value) {
  if(value?.schemaVersion!==1||value.repository!=='https://github.com/lvbeck/NotebookAid'||!['prepare-only','signed'].includes(value.windows?.mode)||value.windows.requireSignature!==true||value.macOS?.mode!=='manual') throw Error('Invalid GitHub update policy.');
  if(value.windows.feedBaseUrl!==value.repository+'/releases/latest/download/'||value.windows.msiFeedUrl!==value.windows.feedBaseUrl+'latest-msi.json') throw Error('Unexpected GitHub update URL.');
  const publisher=value.windows.publisherName;
  if(publisher!==null&&(typeof publisher!=='string'||!publisher.trim()||publisher.length>256)) throw Error('Invalid signing publisher.');
  if(value.windows.mode==='prepare-only'&&publisher!==null) throw Error('Keep publisherName null until signed updates are authorized.');
  return value;
}
function readConfig() { return validateConfig(JSON.parse(fs.readFileSync(configPath,'utf8'))); }
function windowsEnvironment(env=process.env, config=readConfig()) {
  validateConfig(config);
  const names=['NOTEBOOKAID_UPDATE_URL','NOTEBOOKAID_UPDATE_PUBLISHER','NOTEBOOKAID_MSI_PUBLISHER'];
  if(config.windows.mode==='prepare-only') {
    if(names.some(name=>env[name]?.trim())) throw Error('Windows updates are prepare-only; remove active update environment variables.');
    return {};
  }
  const publisher=env.NOTEBOOKAID_UPDATE_PUBLISHER?.trim()||config.windows.publisherName;
  if(!publisher) throw Error('Signed updates require the actual certificate publisher.');
  if(env.NOTEBOOKAID_UPDATE_URL&&env.NOTEBOOKAID_UPDATE_URL!==config.windows.feedBaseUrl) throw Error('Update URL differs from the approved repository.');
  if(env.NOTEBOOKAID_MSI_PUBLISHER&&env.NOTEBOOKAID_MSI_PUBLISHER!==publisher) throw Error('EXE and MSI publishers must match.');
  return {NOTEBOOKAID_UPDATE_URL:config.windows.feedBaseUrl,NOTEBOOKAID_UPDATE_PUBLISHER:publisher,NOTEBOOKAID_MSI_PUBLISHER:publisher};
}
module.exports={readConfig,validateConfig,windowsEnvironment};
