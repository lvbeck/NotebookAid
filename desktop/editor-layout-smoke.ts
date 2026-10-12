import type { BrowserWindow } from 'electron';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

export async function smokeEditorLayout(window: BrowserWindow, directory: string): Promise<void> {
  const run = (script: string) => window.webContents.executeJavaScript(script);
  const pause = () => new Promise(resolve => setTimeout(resolve, 250));
  const click = (id: string) => run(`document.querySelector('[data-testid="${id}"]').click()`);
  const assert = async (script: string, message: string) => { if (!await run(script)) throw new Error(message); };
  window.show();
  window.unmaximize();
  window.setBounds({ x: 60, y: 60, width: 1300, height: 860 });
  await pause();
  const bounds = window.getBounds();
  const originalTitle = await run(`document.querySelector('[data-testid=note-title]').value`);
  for (const width of [960, 1300]) {
    window.setSize(width, 860); await pause();
    await assert(`(() => {const rows=['note-tag-menu','pin-note','note-history','note-trash'].map(id=>document.querySelector('[data-testid="'+id+'"]').getBoundingClientRect());return rows.every(r=>Math.abs(r.top+ r.height/2-rows[0].top-rows[0].height/2)<2);})()`, 'Metadata actions wrapped');
    await assert(`(() => {const row=document.querySelector('.editor-actions');return row.contains(document.querySelector('.ql-toolbar')) && row.scrollWidth <= row.clientWidth+2;})()`, 'Merged toolbar overflow');
    await window.webContents.capturePage().then(image => writeFileSync(join(directory, `editor-${width}.png`), image.toPNG()));
  }
  await click('editor-fullscreen'); await pause(); await pause();
  if (!window.isMaximized()) throw new Error('Editor did not maximize window');
  await assert(`(() => {const a=document.querySelector('.editor-heading').getBoundingClientRect(),b=document.querySelector('[data-testid=pin-note]').getBoundingClientRect(),c=document.querySelector('.editor-actions').getBoundingClientRect();return Math.abs((b.top-a.bottom)-(c.top-b.bottom))<=2;})()`, 'Fullscreen metadata spacing is unequal');
  await assert(`document.querySelector('.editor-actions').scrollWidth <= document.querySelector('.editor-actions').clientWidth+2`, 'Fullscreen toolbar overflow');
  await assert(`document.querySelectorAll('[data-testid=note-title]').length===1 && !!document.querySelector('.editor-heading [data-testid=note-title]')`, 'Fullscreen title not in header');
  await run(`{const el=document.querySelector('[data-testid=note-title]');el.value='Fullscreen title retained';el.dispatchEvent(new Event('input',{bubbles:true}));}`);
  await run(`{const pane=document.querySelector('.editor-pane');pane.scrollTop=500;}`);
  await window.webContents.capturePage().then(image => writeFileSync(join(directory, 'editor-fullscreen.png'), image.toPNG()));
  await run(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`); await pause(); await pause();
  if (window.isMaximized() || window.getBounds().width !== bounds.width) throw new Error('Editor did not restore normal window bounds');
  await assert(`!document.querySelector('.editor-heading [data-testid=note-title]') && document.querySelector('[data-testid=note-title]').value==='Fullscreen title retained'`, 'Normal title location/value not restored');
  await run(`{const el=document.querySelector('[data-testid=note-title]');el.value=${JSON.stringify(originalTitle)};el.dispatchEvent(new Event('input',{bubbles:true}));}`);
  await run(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'F',code:'KeyF',ctrlKey:true,shiftKey:true,bubbles:true}))`);await pause();
  if (!window.isMaximized()) throw new Error('Fullscreen keyboard shortcut failed');
  await click('note-history'); await pause(); await pause();
  if (window.isMaximized()) throw new Error('History navigation did not restore window');
  await run(`document.querySelector('app-lifecycle header button').click()`);await pause();
  await click('source-mode'); await pause();
  await assert(`!!document.querySelector('[data-testid=body-source]') && getComputedStyle(document.querySelector('.rich-tools')).display==='none'`, 'Source mode tools mismatch');
  await click('rich-mode'); await pause();
  await click('more-editor-tools'); await pause();
  await assert(`getComputedStyle(document.querySelector('.rich-tools')).display !== 'none'`, 'More tools did not open');
  await click('compact-export'); await pause();
  await assert(`getComputedStyle(document.querySelector('.export-controls')).display !== 'none'`, 'Export controls did not open');
  await run(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
  writeFileSync(join(directory, 'editor-layout-report.json'), JSON.stringify({ singleRow: true, mergedToolbar: true, widths: [960,1300], maximize: true, restoreBounds: true, titleRetained: true, keyboard: true, historyExit: true, sourceMode: true, moreTools: true, exportMenu: true }));
}
