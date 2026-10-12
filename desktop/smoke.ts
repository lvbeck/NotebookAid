import { smokeExit } from './exit-smoke';
import { smokeSecurity } from './security-smoke';
import { smokeBackups } from './backup-smoke';
import { smokeAppearance } from './appearance-smoke';
import { smokeDialogs } from './dialog-smoke';
import { smokeLifecycle } from './lifecycle-smoke';
import { smokeNativeCapacity } from './native-capacity-smoke';
import { smokeDelta } from './delta-smoke';
import { smokeI18n } from './i18n-smoke';
import { smokeAttachments } from './attachment-smoke';
import { smokeLayout } from './layout-smoke';
import { smokeOrganization } from './organization-smoke';
import { type BrowserWindow } from 'electron';
import { writeFileSync, unlinkSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { smokeSettings } from './settings-smoke';
import { smokeRegistry } from './registry-smoke';
import { smokeLibraryImport } from './library-import-smoke';
import { smokeNotifications } from './notification-smoke';
import { smokeEditor } from './editor-smoke';
import { smokeSelect } from './select-smoke';

export async function smokeLibrary(window: BrowserWindow, directory: string, errors: string[]): Promise<void> {
  const evaluate = (script: string) => window.webContents.executeJavaScript(script).catch(error => { throw new Error(`Smoke script failed: ${script.slice(0, 160)}: ${error}`); });
  const wait = (delay: number) => new Promise(resolve => setTimeout(resolve, delay));
  const until = async (expression: string) => {
    for (let n = 0; n < 150; n++) { if (await evaluate(expression)) return; await wait(100); }
    throw new Error('UI condition timed out: ' + expression);
  };
  await until("document.querySelector('app-root')?.dataset.ready === 'true'");
  if (process.env['NOTEBOOKAID_APPEARANCE_TEST'] === '1') { await smokeAppearance(window, directory); if (errors.length) throw Error(errors.join('; ')); return; }
  if (process.env['NOTEBOOKAID_BACKUP_TEST'] === '1') { await smokeBackups(window, directory); if (errors.length) throw Error(errors.join('; ')); return; }
  if (process.env['NOTEBOOKAID_SECURITY_TEST'] === '1') { await smokeSecurity(window, directory); if (errors.length) throw Error(errors.join('; ')); return; }
  if (process.env['NOTEBOOKAID_EXIT_TEST']) { await smokeExit(window, directory); if(errors.length) throw Error(errors.join('; ')); return; }
  if (process.env['NOTEBOOKAID_DIALOG_TEST'] === '1') { await smokeDialogs(window, directory); if(errors.length) throw Error(errors.join('; ')); return; }
  if (process.env['NOTEBOOKAID_EDITOR_TEST'] === '1') {
    await until("document.querySelector('[data-testid=create-note]')?.disabled === false");
    await smokeEditor(window, directory);
    if (errors.length) throw Error('Editor renderer errors: ' + errors.join('; '));
    return;
  }
  if (process.env['NOTEBOOKAID_LIFECYCLE_TEST'] === '1') { await smokeLifecycle(window, directory); if (errors.length) throw Error(errors.join('; ')); return; }
  if (process.env['NOTEBOOKAID_NATIVE_CAPACITY_TEST']) { await smokeNativeCapacity(window, directory); if (errors.length) throw Error(errors.join('; ')); return; }
  if (process.env['NOTEBOOKAID_DELTA_TEST'] === '1') { await smokeDelta(window, directory); if (errors.length) throw Error('Delta renderer errors: ' + errors.join('; ')); return; }
  if (process.argv.includes('--self-test-reopen')) {
    await until("document.querySelector('[data-testid=note-title]')?.value === '退出前保存'");
    await until("document.querySelector('.ql-editor')?.textContent.includes('自动保存')");
    const result = await evaluate('window.notebookAid.library.list()');
    if (!result.ok || result.value.length !== 1 || result.value[0].version !== JSON.parse(readFileSync(join(directory, 'expected-exit-version.json'), 'utf8'))) throw new Error('Process restart state mismatch');
    const registry = await evaluate('window.notebookAid.library.registry()');
    if (!registry.ok || JSON.stringify(registry.value.entries.map((entry: any) => ({ id: entry.id, name: entry.name, path: entry.path, libraryId: entry.libraryId }))) !== readFileSync(join(directory, 'registry-expected.json'), 'utf8')) throw new Error('Library registry did not survive restart');
    const preferences = await evaluate("window.notebookAid.library.settings({locale:null,theme:null,autosave:null})");
    const expectedSettings = JSON.parse(readFileSync(join(directory, 'settings-expected.json'), 'utf8'));
    if (!preferences.ok || JSON.stringify(preferences.value) !== JSON.stringify(expectedSettings)) throw new Error('Scoped settings did not survive restart');
    if (!await evaluate("document.querySelector('.app-shell').classList.contains('sidebar-collapsed')")) throw Error('Sidebar collapsed state not restored');
    const attachmentExpected = JSON.parse(readFileSync(join(directory, 'attachments-expected.json'), 'utf8'));
    const attachmentState = await evaluate(`window.notebookAid.library.attachments('${attachmentExpected.id}')`);
    if (!attachmentState.ok || attachmentState.value.length !== attachmentExpected.attachments.length || attachmentState.value.some((row: any) => !row.available)) throw Error('Attachments did not survive restart');
    await until("Array.from(document.querySelectorAll('.ql-editor img')).some(image => image.src.startsWith('data:image/png;'))");
    if (attachmentExpected.attachments.some((item: any) => item.name.endsWith('.svg'))) await until("Array.from(document.querySelectorAll('.ql-editor img')).some(image => image.src.startsWith('data:image/svg+xml;') && image.naturalWidth === 800 && image.getAttribute('width') === '300' && image.getAttribute('height') === '150')");
    const notifications = await evaluate('window.notebookAid.notifications.state()');
    if (!notifications.ok || JSON.stringify(notifications.value) !== readFileSync(join(directory, 'notification-expected.json'), 'utf8')) throw new Error('Notification history/position/read state did not survive restart');
    if (!await evaluate("document.querySelector('[data-testid=autosave-minutes]').value === '10' && !document.querySelector('[data-testid=autosave-enabled]').checked")) throw new Error('Settings did not persist');
    writeFileSync(join(directory, 'reopen-report.json'), JSON.stringify({ processRestart: true, exitFlushedDraft: true, notificationStatePersisted: true, registryPersisted: true, scopedSettingsPersisted: true, version: result.value[0].version, runtime: await evaluate('window.notebookAid.runtime()') }, null, 2));
    return;
  }
  await until("!document.querySelector('[data-testid=create-note]').disabled && !document.querySelector('[data-testid=autosave-enabled]').disabled");
  if (!await evaluate("document.querySelector('[data-testid=autosave-minutes]').value === '5' && document.querySelector('[data-testid=autosave-enabled]').checked")) throw new Error('Autosave defaults mismatch');
  // Advance only autosave timers in the test instead of waiting real minutes.
  await evaluate(`(() => { const set=window.setTimeout.bind(window), clear=window.clearTimeout.bind(window); window.__autosaveTimers=new Map(); window.setTimeout=(fn,ms,...args)=>{if(ms===60000 || ms===300000){const id=set(()=>{},3600000);window.__autosaveTimers.set(id,()=>fn(...args));return id;}return set(fn,ms,...args);};window.clearTimeout=id=>{window.__autosaveTimers.delete(id);clear(id);}; })()`);
  if (await evaluate("!!document.querySelector('#new-note-formats')")) throw Error('Format choices visible before New');
  await evaluate("document.querySelector('[data-testid=create-note]').click()");
  await until("!!document.querySelector('[data-testid=create-markdown]')");
  const sidebar = await evaluate(`(() => {
    const a=document.querySelector('[data-testid=create-note]').getBoundingClientRect();
    const b=document.querySelector('[data-testid=import-note]').getBoundingClientRect();
    const nav=document.querySelector('.sidebar nav').getBoundingClientRect();
    return { width:a.width===b.width, height:a.height===b.height, gap:nav.top-b.bottom };
  })()`);
  if (!sidebar.width || !sidebar.height || sidebar.gap < 24) throw Error('Sidebar layout failed');
  const beforeCreate = await evaluate('window.notebookAid.library.list()');
  if (!beforeCreate.ok || beforeCreate.value.length) throw Error('New click created a note before format selection');
  writeFileSync(join(directory, 'sidebar-expanded.png'), (await window.webContents.capturePage()).toPNG());
  await evaluate("document.querySelector('[data-testid=create-markdown]').click()");
  await until("!document.querySelector('#new-note-formats')");
  await until("document.querySelector('[data-testid=note-title]')?.disabled === false");
  await evaluate(`(() => {
    const title = document.querySelector('[data-testid=note-title]'); title.value='T03 中文测试'; title.dispatchEvent(new Event('input', {bubbles:true}));
    const source = document.querySelector('[data-testid=markdown-source]'); source.value='# 保存测试\\n\\n正文 😀'; source.dispatchEvent(new Event('input', {bubbles:true}));
  })()`);
  await wait(100);
  await evaluate("document.querySelector('[data-testid=load-source]').click(); document.querySelector('[data-testid=save-note]').click()");
  await until("document.querySelector('[data-testid=save-status]').textContent.includes('已保存')");
  await until("[...document.querySelectorAll('[data-testid=notification]')].some(item=>item.textContent.includes('保存成功'))");
  const initial = await evaluate(`(async () => {const rows=await window.notebookAid.library.list(); if(!rows.ok || rows.value.length!==1) throw Error('List mismatch'); const session=await window.notebookAid.library.begin(rows.value[0].id); if(!session.ok) throw Error('Session failed'); return session.value.note;})()`);
  if (initial.title !== 'T03 中文测试' || initial.body !== '# 保存测试\n\n正文 😀') throw new Error('Persisted title/body mismatch');
  const savedMessages = await evaluate("(async()=> (await window.notebookAid.notifications.state()).value.records.filter(item=>item.code==='saveSuccess').length)()");
  await evaluate("document.querySelector('[data-testid=autosave-enabled]').click()");
  await evaluate(`(() => { const editor=document.querySelector('.ql-editor');editor.focus();const range=document.createRange();range.selectNodeContents(editor);range.collapse(false);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);document.execCommand('insertText',false,' 自动保存'); })()`);
  await wait(200);
  if (!await evaluate('window.__autosaveTimers.size === 0')) throw new Error('Disabled autosave scheduled a write');
  const disabled = await evaluate(`(async () => (await window.notebookAid.library.begin(${JSON.stringify(initial.id)})).value.note)()`);
  if (disabled.version !== initial.version) throw new Error('Disabled autosave wrote a revision');
  await evaluate("document.querySelector('[data-testid=autosave-enabled]').click();const minutes=document.querySelector('[data-testid=autosave-minutes]');minutes.value='1';minutes.dispatchEvent(new Event('change',{bubbles:true}))");
  await wait(100);
  const timerId = await evaluate('[...window.__autosaveTimers.keys()][0]');
  await evaluate("const title=document.querySelector('[data-testid=note-title]');title.dispatchEvent(new Event('input',{bubbles:true}))");
  if (!await evaluate(`window.__autosaveTimers.size === 1 && window.__autosaveTimers.has(${timerId})`)) throw new Error('Typing reset the autosave timer');
  await evaluate('const entry=[...window.__autosaveTimers][0];window.clearTimeout(entry[0]);entry[1]()');
  await until("document.querySelector('[data-testid=save-status]').textContent.includes('已保存')");
  let note = await evaluate(`(async () => (await window.notebookAid.library.begin(${JSON.stringify(initial.id)})).value.note)()`);
  if (!note.body.includes('自动保存') || note.version <= initial.version) throw new Error('Autosave failed');
  if (await evaluate("(async()=> (await window.notebookAid.notifications.state()).value.records.filter(item=>item.code==='saveSuccess').length)()") !== savedMessages) throw new Error('Autosave success entered history');
  await evaluate("document.querySelector('[data-testid=save-note]').click()");
  await wait(150);
  const unchanged = await evaluate(`(async () => (await window.notebookAid.library.begin(${JSON.stringify(initial.id)})).value.note)()`);
  if (unchanged.version !== note.version) throw new Error('Unchanged save created a revision');
  writeFileSync(join(directory, 'simulate-write-failure'), 'self-test');
  await evaluate(`(() => {const title=document.querySelector('[data-testid=note-title]');title.value='失败后保留';title.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await evaluate('(() => {const entry=[...window.__autosaveTimers][0];window.clearTimeout(entry[0]);entry[1]();})()');
  await until("document.body.textContent.includes('WRITE_FAILED')");
  if (!await evaluate("document.querySelector('[data-testid=note-title]').value === '失败后保留'")) throw new Error('Draft was lost');
  const afterFailure = await evaluate(`(async () => (await window.notebookAid.library.begin(${JSON.stringify(initial.id)})).value.note)()`);
  if (afterFailure.title !== 'T03 中文测试') throw new Error('Failed save overwrote committed note');
  unlinkSync(join(directory, 'simulate-write-failure'));
  await evaluate("document.querySelector('[data-testid=save-note]').click()");
  await until("document.querySelector('[data-testid=save-status]').textContent.includes('已保存')");
  note = await evaluate(`(async () => (await window.notebookAid.library.begin(${JSON.stringify(initial.id)})).value.note)()`);
  await wait(250);
  const loaded = new Promise<void>(resolve => window.webContents.once('did-finish-load', () => resolve())); window.webContents.reload(); await loaded;
  await until("document.querySelector('[data-testid=note-title]')?.value === '失败后保留'");
  await until("document.querySelector('.ql-editor')?.textContent.includes('自动保存')");
  if (!await evaluate("document.querySelector('[data-testid=autosave-minutes]').value === '1' && document.querySelector('[data-testid=autosave-enabled]').checked")) throw new Error('Settings did not survive reload');
  await evaluate("document.querySelector('.diagnostics-pane [data-testid=rebuild-index]').click()");
  await until("[...document.querySelectorAll('[data-testid=notification]')].some(item=>item.textContent.includes('索引重建成功'))");
  const status = await evaluate('(async () => (await window.notebookAid.library.status()).value)()');
  if (!status.indexed) throw new Error('Packaged index rebuild failed');
  await evaluate("document.querySelector('[data-testid=diagnostics-tab]').click()");
  await until("document.querySelector('[data-testid=diagnostics-tab]').classList.contains('active')");
  await window.webContents.capturePage();
  await wait(300); writeFileSync(join(directory, 'diagnostics-light.png'), (await window.webContents.capturePage()).toPNG());
  await evaluate("document.querySelector('.nav-item').click()");
  if (!await evaluate("typeof window.require === 'undefined' && getComputedStyle(document.querySelector('.app-shell')).display === 'flex'")) throw new Error('Isolation/style failed');
  await wait(200);
  writeFileSync(join(directory, 'desktop-light.png'), (await window.webContents.capturePage()).toPNG());
  await evaluate("const theme=document.querySelector('[data-testid=theme]');theme.value='dark';theme.dispatchEvent(new Event('change'))");
  await wait(150); writeFileSync(join(directory, 'desktop-dark.png'), (await window.webContents.capturePage()).toPNG());
  await evaluate("document.querySelector('[data-testid=settings-tab]').click();const minutes=document.querySelector('[data-testid=autosave-minutes]');minutes.value='10';minutes.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('[data-testid=autosave-enabled]').click()");
  await wait(150); writeFileSync(join(directory, 'settings-dark.png'), (await window.webContents.capturePage()).toPNG());
  if (!await evaluate("[...document.querySelectorAll('button')].every(button=>button.querySelector('svg') || button.matches('[data-testid=note-security][data-encrypted=false]'))")) throw new Error('A button is missing an icon');
  await smokeRegistry(window, directory);
  await smokeSettings(window, directory);
  await smokeEditor(window, directory);
  await smokeSelect(window, directory);
  await smokeOrganization(window, directory);
  await smokeLibraryImport(window, directory);
  await smokeLayout(window, directory);
  await smokeI18n(window, directory);
  await smokeAttachments(window, directory);
  await smokeNotifications(window, directory);
  writeFileSync(join(directory, 'settings-expected.json'), JSON.stringify((await evaluate("window.notebookAid.library.settings({locale:null,theme:null,autosave:null})")).value));
  writeFileSync(join(directory, 'expected-exit-version.json'), JSON.stringify((await evaluate('window.notebookAid.library.list()')).value[0].version + 1));
  if (errors.length) throw new Error('Renderer errors: ' + errors.join('; '));
  const runtime = await evaluate('window.notebookAid.runtime()');
  writeFileSync(join(directory, 'smoke-report.json'), JSON.stringify({ runtime, noteId: note.id, version: note.version, indexed: status.indexed, manualSave: true, saveFeedback: true, rebuildFeedback: true, buttonIcons: true, autosave: true, autosaveTimerAdvancedByTest: true, autosaveOff: true, unchangedSaveNoRevision: true, failedWriteDraftRetained: true, failedWriteDidNotOverwrite: true, retry: true, reloadReacquiredSession: true, reloadContentPreserved: true, consoleErrors: errors }, null, 2));
  await evaluate(`(() => {const title=document.querySelector('[data-testid=note-title]');title.value='退出前保存';title.dispatchEvent(new Event('input',{bubbles:true}));})()`);
}
