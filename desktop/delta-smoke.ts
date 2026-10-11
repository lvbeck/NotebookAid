import type { BrowserWindow } from 'electron';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { deltaSnapshot } from '../shared/delta-document';

export async function smokeDelta(window: BrowserWindow, directory: string): Promise<void> {
  const run = (script: string) => window.webContents.executeJavaScript(script);
  const wait = () => new Promise(resolve => setTimeout(resolve, 120));
  const until = async (script: string) => { for (let i=0;i<120;i++) { if (await run(script)) return; await wait(); } writeFileSync(join(directory,'delta-dom.txt'),await run('document.body.innerHTML')); throw Error('Delta timeout: '+script); };
  const click = async (id: string) => { await run(`document.querySelector('[data-testid=${id}]').click()`); await wait(); };
  const input = async (id: string, value: string, event='input') => { await run(`{const el=document.querySelector('[data-testid=${id}]');el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('${event}',{bubbles:true}));}`); await wait(); };
  if (process.argv.includes('--self-test-reopen')) {
    const expected=JSON.parse(readFileSync(join(directory,'delta-expected.json'),'utf8'));
    await until("document.querySelector('.format-badge')?.textContent.includes('DELTA') && document.querySelector('.ql-editor')?.textContent.includes('Delta heading')");
    const note=(await run(`window.notebookAid.library.begin('${expected.id}')`)).value.note;
    if(note.body!==expected.body)throw Error('Delta restart changed document');
    await until("document.querySelector('.ql-editor img')?.naturalWidth>0");
    writeFileSync(join(directory,'delta-reopen.json'),JSON.stringify({restart:true,bodyPreserved:true,image:true}));return;
  }
  await until("!document.querySelector('[data-testid=create-note]').disabled");
  await click('create-note');await click('create-delta');
  await until("document.querySelector('.format-badge').textContent.includes('DELTA')");
  await run("document.querySelector('[data-select-trigger=export-format]').click()");
  await until("!!document.querySelector('.select-menu-export-format')");
  if (!await run("(()=>{const el=document.querySelector('.select-menu-export-format [data-value=delta] span');return el.getClientRects().length===1 && el.scrollWidth<=el.clientWidth && getComputedStyle(el).whiteSpace==='nowrap';})()")) throw Error('Delta export label wraps or overflows');
  await run("document.querySelector('.select-menu-export-format [data-value=markdown]').click()");
  const fixture=deltaSnapshot([{insert:'Delta heading'},{insert:'\n',attributes:{header:1}},{insert:'Task'},{insert:'\n',attributes:{list:'checked'}},{insert:'Nested'},{insert:'\n',attributes:{list:'bullet',indent:2}},{insert:'const count=1;'},{insert:'\n',attributes:{'code-block':'javascript'}},{insert:'Cell'},{insert:'\n',attributes:{table:'row-1','cell-header':'true'}},{insert:'\n'}]);
  await click('source-mode');await input('body-source',fixture);await click('save-note');await click('rich-mode');
  await until("!document.querySelector('[data-testid=format-warning]') && document.querySelector('.ql-editor table') && document.querySelector('.ql-editor [data-list=checked]')");
  await run("{const el=document.querySelector('.ql-editor p:last-child');el.textContent='Typed rich text';el.dispatchEvent(new InputEvent('input',{bubbles:true}));}");await wait();
  await click('save-note');await until("document.querySelector('[data-testid=save-status]').textContent.includes('已保存')");
  await run("document.querySelector('.editor-area').dispatchEvent(new KeyboardEvent('keydown',{key:'z',ctrlKey:true,bubbles:true}))");await wait();
  await until("!document.querySelector('.ql-editor').textContent.includes('Typed rich text')");
  await run("document.querySelector('.editor-area').dispatchEvent(new KeyboardEvent('keydown',{key:'y',ctrlKey:true,bubbles:true}))");await wait();
  await until("document.querySelector('.ql-editor').textContent.includes('Typed rich text')");
  await click('save-note');await wait();
  let notes=(await run('window.notebookAid.library.list()')).value;
  let note=(await run(`window.notebookAid.library.begin('${notes[0].id}')`)).value.note;
  if(!note.body.includes('Typed rich text') || !note.body.includes('Delta heading'))throw Error('Delta saved incremental content');
  const file=join(directory,'delta-image.svg');writeFileSync(file,'<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><rect width="80" height="40" fill="#7460c9"/></svg>');
  writeFileSync(join(directory,'note-file-dialog.json'),JSON.stringify({path:file}));
  await run("document.querySelector('.ql-image').click()");await until("document.querySelector('.ql-editor img')?.naturalWidth===80");await click('save-note');await wait();
  await input('export-format','delta','change');await click('prepare-export');
  const out=join(tmpdir(),'notebookaid-export-'+basename(directory));mkdirSync(out,{recursive:true});const native=join(out,'native.nadelta');
  writeFileSync(join(directory,'note-file-dialog.json'),JSON.stringify({path:native}));await click('confirm-export');await until("document.querySelector('[data-testid=file-message]').textContent.includes('导出')");
  const exported=JSON.parse(readFileSync(native,'utf8'));if(exported.attachments.length!==1)throw Error('Native attachment missing');
  await click('import-note');await until("document.querySelectorAll('.note-card').length===2");
  await until("document.querySelector('.ql-editor img')?.naturalWidth===80 && !document.querySelector('[data-testid=format-warning]')");
  notes=(await run('window.notebookAid.library.list()')).value;
  note=(await run(`window.notebookAid.library.begin('${notes[0].id}')`)).value.note;
  if(note.primaryFormat!=='delta'||!note.body.includes('Typed rich text'))throw Error('Native import lost body');
  const query=await run("window.notebookAid.library.query({text:'Delta heading'})");if(!query.ok||query.value.total!==2)throw Error('Delta text search failed');
  writeFileSync(join(directory,'delta-expected.json'),JSON.stringify({id:note.id,body:note.body}));
  await window.webContents.capturePage();await wait();writeFileSync(join(directory,'delta-editor.png'),(await window.webContents.capturePage()).toPNG());
  writeFileSync(join(directory,'delta-report.json'),JSON.stringify({undoRedo:true,nativeCreate:true,richSnapshot:true,taskAndNestedLists:true,table:true,codeLanguage:true,image:true,exchange:true,search:true}));
}
