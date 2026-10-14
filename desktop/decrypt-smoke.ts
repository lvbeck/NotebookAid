import type { BrowserWindow } from 'electron';
import { NoteLibrary } from '../core/library';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { writeFileSync } from 'node:fs';

export async function smokeDecrypt(window:BrowserWindow,root:string):Promise<void>{
 const run=(script:string)=>window.webContents.executeJavaScript(script);
 const until=async(script:string)=>{for(let n=0;n<160;n++){if(await run(script))return;await new Promise(r=>setTimeout(r,100));}throw Error('Decrypt timeout: '+script);};
 const click=async(id:string)=>{await until(`!!document.querySelector('[data-testid=${id}]')&&!document.querySelector('[data-testid=${id}]').disabled`);await run(`document.querySelector('[data-testid=${id}]').click()`);};
 const fill=async(value:string)=>{await run(`{const input=document.querySelector('[data-testid=security-credential]');input.value=${JSON.stringify(value)};input.dispatchEvent(new Event('input',{bubbles:true}));}`);await run('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');};
 const capture=async(name:string)=>{window.showInactive();await run('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');writeFileSync(join(root,name),(await window.webContents.capturePage()).toPNG());};
 const path=join(root,'decrypt-notebook'),password='Decrypt smoke password 123',library=new NoteLibrary(path);
 const note=library.create(randomUUID(),{title:'Encrypted active note',body:'Original body',primaryFormat:'markdown'}).note;
 const trash=library.create(randomUUID(),{title:'Encrypted trash note',body:'Trash body',primaryFormat:'text'}).note;
 try{await library.securityCommand({action:'setup',password});library.protect(note.id,note.version,true);library.protect(trash.id,trash.version,true);library.trash(trash.id,trash.version,randomUUID());}finally{library.close();}
 await until("document.querySelector('app-root')?.dataset.ready==='true'");await click('libraries-tab');writeFileSync(join(root,'registry-dialog.json'),JSON.stringify({path}));await click('library-add');
 await until("!document.querySelector('[data-testid=library-add]').disabled");const entry=(await run('window.notebookAid.library.registry()')).value.entries.find((row:{path:string})=>row.path===path);if(!entry)throw Error('Decrypt fixture registration failed');
 await run(`document.querySelector('[data-library-id="${entry.id}"] [data-testid=library-open]').click()`);await until(`document.querySelector('[data-library-id="${entry.id}"] [data-testid=library-open]').disabled===true`);
 await click('settings-tab');await click('settings-library');await run(`{const input=document.querySelector('[data-testid=settings-library-select]');input.value='${entry.id}';input.dispatchEvent(new Event('change',{bubbles:true}));}`);await click('security-disable');
 if(await run("!!document.querySelector('[data-encrypted-note]')"))throw Error('Locked titles were exposed');await fill('Wrong password');await click('security-submit');await until("!!document.querySelector('[data-testid=security-dialog] [role=alert]')");
 await fill(password);await click('security-submit');await until("document.querySelectorAll('[data-encrypted-note]').length===2");
 if(!await run("document.querySelector('[data-testid=encrypted-notes-list]').textContent.includes('回收站')"))throw Error('Trash encryption missing');await capture('encrypted-notes-list.png');
 await click('decrypt-all');await click('dialog-cancel');await until("!document.querySelector('[data-testid=dialog-confirm]')");if((await run('window.notebookAid.library.status()')).value.security.encryptedNotes!==2)throw Error('Cancelled decryption changed notes');
 await run("window.__decryptProgress=[];window.__stopDecrypt=window.notebookAid.library.onDecryptProgress(value=>window.__decryptProgress.push(value.processed));void 0");
 await click('decrypt-all');await click('dialog-confirm');await until("!document.querySelector('[data-testid=decrypt-all]')&&!document.querySelector('[data-testid=security-submit]').disabled");
 const status=(await run('window.notebookAid.library.status()')).value;if(status.security.encryptedNotes!==0||!status.security.configured)throw Error('Bulk decryption prematurely disabled master password');
 if(!await run("document.querySelector('[data-testid=security-dialog] .path').textContent.includes('.security-backups')&&window.__decryptProgress.includes(2)"))throw Error('Backup or progress missing');await capture('decrypted-notes-complete.png');
 await click('security-submit');await until("!document.querySelector('[data-testid=security-dialog]')");if((await run('window.notebookAid.library.status()')).value.security.configured)throw Error('Master password remained configured');
 const reopened=await run(`window.notebookAid.library.begin('${note.id}')`);if(!reopened.ok||reopened.value.note.body!=='Original body'||reopened.value.note.encrypted)throw Error('Decrypted content missing');await run(`window.notebookAid.library.end('${reopened.value.token}',${JSON.stringify(reopened.value.generation)})`);await run('window.__stopDecrypt();delete window.__decryptProgress;delete window.__stopDecrypt');
 writeFileSync(join(root,'decrypt-report.json'),JSON.stringify({lockedTitlesHidden:true,wrongPasswordRejected:true,trashListed:true,cancellationPreserves:true,bulkDecryption:true,backup:true,progress:true,masterPasswordExplicitDisable:true,contentPreserved:true,realUserDataTouched:false}));
}
