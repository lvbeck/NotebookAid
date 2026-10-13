const $ = id => document.getElementById(id);
let locale = 'en', libraryId = null, cursor = '', epoch = 0, offset = 0, selected = null, connected = false, organization = { folders: [], tags: [], version: 0 }, busy = false, filterFolder = '', filterTag = '';
const urls = new Set();
const t = key => (notebookLabels[locale] || notebookLabels.en)[key] || notebookLabels.en[key] || key;
function icon(name) { const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); for(const [k,v] of Object.entries({viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'1.65','aria-hidden':'true'}))svg.setAttribute(k,v); for(const [tag,attrs]of notebookIcons[name] || []){const node=document.createElementNS(svg.namespaceURI,tag);for(const[k,v]of Object.entries(attrs))node.setAttribute(k,v);svg.append(node);}return svg; }
function localize() { document.documentElement.lang=locale; document.querySelectorAll('[data-text]').forEach(node=>{ if(node.tagName==='BUTTON'){node.replaceChildren(icon(node.dataset.icon),document.createTextNode(t(node.dataset.text)));}else node.textContent=t(node.dataset.text); }); }
function releaseImages() { for(const url of urls)URL.revokeObjectURL(url);urls.clear(); }
function clearView(clearList=true) { epoch++; releaseImages(); $('confirm').close(); $('preview').hidden=true;$('empty').hidden=false;$('content').replaceChildren();$('title').textContent=''; if(clearList){$('notes').replaceChildren();$('count').textContent='';$('folders').replaceChildren();$('tags').replaceChildren();$('mapping-result').textContent='';organization={folders:[],tags:[],version:0};} }
const rpc = (method,params={},id=libraryId) => browser.runtime.sendMessage({type:'native',method,libraryId:id,params});
function error(result) { const code=result?.code || result?.error; $('error').textContent=t(code==='NOTE_IN_USE'?'inUse':code==='VERSION_CONFLICT'||code==='LIBRARY_CHANGED'?'conflict':code==='APP_LOCKED'||code==='NOTEBOOK_LOCKED'?'locked':code==='PROTOCOL_MISMATCH'?'mismatch':code==='NATIVE_HOST_UNAVAILABLE'?'bridgeUnavailable':code==='BACKGROUND_UNAVAILABLE'?'disconnected':'failed'); }
function disconnected(result) { connected=false;libraryId=null;selected=null;clearView();$('start').hidden=false;$('sync-tags').disabled=true;$('library-name').textContent='';$('connection').textContent=t(result?.code==='APP_LOCKED'?'locked':'disconnected');error(result); }
function option(value,label){const item=document.createElement('option');item.value=value;item.textContent=label;return item;}
async function loadOrganization(n) {
  const folders=[],tags=[];let version;
  for(let skip=0;skip<=1000;skip+=30){const r=await rpc('organization',{offset:skip});if(n!==epoch)return false;if(!r.ok){error(r);return false;}if(version!==undefined&&version!==r.value.version)return false;version=r.value.version;folders.push(...r.value.folders);tags.push(...r.value.tags);if(skip+30>=r.value.total)break;}
  organization={folders,tags,version};const oldFolder=filterFolder,oldTag=filterTag;
  $('folders').replaceChildren(option('',t('all')),option('unfiled',t('folder')+' · —'));for(const folder of folders){let path=folder.name,parent=folder.parentId,depth=0;while(parent&&depth++<16){const ancestor=folders.find(f=>f.id===parent);if(!ancestor)break;path=ancestor.name+' / '+path;parent=ancestor.parentId;}$('folders').append(option(folder.id,path));}
  $('tags').replaceChildren(option('',t('all')));for(const tag of tags)$('tags').append(option(tag.id,tag.name+(tag.thunderbird?.missing?' · '+t('sourceMissing'):'')));
  if([...$('folders').options].some(o=>o.value===oldFolder))$('folders').value=oldFolder;if([...$('tags').options].some(o=>o.value===oldTag))$('tags').value=oldTag;return true;
}
async function refresh() {
  if(!connected||busy)return;const keep=selected?.id;clearView(false);const n=epoch;$('error').textContent='';
  if(!await loadOrganization(n)||n!==epoch)return;
  const folder=$('folders').value,tag=$('tags').value;const result=await rpc('query',{text:$('search').value,offset,view:'all',...(folder?{folderId:folder==='unfiled'?null:folder}:{}),tagIds:tag?[tag]:[]});
  if(n!==epoch)return;if(!result.ok){error(result);if(result.code==='LIBRARY_CHANGED'||result.code==='APP_LOCKED')disconnected(result);return;}
  if(result.value.cursor!==cursor){cursor=result.value.cursor;}
  $('notes').replaceChildren();$('count').textContent=result.value.total;$('previous').disabled=offset===0;$('next').disabled=offset+20>=result.value.total;
  for(const note of result.value.notes){const button=document.createElement('button');button.className='note-card';button.dataset.noteId=note.id;const title=document.createElement('strong');title.textContent=note.title;const meta=document.createElement('small');meta.textContent=note.primaryFormat.toUpperCase()+' · v'+note.version+' · '+new Date(note.updatedAt).toLocaleString(locale);button.append(title,meta);button.onclick=()=>void show(note);$('notes').append(button);}
  selected=null;const note=result.value.notes.find(note=>note.id===keep);if(note)await show(note);
}
async function image(img,source,n,id) {
  const match=/^attachments\/([0-9a-f-]{36})$/i.exec(source);if(!match){img.replaceWith(document.createTextNode(t('imageUnavailable')));return;}
  const chunks=[];let length=0,mime='';
  for(let skip=0;;){const result=await rpc('image',{noteId:id,attachmentId:match[1],version:selected?.version,offset:skip});if(n!==epoch)return;if(!result.ok){img.replaceWith(document.createTextNode(t('imageUnavailable')));return;}length=result.value.length;mime=result.value.mime;if(length>20*1024*1024||result.value.size<=0)return;const bytes=Uint8Array.from(atob(result.value.data),c=>c.charCodeAt(0));chunks.push(bytes);skip+=result.value.size;if(skip>=length)break;}
  if(n!==epoch)return;const url=URL.createObjectURL(new Blob(chunks,{type:mime}));urls.add(url);img.src=url;
}
async function show(note) {
  clearView(false);const n=epoch,id=libraryId;selected=note;let body='',format='';
  for(let skip=0;;skip+=4096){const result=await rpc('preview',{noteId:note.id,version:note.version,offset:skip},id);if(n!==epoch)return;if(!result.ok){selected=null;error(result);return;}if(result.value.cursor!==cursor){selected=null;await connect();return;}body+=result.value.body;format=result.value.primaryFormat;if(body.length>=result.value.length)break;}
  if(n!==epoch)return;$('title').textContent=note.title;$('preview').hidden=false;$('empty').hidden=true;
  document.querySelectorAll('.note-card').forEach(b=>b.classList.toggle('selected',b.dataset.noteId===note.id));
  let html;
  if(format==='text'){const pre=document.createElement('pre');pre.textContent=body;$('content').replaceChildren(pre);}
  else {
    if(format==='delta'){const host=document.createElement('div');const quill=new Quill(host,{readOnly:true,modules:{toolbar:false},theme:'snow'});quill.setContents(JSON.parse(body).ops);html=quill.root.innerHTML;}else html=format==='markdown'?marked.parse(body):body;
    const fragment=DOMPurify.sanitize(html,{RETURN_DOM_FRAGMENT:true,FORBID_TAGS:['style','iframe','object','embed','form','input','video','audio','svg','math'],FORBID_ATTR:['srcset','style']});
    const images=[];fragment.querySelectorAll('img').forEach(img=>{images.push([img,img.getAttribute('src')||'']);img.removeAttribute('src');});fragment.querySelectorAll('a').forEach(link=>{link.removeAttribute('href');link.removeAttribute('target');});$('content').replaceChildren(fragment);
    for(const [img,src]of images.slice(0,50)){if(n!==epoch)return;await image(img,src,n,note.id);}
  }
}
let connecting;
async function connect() {
  if(connecting)return connecting;
  connecting=(async()=>{clearView();selected=null;const r=await rpc('handshake',{},null);if(!r.ok || r.value?.protocolVersion!==1){disconnected(r.ok?{code:'PROTOCOL_MISMATCH'}:r);return;}locale=notebookLabels[r.value.locale]?r.value.locale:'en';localize();document.documentElement.dataset.theme=r.value.theme;cursor=r.value.cursor;libraryId=r.value.libraryId;connected=!r.value.locked;$('start').hidden=connected;$('sync-tags').disabled=!connected;$('library-name').textContent=r.value.name;$('connection').textContent=t(connected?'connected':'locked') + (connected?' · '+r.value.appVersion:'');if(!connected){error({code:'APP_LOCKED'});return;}await refresh();})();
  try{await connecting;}finally{connecting=null;}
}
async function watch(){for(;;){try{if(!connected){await new Promise(r=>setTimeout(r,3000));await connect();continue;}const r=await rpc('changes',{cursor},null);if(!r.ok){disconnected(r);await new Promise(r=>setTimeout(r,3000));continue;}if(r.value.resyncRequired){clearView();if(r.value.libraryId!==libraryId||r.value.locked){filterFolder='';filterTag='';offset=0;$('search').value='';await connect();}else{cursor=r.value.cursor;locale=r.value.locale;localize();document.documentElement.dataset.theme=r.value.theme;await refresh();}}}catch{disconnected({code:'BACKGROUND_UNAVAILABLE'});await new Promise(r=>setTimeout(r,3000));}}}
async function syncTags(){if(busy||!connected)return;busy=true;try{const snapshot=await browser.runtime.sendMessage({type:'localTags'});const r=await rpc('mapTags',{...snapshot,expectedVersion:organization.version});if(!r.ok){error(r);return;}$('mapping-result').textContent=t('synced')+' · '+r.value.mapped;const stored=await browser.storage.local.get('mappedLibraries');await browser.storage.local.set({mappedLibraries:[...new Set([...(stored.mappedLibraries||[]),libraryId])]});}catch{error({code:'WRITE_FAILED'});}finally{busy=false;await refresh();}}
$('reconnect').onclick=()=>void connect();$('start').onclick=async()=>{const r=await rpc('start');if(!r.ok){error(r);return;}await connect();};$('open').onclick=async()=>{const r=await rpc('open');if(!r.ok)error(r);};
let debounce;$('search').oninput=()=>{clearTimeout(debounce);offset=0;clearView(false);debounce=setTimeout(()=>void refresh(),200);};for(const id of ['folders','tags'])$(id).onchange=()=>{filterFolder=$('folders').value;filterTag=$('tags').value;offset=0;selected=null;void refresh();};$('previous').onclick=()=>{offset=Math.max(0,offset-20);void refresh();};$('next').onclick=()=>{offset+=20;void refresh();};
$('edit').onclick=async()=>{if(!selected)return;const r=await rpc('openNote',{noteId:selected.id});if(!r.ok||!r.value)error(r);};
let trashTarget;$('trash').onclick=()=>{if(selected){trashTarget={...selected,libraryId};$('confirm').showModal();$('cancel-trash').focus();}};$('cancel-trash').onclick=()=>$('confirm').close();$('confirm-trash').onclick=async()=>{const target=trashTarget;$('confirm').close();if(!target)return;const r=await rpc('trash',{noteId:target.id,version:target.version,operationId:crypto.randomUUID()},target.libraryId);if(!r.ok)error(r);else{selected=null;await refresh();}};
$('sync-tags').onclick=()=>void syncTags();browser.runtime.onMessage.addListener(async message=>{if(message?.type==='tagsChanged'){const stored=await browser.storage.local.get('mappedLibraries');if(stored.mappedLibraries?.includes(libraryId))await syncTags();}});
window.addEventListener('pagehide',()=>{clearView();selected=null;connected=false;});localize();void connect().then(watch);
