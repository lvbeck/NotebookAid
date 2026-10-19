const fs = require('node:fs'), path = require('node:path');

function packageInfo(name) {
  return JSON.parse(fs.readFileSync(path.join('node_modules', name, 'package.json'), 'utf8'));
}
function packageNotices(name) {
  const folder = path.join('node_modules', name);
  const files = fs.readdirSync(folder).filter(file => /^(license|licence|copying|notice)([-.]|$)/i.test(file) && fs.statSync(path.join(folder,file)).isFile());
  if (!files.length) throw Error('Missing license for ' + name);
  return files.map(file => `===== ${name} ${packageInfo(name).version}: ${file} =====\n${fs.readFileSync(path.join(folder,file),'utf8')}`).join('\n\n');
}
function addonMaterials(source) {
  if (!fs.existsSync(path.join(source,'vendor/quill.js'))) return { components: [], files: { 'THIRD-PARTY-LICENSES.txt': 'This compatibility addon contains no bundled third-party libraries.\n' } };
  for (const [file, installed] of [['quill.js','quill/dist/quill.js'],['marked.js','marked/lib/marked.umd.js'],['purify.js','dompurify/dist/purify.js']]) {
    if (!fs.readFileSync(path.join(source,'vendor',file)).equals(fs.readFileSync(path.join('node_modules',installed)))) throw Error('Vendored version mismatch: '+file);
  }
  const names = new Set(['lucide','marked','dompurify']);
  function visit(name) { if (names.has(name)) return; names.add(name); for (const child of Object.keys(packageInfo(name).dependencies || {})) visit(child); }
  visit('quill');
  const components = [...names].sort().map(name => { const info=packageInfo(name); return { name, version:info.version, license:info.license, notices:['THIRD-PARTY-LICENSES.txt'] }; });
  return { components, files: {
    'THIRD-PARTY-LICENSES.txt': [...names].sort().map(packageNotices).join('\n\n'),
    'vendor/quill.js.LICENSE.txt': fs.readFileSync('node_modules/quill/dist/quill.js.LICENSE.txt','utf8')
  } };
}
function prepareAddon(source, stage) {
  const material=addonMaterials(source);
  for (const [file,text] of Object.entries(material.files)) fs.writeFileSync(path.join(stage,file),text);
  fs.writeFileSync(path.join(stage,'third-party-components.json'),JSON.stringify({schemaVersion:1,components:material.components},null,2));
}
function verifyAddonMaterials(source, read) {
  const material=addonMaterials(source);
  for (const [file,text] of Object.entries(material.files)) if (!read(file).equals(Buffer.from(text))) throw Error('Addon notice missing or changed: '+file);
  const catalog=JSON.parse(read('third-party-components.json').toString('utf8'));
  if (JSON.stringify(catalog.components)!==JSON.stringify(material.components)) throw Error('Addon component catalog mismatch');
}
function updateCatalog(root) {
  const file=path.join(root,'distribution-dependencies.json');
  const catalog=JSON.parse(fs.readFileSync(file,'utf8'));
  const renderer=[...fs.readFileSync(path.join(root,'renderer-THIRD-PARTY-LICENSES.txt'),'utf8').matchAll(/^Package: (.+)$/gm)].map(match => {
    const name=match[1].trim(), info=packageInfo(name);
    return {name,version:info.version,license:info.license,notices:['renderer-THIRD-PARTY-LICENSES.txt']};
  });
  if(!renderer.length) throw Error('Renderer component inventory is empty');
  const components=[...renderer,...catalog.runtime.map(item=>({...item,notices:['runtime-THIRD-PARTY-LICENSES.txt']}))];
  if (components.some(item => item.name === 'katex')) {
    const math = packageInfo('katex');
    components.push({name:'katex',version:math.version,license:math.license,notices:['KATEX-LICENSE.txt']});
    components.push({name:'KaTeX bundled fonts',version:math.version,license:'MIT',notices:['KATEX-FONTS-LICENSE.txt']});
  }
  const electron=packageInfo('electron');
  components.push({name:'Electron',version:electron.version,license:'MIT',notices:['LICENSE','LICENSES.chromium.html']});
  if(fs.existsSync(path.join(root,'INSTALLER-BUILDER-LICENSE.txt'))) components.push({name:'electron-builder',version:packageInfo('electron-builder').version,license:packageInfo('electron-builder').license,notices:['INSTALLER-BUILDER-LICENSE.txt']});
  if(fs.existsSync(path.join(root,'NSIS-COPYING.txt'))) {
    const toolset=fs.readFileSync('node_modules/app-builder-lib/out/toolsets/windows.js','utf8');
    const version=toolset.match(/getBinFromUrl\)\("nsis-([^" ]+)"/)?.[1];
    if(!version) throw Error('Unable to determine bundled NSIS version');
    components.push({name:'NSIS distribution / StdUtils',version,license:'zlib/libpng / bzip2 / CPL-1.0 / LGPL-2.1-or-later',notices:['NSIS-COPYING.txt','STDUTILS-NOTICE.nsh','INSTALLER-LGPL-2.1.txt']});
  }
  if(fs.existsSync(path.join(root,'OSX-SIGN-LICENSE.txt'))) components.push({name:'@electron/osx-sign',version:packageInfo('@electron/osx-sign').version,license:packageInfo('@electron/osx-sign').license,notices:['OSX-SIGN-LICENSE.txt']});
  for (const folder of ['resources/mcp', 'NotebookAid.app/Contents/Resources/mcp']) {
    const file = path.join(root, folder, 'components.json');
    if (fs.existsSync(file)) for (const item of JSON.parse(fs.readFileSync(file, 'utf8'))) components.push({ ...item, notices: [folder + '/THIRD-PARTY-NOTICES.txt'] });
  }
  const unique=new Map();
  for(const item of components) {
    if(!item.name||!item.version||!item.license) throw Error('Incomplete component metadata');
    for(const notice of item.notices) if(!fs.existsSync(path.join(root,notice))) throw Error('Missing distribution notice: '+notice);
    const key=item.name+'@'+item.version, prior=unique.get(key);
    unique.set(key,{name:item.name,version:item.version,license:item.license,notices:[...new Set([...(prior?.notices||[]),...item.notices])]});
  }
  catalog.schemaVersion=2;
  catalog.components=[...unique.values()].sort((a,b)=>a.name.localeCompare(b.name)||a.version.localeCompare(b.version));
  catalog.noticeFiles=[...new Set(catalog.components.flatMap(item=>item.notices))].sort();
  fs.writeFileSync(file,JSON.stringify(catalog,null,2));
  return catalog;
}
function copyElectronNotices(root,directory) {
  if(!directory||!fs.existsSync(directory)) throw Error('Extracted Electron distribution is required for notices');
  function find(folder,name) {
    const direct=path.join(folder,name);
    if(fs.existsSync(direct)&&fs.statSync(direct).isFile()) return direct;
    for(const item of fs.readdirSync(folder,{withFileTypes:true})) if(item.isDirectory()) { const result=find(path.join(folder,item.name),name); if(result)return result; }
    return null;
  }
  for(const name of ['LICENSE','LICENSES.chromium.html']) {
    const file=find(directory,name);
    if(!file) throw Error('Missing Electron distribution notice: '+name);
    fs.copyFileSync(file,path.join(root,name));
  }
}
module.exports={addonMaterials,prepareAddon,verifyAddonMaterials,updateCatalog,copyElectronNotices};
