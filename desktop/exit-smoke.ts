import type { BrowserWindow } from 'electron';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

export async function smokeExit(window: BrowserWindow, directory: string): Promise<void> {
  const run = (s: string) => window.webContents.executeJavaScript(s);
  const until = async (s: string) => { for(let i=0;i<150;i++){if(await run(s))return;await new Promise(r=>setTimeout(r,100));}throw Error('Exit timeout: '+s); };
  const click = async (id: string) => {await until(`document.querySelector('[data-testid=${id}]')?.disabled === false`);await run(`document.querySelector('[data-testid=${id}]').click()`);};
  const modal = () => until("!!document.querySelector('[data-testid=app-dialog]')");
  const resumed = () => until("!document.querySelector('[data-testid=app-dialog]') && !document.querySelector('.app-shell').inert");
  const mode=process.env['NOTEBOOKAID_EXIT_TEST'];
  const expected=mode==='save'?'Exit changed title':'Exit saved title';
  window.show();
  if(process.argv.includes('--self-test-reopen')){
    await until(`document.querySelector('[data-testid=note-title]')?.value===${JSON.stringify(expected)}`);
    writeFileSync(join(directory,'exit-reopen.json'),JSON.stringify({mode,title:expected,persisted:true}));return;
  }
  await click('create-note');await click('create-markdown');
  await until("document.querySelector('[data-testid=note-title]')?.disabled === false && document.querySelector('[data-testid=note-title]').value==='未命名'");
  const title = (value: string) => run(`{const el=document.querySelector('[data-testid=note-title]');el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('input',{bubbles:true}));}`);
  await title('Exit saved title');await until("document.querySelector('[data-testid=save-status]')?.textContent.includes('尚未保存')");await click('save-note');await until("(async()=>{const r=await window.notebookAid.library.list();return r.ok && r.value[0]?.title==='Exit saved title';})()");
  await click('sidebar-toggle');await until("!!document.querySelector('.sidebar-collapsed')");
  if(!await run("getComputedStyle(document.querySelector('[data-testid=exit-app] .sidebar-text')).display==='none' && !!document.querySelector('[data-testid=exit-app] app-icon svg')"))throw Error('Collapsed exit entry');
  await click('exit-app');await modal();
  if(await run("!!document.querySelector('[data-testid=dialog-discard]')"))throw Error('Clean exit has discard');
  await click('dialog-cancel');await resumed();
  window.close();await modal();window.close();
  if(await run("document.querySelectorAll('[data-testid=app-dialog]').length")!==1)throw Error('Repeated close duplicated dialog');
  await window.webContents.capturePage().then(image=>writeFileSync(join(directory,'exit-clean.png'),image.toPNG()));
  await click('dialog-cancel');await resumed();if(!window.isVisible())throw Error('Window close hid app');
  if(mode!=='clean'){
    await title('Exit changed title');
    await click('exit-app');await modal();await until("!!document.querySelector('[data-testid=dialog-discard]')");
    const list=await run('window.notebookAid.library.list()');if(list.value[0].title!=='Exit saved title')throw Error('Exit inspection saved edits');
    await window.webContents.capturePage().then(image=>writeFileSync(join(directory,'exit-unsaved.png'),image.toPNG()));
    await click('dialog-cancel');await resumed();
    if(!await run("document.querySelector('[data-testid=note-title]').value==='Exit changed title'"))throw Error('Cancel lost edits');
    if(mode==='save'){
      writeFileSync(join(directory,'simulate-write-failure'),'1');
      window.close();await modal();await click('dialog-confirm');await resumed();
      if(!await run("document.querySelector('[data-testid=note-title]').value==='Exit changed title'"))throw Error('Failed save lost edits');
      unlinkSync(join(directory,'simulate-write-failure'));
    }
  }
  window.close();await modal();
  writeFileSync(join(directory,'exit-report.json'),JSON.stringify({mode,nativeClose:true,sidebar:true,collapsed:true,duplicateCloseGuard:true,cancelPreserves:true,noSaveBeforeDecision:true,failedSaveStaysOpen:mode==='save'}));
  await click(mode==='discard'?'dialog-discard':'dialog-confirm');
  await new Promise<void>(()=>{});
}
