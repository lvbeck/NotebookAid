import type { BrowserWindow } from 'electron';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { smokeEditorLayout } from './editor-layout-smoke';

export async function smokeDialogs(window: BrowserWindow, directory: string): Promise<void> {
  const run = (s: string) => window.webContents.executeJavaScript(s).catch(error => { throw Error(s + ": " + String(error)); });
  const until = async (s: string) => { for (let i=0;i<100;i++) { if(await run(s))return; await new Promise(r=>setTimeout(r,100)); } throw Error('Dialog timeout: '+s); };
  const click = async (id: string) => { await until(`document.querySelector('[data-testid=${id}]') && !document.querySelector('[data-testid=${id}]').disabled`); await run(`document.querySelector('[data-testid=${id}]').click()`); };
  const shown = () => until("!!document.querySelector('[data-testid=app-dialog]')");
  const closed = () => until("!document.querySelector('[data-testid=app-dialog]') && document.querySelector('[data-testid=note-trash]')?.disabled === false");
  window.show();
  await click('create-note'); await click('create-markdown');
  await until("!!document.querySelector('[data-testid=note-title]')");
  await smokeEditorLayout(window,directory);
  for(const cancel of ['dialog-cancel','dialog-close','Escape','backdrop']) {
    await run("document.querySelector('[data-testid=note-trash]').focus()");
    await click('note-trash'); await shown();
    await until("document.activeElement?.dataset.testid==='dialog-cancel'");
    await run("window.notebookAid.dialogs.respond('invalid-token',true)");
    if(!await run("!!document.querySelector('[data-testid=app-dialog]')"))throw Error('Unknown token accepted');
    if((await run("window.notebookAid.library.query({view:'trash'})")).value.total!==0)throw Error('Premature trash');
    for(let i=0;i<5;i++){ window.webContents.sendInputEvent({type:'keyDown',keyCode:'Tab'}); window.webContents.sendInputEvent({type:'keyUp',keyCode:'Tab'}); await new Promise(r=>setTimeout(r,30)); }
    if(!await run("document.querySelector('[data-testid=app-dialog]').contains(document.activeElement)"))throw Error('Focus escaped dialog');
    await window.webContents.capturePage().then(image=>writeFileSync(join(directory,'dialog-light.png'),image.toPNG()));
    if(cancel==='Escape'){window.webContents.sendInputEvent({type:'keyDown',keyCode:'Escape'});window.webContents.sendInputEvent({type:'keyUp',keyCode:'Escape'});}
    else if(cancel==='backdrop')await run("document.querySelector('.app-dialog-backdrop').click()");
    else await click(cancel);
    await closed();
    await until("document.activeElement?.dataset.testid==='note-trash'");
  }
  writeFileSync(join(directory,'simulate-write-failure'),'1');
  await run(`{const el=document.querySelector('[data-testid=note-title]');el.value='Unsaved dialog test';el.dispatchEvent(new Event('input',{bubbles:true}));}`);
  await run('window.notebookAid.quit()'); await shown();
  await click('dialog-cancel'); await until("!document.querySelector('[data-testid=app-dialog]')");
  if(!await run("document.querySelector('[data-testid=note-title]').value==='Unsaved dialog test'"))throw Error('Exit cancel lost edits');
  unlinkSync(join(directory,'simulate-write-failure'));await click('save-note');await until("document.querySelector('[data-testid=save-status]')?.textContent.includes('已保存')");
  await run("document.documentElement.dataset.theme='dark'");await click('note-trash');await shown();
  await window.webContents.capturePage().then(image=>writeFileSync(join(directory,'dialog-dark.png'),image.toPNG()));
  await click('dialog-confirm');
  await until("!document.querySelector('[data-testid=app-dialog]')");
  await until("!!document.querySelector('[data-testid=lifecycle-restore]')");
  if((await run("window.notebookAid.library.query({view:'trash'})")).value.total!==1)throw Error('Confirm did not trash');
  const input = { primaryFormat: 'delta', title: 'Upgrade dialog', body: JSON.stringify({ format: 'NotebookAidDelta', version: 1, ops: [{ insert: '\n' }] }) };
  for(const accept of [false,true]) {
    await run(`window.dialogResult=null;void window.notebookAid.library.create(crypto.randomUUID(),${JSON.stringify(input)}).then(r=>window.dialogResult=r);`);
    await shown();await click(accept?'dialog-confirm':'dialog-cancel');await until('window.dialogResult !== null');
    const result=await run('window.dialogResult');if(accept?!result.ok:result.ok || result.code!=='CANCELLED')throw Error('Upgrade decision mismatch');
  }
  writeFileSync(join(directory,'dialog-report.json'),JSON.stringify({upgradeCancelConfirm:true,unsavedExitCancel:true,cancelButton:true,closeButton:true,escape:true,backdrop:true,focusTrap:true,focusRestore:true,defaultCancel:true,unknownTokenRejected:true,confirmedTrash:true,lightDark:true}));
}
