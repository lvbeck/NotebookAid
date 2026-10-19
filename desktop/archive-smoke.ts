import type { BrowserWindow } from 'electron';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { archiveText } from '../src/app/archive-i18n';
import type { Locale } from '../src/app/i18n';

export async function smokeArchive(window: BrowserWindow, directory: string, request: (file: string) => void): Promise<void> {
  const run = (script: string) => window.webContents.executeJavaScript(script);
  const until = async (script: string) => { for (let n=0;n<180;n++) { if(await run(script))return;await new Promise(resolve=>setTimeout(resolve,100)); } throw Error('Archive UI timeout: '+script); };
  const click = async (id: string) => { await until(`document.querySelector('[data-testid=${id}]') && !document.querySelector('[data-testid=${id}]').disabled`);await run(`document.querySelector('[data-testid=${id}]').click()`); };
  const fixture=JSON.parse(readFileSync(join(directory,'archive-fixture.json'),'utf8'));
  await until("document.querySelector('app-root')?.dataset.ready==='true'"); await click('libraries-tab');
  const state = async () => (await run('window.notebookAid.library.registry()')).value;
  if(process.argv.includes('--self-test-reopen')) {
    const imported=(await state()).entries.find((entry: any)=>entry.libraryId===fixture.libraryId);
    if(!imported || imported.name!=='Archived notebook')throw Error('Imported notebook registration lost on restart');
    writeFileSync(join(directory,'archive-reopen.json'),JSON.stringify({ importedRegistrationPersisted:true, canonicalNotebookName:true }));return;
  }
  if(!await run("document.querySelector('[data-testid=library-add]').nextElementSibling?.dataset.testid==='notebook-archive-import'"))throw Error('Archive import is not beside Add existing notebook');
  for(const locale of ['en','de','fr','it','es','pt-PT','zh-CN','zh-TW','ja','ko'] as Locale[]) {
    await run(`{const element=document.querySelector('[data-testid=language]');element.value=${JSON.stringify(locale)};element.dispatchEvent(new Event('change',{bubbles:true}));}`);
    await until(`document.querySelector('[data-testid=notebook-archive-import]').textContent.includes(${JSON.stringify(archiveText(locale,'import'))})`);
  }
  await run("{const element=document.querySelector('[data-testid=language]');element.value='zh-CN';element.dispatchEvent(new Event('change',{bubbles:true}));}");
  await until("document.querySelector('[data-testid=notebook-archive-import]').textContent.includes('从 .nabook')");
  writeFileSync(join(directory,'archive-dialog.json'),JSON.stringify({target:fixture.exportFile}));await click('notebook-archive-export');
  await until("!!document.querySelector('[data-testid=notebook-archive-result]')");if(!existsSync(fixture.exportFile)||readFileSync(fixture.exportFile).subarray(0,2).toString()!=='PK')throw Error('UI export is not a ZIP');
  writeFileSync(join(directory,'archive-dialog.json'),JSON.stringify({source:fixture.source,target:fixture.parent}));await click('notebook-archive-import');await click('dialog-cancel');
  await until("!document.querySelector('[data-testid=notebook-archive-import]').disabled");if(readdirSync(fixture.parent).length)throw Error('Cancelled import wrote files');
  request(fixture.source);await until('window.notebookAid.library.archiveOpenPending().then(result=>result.ok&&result.value)');
  writeFileSync(join(directory,'archive-dialog.json'),JSON.stringify({source:join(directory,'invalid-picker-source.nabook'),target:fixture.parent}));
  await run("window.__archiveProgress=[];window.__stopArchiveProgress=window.notebookAid.library.onBackupProgress(value=>{if(value)window.__archiveProgress.push(value);});void 0");
  await click('notebook-archive-import');await click('dialog-confirm');await until("!!document.querySelector('[data-testid=notebook-archive-result]') && !document.querySelector('[data-testid=notebook-archive-import]').disabled");
  if(!await run("window.__archiveProgress.some(value=>value.operation==='archive-import')"))throw Error('Archive progress was not delivered');await run('window.__stopArchiveProgress();void 0');
  if(!(await state()).entries.some((entry: any)=>entry.libraryId===fixture.libraryId&&entry.name==='Archived notebook'))throw Error('Archive was not registered');
  await window.webContents.capturePage().then(image=>writeFileSync(join(directory,'notebook-archives.png'),image.toPNG()));
  writeFileSync(join(directory,'archive-report.json'),JSON.stringify({ importBesideExisting:true,languages:10,zipExport:true,cancelNoWrites:true,fileOpenRequestUsesPendingSource:true,importRegistered:true,progressDelivered:true },null,2));
}
