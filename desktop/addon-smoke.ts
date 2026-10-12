import { app, BrowserWindow, ipcMain } from 'electron';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { encodeFrame, FrameDecoder } from './framing';
export async function smokeAddon(window: BrowserWindow, dataPath: string): Promise<void> {
  const run = (s: string) => window.webContents.executeJavaScript(s).catch(error => { throw Error(s.slice(0, 220) + ': ' + error); });
  const until = async (contents: Electron.WebContents, s: string) => { for(let i=0;i<150;i++){if(await contents.executeJavaScript(s))return;await new Promise(r=>setTimeout(r,100));}throw Error('Addon timeout: '+s); };
  await until(window.webContents, "document.querySelector('app-root')?.dataset.ready==='true' && !!window.notebookAid");
  await until(window.webContents, "(async()=>{const r=await window.notebookAid.library.status();return r.ok})()");
  if(!await run("document.querySelector('[data-testid=libraries-tab]').compareDocumentPosition(document.querySelector('[data-testid=create-note]')) & Node.DOCUMENT_POSITION_FOLLOWING"))throw Error('Notebook entry order');
  if(!await run("document.querySelector('app-security[mode=quick]').compareDocumentPosition(document.querySelector('[data-testid=create-note]')) & Node.DOCUMENT_POSITION_FOLLOWING"))throw Error('Security entry order');
  const bridge = app.isPackaged ? join(dirname(app.getPath('exe')), 'NotebookAid.Bridge.exe') : join(app.getAppPath(), 'dist/NotebookAid.Bridge.exe');
  const native = (request: any): Promise<any> => new Promise((resolve,reject)=>{
    const child=spawn(bridge,[],{windowsHide:true,env:{...process.env,NOTEBOOKAID_TEST_HOME:dataPath}}),decoder=new FrameDecoder();let done=false;
    const timer=setTimeout(()=>{child.kill();reject(Error('Native test timed out'));},30000);
    child.on('error',reject);child.on('exit',()=>{clearTimeout(timer);if(!done)reject(Error('No native response'));});
    child.stdout.on('data',chunk=>{try{const rows=decoder.push(chunk);if(rows.length){done=true;resolve(rows[0]);child.stdin.end();}}catch(error){reject(error);child.stdin.end();}});child.stdin.write(encodeFrame(request));
  });
  if(process.argv.includes('--self-test-reopen')){const h=await native({method:'handshake',protocolVersion:1});if(!h.ok)throw Error('Reopen handshake');const q=await native({method:'query',protocolVersion:1,libraryId:h.value.libraryId,params:{}});if(q.value.notes.some((n:any)=>n.title==='Hidden marker'))throw Error('Hidden restart');writeFileSync(join(dataPath,'addon-reopen.json'),JSON.stringify({native:true,persisted:true,hiddenFiltered:true}));return;}
  const create=async(title:string,body:string,format='markdown')=>{const r=await run('window.notebookAid.library.create('+JSON.stringify(randomUUID())+','+JSON.stringify({title,body,primaryFormat:format})+')');if(!r.ok)throw Error('Create '+r.code);return r.value.note;};
  const a=await create('Addon rich note','# Local heading\n\n**Safe preview**\n\n| Item | State |\n|---|---|\n| Work | Done |'),hidden=await create('Hidden marker','NEVER SHOW');
  await run('window.notebookAid.library.noteVisibility('+JSON.stringify(hidden.id)+','+hidden.version+',false)');
  const handshake=await native({method:'handshake',protocolVersion:1});if(!handshake.ok||!handshake.value.libraryId)throw Error('Native handshake');
  const id=handshake.value.libraryId,request=(method:string,params:any={})=>native({method,protocolVersion:1,libraryId:id,params});
  const query=await request('query');if(query.value.notes.some((n:any)=>n.id===hidden.id))throw Error('Hidden list');
  if((await request('preview',{noteId:hidden.id,version:hidden.version})).code!=='NOT_FOUND_OR_UNAVAILABLE')throw Error('Hidden direct read');
  const addonWindow=new BrowserWindow({width:1300,height:860,show:false,webPreferences:{preload:join(__dirname,'addon-test-preload.js'),sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
  const errors: string[] = [];
  addonWindow.webContents.on('console-message', (_event, level, message) => { if (level === 3) errors.push(message); });
  const authorize=(event:Electron.IpcMainInvokeEvent)=>{if(event.sender!==addonWindow.webContents||event.senderFrame!==addonWindow.webContents.mainFrame)throw Error('Untrusted test request');};
  const memory:Record<string,unknown>={};
  ipcMain.handle('addon-test:request',async(event,message)=>{authorize(event);if(message.type==='localTags')return{profileId:randomUUID(),tags:[{key:'work',name:'Work',color:'#aabbcc'}]};return native({...message,protocolVersion:1});});
  ipcMain.handle('addon-test:storage',(event,action,key)=>{authorize(event);if(action==='get')return{[key]:memory[key]};Object.assign(memory,key);return;});
  try{
    await addonWindow.loadFile(join(__dirname,'../../addon/notes.html'));const arun=(s:string)=>addonWindow.webContents.executeJavaScript(s).catch(error=>{throw Error(s.slice(0,220)+': '+error);});
    await until(addonWindow.webContents,"document.querySelectorAll('.note-card').length===1");await arun("document.querySelector('.note-card').click()");await until(addonWindow.webContents,"document.querySelector('#content h1')?.textContent==='Local heading'");
    addonWindow.show();await new Promise(resolve=>setTimeout(resolve,300));
    await until(addonWindow.webContents,"!document.querySelector('#preview').hidden && document.querySelector('#content h1')?.textContent==='Local heading'");
    await addonWindow.webContents.capturePage().then(image=>writeFileSync(join(dataPath,'addon-preview.png'),image.toPNG()));
    await arun("document.querySelector('#edit').click()");await until(window.webContents,"document.querySelector('[data-testid=note-title]')?.value==="+JSON.stringify(a.title));
    if((await request('trash',{noteId:a.id,version:a.version,operationId:randomUUID()})).code!=='NOTE_IN_USE')throw Error('Editing delete');
    await arun("document.querySelector('#sync-tags').click()");await until(addonWindow.webContents,"document.querySelector('#tags').textContent.includes('Work')");
    await until(window.webContents,`document.querySelector('[data-note-id="${hidden.id}"]')?.disabled===false`);
    await run(`document.querySelector('[data-note-id="${hidden.id}"]').click()`);
    await until(window.webContents,"document.querySelector('[data-testid=note-title]')?.value==='Hidden marker'");
    const hide = await run('window.notebookAid.library.noteVisibility('+JSON.stringify(a.id)+','+a.version+',false)');if(!hide.ok)throw Error('Hide failed: '+hide.code);
    await until(addonWindow.webContents,"document.querySelector('#count').textContent==='0' && document.querySelectorAll('.note-card').length===0 && document.querySelector('#content').textContent===''");
    const html=await create('HTML preview','<h2>HTML safe</h2><script>window.BAD=true</script><img src="https://example.com/private.png" onerror="window.BAD=true"><a href="https://example.com/secret">Unsafe link</a>','html');
    await until(addonWindow.webContents,"(()=>{const note=[...document.querySelectorAll('.note-card')].find(n=>n.textContent.includes('HTML preview'));if(!note)return false;note.click();return true;})()");await until(addonWindow.webContents,"document.querySelector('#content h2')?.textContent==='HTML safe'");
    if(await arun("!!window.BAD || !!document.querySelector('#content script,#content img[src^=http],#content a[href]')"))throw Error('Unsafe preview');
    await arun("document.querySelector('#trash').click();document.querySelector('#confirm-trash').click()");await until(addonWindow.webContents,"document.querySelectorAll('.note-card').length===0");
    await window.webContents.executeJavaScript("window.notebookAid.quit()");await until(window.webContents,"!!document.querySelector('[data-testid=app-dialog]')");if(await run("!!document.querySelector('[data-testid=app-dialog] .dialog-symbol')"))throw Error('Info symbol retained');await run("document.querySelector('[data-testid=dialog-cancel]').click()");
    await until(window.webContents,"!document.querySelector('[data-testid=app-dialog]') && !document.querySelector('.app-shell').inert");
    await new Promise(resolve => setTimeout(resolve, 100));
    writeFileSync(join(dataPath,'addon-report.json'),JSON.stringify({nativeBridge:true,handshake:true,richPreview:true,hiddenFiltering:true,hiddenInvalidation:true,editingDeleteRefused:true,desktopTarget:true,tagMapping:true,safeHtml:true,trash:true,sidebarOrder:true,noDialogInfo:true}));
  }catch(error){writeFileSync(join(dataPath,'addon-ui-error.txt'),JSON.stringify({error:String(error),console:errors,text:await addonWindow.webContents.executeJavaScript('document.body.innerText')}));await addonWindow.webContents.capturePage().then(image=>writeFileSync(join(dataPath,'addon-error.png'),image.toPNG()));throw error;}
  finally{addonWindow.destroy();ipcMain.removeHandler('addon-test:request');ipcMain.removeHandler('addon-test:storage');}
}
