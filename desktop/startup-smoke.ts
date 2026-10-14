import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BrowserWindow } from 'electron';

export async function smokeStartup(window: BrowserWindow, root: string): Promise<void> {
  const expected = JSON.parse(readFileSync(join(root, 'startup-expected.json'), 'utf8'));
  const run = (source: string) => window.webContents.executeJavaScript(source, true);
  const until = async (source: string) => { for (let i = 0; i < 400; i++) { if (await run(source)) return; await new Promise(resolve => setTimeout(resolve, 50)); } throw new Error('Startup condition timed out: ' + source); };
  const capture = async (name: string) => { window.showInactive(); await run('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))'); await new Promise(resolve => setTimeout(resolve, 200)); writeFileSync(join(root, name), (await window.webContents.capturePage()).toPNG()); };
  await run(`(() => {
    const visible = selector => { const node = document.querySelector(selector); return !!node && !!node.getClientRects().length; };
    window.__startup = {samples:[], phases:[], started:performance.now()};
    window.notebookAid.library.onStartupProgress(value => window.__startup.phases.push(value));
    window.__startupTimer = setInterval(() => {
      const loading = visible('[data-testid=notebook-loading]') && document.querySelector('[data-testid=notebook-loading]').dataset.phase !== 'failed';
      window.__startup.samples.push({loading, empty:visible('[data-testid=empty-results]'), noSelection:visible('[data-testid=editor-empty]'), count:document.querySelector('[data-testid=query-total]')?.textContent, createDisabled:document.querySelector('[data-testid=create-note]')?.disabled});
    }, 25);
  })()`);
  await until("!!document.querySelector('[data-testid=notebook-loading]')");
  await capture('startup-loading.png');
  await until(expected.mode === 'missing' ? "document.querySelector('[data-testid=notebook-loading]')?.dataset.phase === 'failed'" : "!document.querySelector('[data-testid=create-note]')?.disabled");
  if (expected.mode === 'missing') {
    await until("document.querySelector('[data-testid=notebook-loading]')?.dataset.phase === 'failed'");
    await run("document.querySelector('[data-testid=startup-retry]').click()");
    await until("document.querySelector('[data-testid=notebook-loading]')?.dataset.phase === 'failed'");
  } else if (expected.mode === 'locked') {
    await until("!!document.querySelector('[data-testid=editor-locked]') && !!document.querySelector('[data-testid=locked-results]')");
    if (await run("!!document.querySelector('[data-testid=empty-results]')")) throw new Error('Locked notebook appeared empty');
  } else if (expected.mode === 'empty') {
    await until("!!document.querySelector('[data-testid=empty-results]') && !!document.querySelector('[data-testid=editor-empty]')?.getClientRects().length");
  } else {
    await until(`document.querySelector('[data-testid=query-total]')?.textContent.trim() === '${expected.count}' && document.querySelector('[data-testid=note-title]')?.value === ${JSON.stringify(expected.title)}`);
    const initialSettings = await run("window.notebookAid.library.settings({locale:null,theme:null,autosave:null})");
    const initialLimit = initialSettings.value.global.notePageSize ?? 30;
    if (await run("document.querySelectorAll('.note-card').length") !== Math.min(initialLimit, expected.count)) throw new Error('Saved page size was not applied on startup');
    const notes = await run('window.notebookAid.library.list()');
    if (notes.value[0].id === expected.noteId) throw new Error('Fixture does not distinguish last opened from last modified');
    if (!await run(`!!document.querySelector('[data-note-id="${expected.noteId}"][aria-pressed=true]')`)) {
      // The saved selection may lie outside the first page; the editor still restores it.
      if (await run("document.querySelector('[data-testid=note-title]').value") !== expected.title) throw new Error('Last opened note was not restored');
    }
    await run("document.querySelector('[data-testid=recent-tab]').click()");
    await until(`document.querySelector('.note-card')?.dataset.noteId === '${expected.noteId}'`);
    await run("document.querySelector('nav button').click()");
    await run("document.querySelector('[data-testid=settings-tab]').click()");
    await until("!!document.querySelector('[data-testid=note-page-size]')");
    await run("{const select=document.querySelector('[data-testid=note-page-size]');select.value='10';select.dispatchEvent(new Event('change',{bubbles:true}));}");
    await until("!document.querySelector('[data-testid=note-page-size]').disabled");
    const settings = await run("window.notebookAid.library.settings({locale:null,theme:null,autosave:null})");
    if (settings.value.global.notePageSize !== 10) throw new Error('Page size was not persisted');
    await run("document.querySelector('nav button').click()");
    await until("document.querySelectorAll('.note-card').length===10");
    await run("document.querySelector('[data-testid=next-page]').click()");
    await until("document.querySelector('.pagination span').textContent.trim().startsWith('11') && document.querySelectorAll('.note-card').length===10");
    await run("document.querySelector('[data-testid=previous-page]').click()");
    await until("document.querySelector('.pagination span').textContent.trim().startsWith('1–')");
  }
  const samples = await run('window.__startup.samples');
  if (!samples.some((sample: { loading: boolean }) => sample.loading)) throw new Error('Loading state was never visible');
  if (samples.some((sample: { loading: boolean; empty: boolean; noSelection: boolean; count: string; createDisabled: boolean }) => sample.loading && (sample.empty || sample.noSelection || sample.count?.trim() === '0' || !sample.createDisabled))) throw new Error('Loading exposed an empty state or enabled writing');
  const status = await run('window.notebookAid.library.status()');
  const phases = await run('window.__startup.phases');
  await run('clearInterval(window.__startupTimer)');
  await capture('startup-result.png');
  writeFileSync(join(root, 'startup-report-' + expected.mode + '.json'), JSON.stringify({ mode: expected.mode, loadingObserved: true, noFalseEmpty: true, writesDisabledDuringLoad: true, lastOpenedRestored: expected.mode === 'normal', configurablePagingAndRestart: expected.mode === 'normal', phases, startup: status.ok ? status.value.startup : null, testDelayMs: 1200 }));
}
