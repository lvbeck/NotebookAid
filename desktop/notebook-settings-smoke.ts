import type { BrowserWindow } from 'electron';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

export async function smokeNotebookSettings(window: BrowserWindow, directory: string): Promise<void> {
  const run = (script: string) => window.webContents.executeJavaScript(script);
  const until = async (script: string) => { for (let n = 0; n < 120; n++) { if (await run(script)) return; await new Promise(resolve => setTimeout(resolve, 100)); } throw Error('Notebook settings timeout: ' + script); };
  const click = async (id: string) => { await until(`document.querySelector('[data-testid=${id}]') && !document.querySelector('[data-testid=${id}]').disabled`); await run(`document.querySelector('[data-testid=${id}]').click()`); };
  const idle = () => until("!document.querySelector('[data-testid=autosave-enabled]').disabled");
  const get = async () => { const result = await run('window.notebookAid.library.settings({locale:null,theme:null,autosave:null})'); if (!result.ok) throw Error(result.code); return result.value; };
  const fixture = JSON.parse(readFileSync(join(directory, 'notebook-settings-fixture.json'), 'utf8'));
  const file = join(fixture.b.path, 'notebook-settings.json');
  await click('settings-tab'); await click('settings-library');
  const select = async (id: string) => { await run(`{const element=document.querySelector('[data-testid=settings-library-select]');element.value=${JSON.stringify(id)};element.dispatchEvent(new Event('change',{bubbles:true}));}`); await idle(); };
  await select(fixture.b.id);
  if (process.argv.includes('--self-test-reopen')) {
    await until("document.querySelector('[data-testid=library-inherit]').checked");
    if ((await get()).libraries[fixture.b.id]) throw Error('Legacy override returned after restart');
    if (JSON.parse(readFileSync(file, 'utf8')).autosave !== null) throw Error('Notebook inheritance was not durable');
    writeFileSync(join(directory, 'notebook-settings-reopen.json'), JSON.stringify({ restartPreservesNotebookInheritance: true, staleLegacyOverrideIgnored: true })); return;
  }
  await until("document.querySelector('[data-testid=library-autosave-minutes]').value==='7'");
  await click('library-autosave-enabled'); await idle();
  const before = readFileSync(file, 'utf8'), portable = JSON.parse(before);
  if (portable.libraryId !== fixture.b.libraryId || portable.autosave.enabled !== false || portable.autosave.minutes !== 7 || !portable.dailyBackup) throw Error('Legacy notebook migration lost preferences');
  if (JSON.parse(readFileSync(join(directory, 'settings.json'), 'utf8')).libraries[fixture.b.id].enabled !== true) throw Error('Legacy local override was overwritten');
  writeFileSync(join(directory, 'simulate-settings-failure'), 'fixture');
  try { await click('library-autosave-enabled'); await idle(); if (readFileSync(file, 'utf8') !== before || (await get()).libraries[fixture.b.id].enabled !== false) throw Error('Failed notebook write changed settings'); }
  finally { unlinkSync(join(directory, 'simulate-settings-failure')); }
  await select(fixture.a.id);
  await until("document.querySelector('[data-testid=library-autosave-minutes]').value==='3'");
  await select(fixture.b.id); await click('library-inherit-reset'); await idle();
  if ((await get()).libraries[fixture.b.id] || JSON.parse(readFileSync(file, 'utf8')).autosave !== null) throw Error('Restoring notebook inheritance resurrected legacy data');
  const backups = await run('window.notebookAid.library.backups()');
  if (!backups.ok || !backups.value.policies[fixture.b.id].enabled || backups.value.policies[fixture.b.id].directory !== fixture.backupDirectory) throw Error('Device backup destination was lost');
  if (readFileSync(file, 'utf8').includes('local-backups')) throw Error('Device backup path leaked into notebook');
  writeFileSync(join(directory, 'notebook-settings-report.json'), JSON.stringify({ legacyMigration: true, independentNotebookPreferences: true, failedWritePreservesPreferences: true, inheritanceReset: true, deviceBackupPathSeparated: true }, null, 2));
}
