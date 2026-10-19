import { installationLocale } from '../core/installation-locale';
import { updateText } from '../src/app/updates-i18n';
import { planFolderBulk,executeFolderBulk,type FolderBulkPlan } from '../core/folder-bulk';
import { decryptNotes } from '../core/decrypt-bulk';
import { randomUUID } from 'node:crypto';
import { planTasks, executeTasksAsync, tasksRows, TasksError, type TasksPlan } from '../core/tasks';
import type { TasksResult } from '../shared/tasks';
import { printRecovery } from './recovery-print';
import { renderNotePrint } from './note-print';
import { BackupStore, pathsOverlap, verifyBackup } from '../core/backups';
import { backupText } from '../src/app/backup-i18n';
import { archiveText } from '../src/app/archive-i18n';
import type { ExitCommand, ExitState } from '../shared/dialog';
import { registerDialogs } from './app-dialog';
import { securityText } from '../src/app/security-i18n';
import { latestNotebookSchemaVersion } from '../shared/library';
import { lifecycleText, type LifecycleKey } from '../src/app/lifecycle-i18n';
import { NativeImportCache } from './native-import';
import { DeltaError } from '../shared/delta-document';
import { validateNative } from '../core/delta-files';
import { attachmentHash } from '../core/attachments';
import { translate, type Locale } from '../src/app/i18n';
import { defaultSettings } from '../shared/settings';
import { app, dialog, ipcMain, nativeImage, type BrowserWindow, type IpcMainInvokeEvent } from 'electron';
import { existsSync, readFileSync, lstatSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { LibraryError } from '../core/library';
import { NotebookSecurity } from '../core/security';
import { inspectLibrary } from '../core/registry';
import { LibraryRegistry } from '../core/registry';
import { validateAppearance } from '../core/notebook-appearance';
import { SettingsStore } from '../core/settings';
import { formatExtensions, type NoteInput, type Result, type SaveRequest } from '../shared/library';
import { importNote, exportNote, exportPdf } from '../core/note-files';
import { cleanSvg } from './svg-import';
import { readAttachmentFile } from '../core/attachments';
import { cleanHtmlImport } from './html-import';
import { planImport, executeImport, plainPath } from '../core/library-import';
import { exportAttachmentFile, imageType, isSvg } from '../core/attachments';
import type { AttachmentRequest } from '../shared/attachments';

export function registerLibrary(dataPath: string, window: () => BrowserWindow | null, authorize: (event: IpcMainInvokeEvent) => void, selfTest = false, localeChanged: (locale: Locale) => void = () => {}, applicationLock?: { enabled(): boolean; lock(): void }, dialogAuthorize = authorize) {
  const dialogs = registerDialogs(dialogAuthorize);
  const showConfirmations = !selfTest || process.env['NOTEBOOKAID_DIALOG_TEST'] === '1' || process.env['NOTEBOOKAID_SECURITY_TEST'] === '1';
  let registry: LibraryRegistry | null = null;
  let settings: SettingsStore | null = null;
  const installedLocale = app.isPackaged && !selfTest ? installationLocale(dirname(process.execPath)) : null;
  const currentLocale = (): Locale => {
    if (settings) return settings.get().global.locale;
    if (existsSync(join(dataPath, 'settings.json'))) {
      try { return new SettingsStore(dataPath, { locale: null, theme: null, autosave: null }).get().global.locale; } catch { /* Keep startup available for settings recovery. */ }
    }
    return installedLocale ?? defaultSettings.global.locale;
  };
  const nativeImports = new NativeImportCache();
  let choosing = false;
  let batchBusy=false;
  let pendingFolder:{owner:string;token:string;plan:FolderBulkPlan;expires:number}|null=null;
  let pendingTasks:{owner:string;token:string;plan:TasksPlan;expires:number}|null=null;
  const tasksTimer=setInterval(()=>{if(!batchBusy&&pendingTasks&&Date.now()>pendingTasks.expires)pendingTasks=null;},1000);tasksTimer.unref();
  const taskHandle=(name:string,callback:(event:IpcMainInvokeEvent,...args:any[])=>unknown)=>ipcMain.handle('tasks:'+name,async(event,...args):Promise<TasksResult<unknown>>=>{
    authorize(event);
    try{return{ok:true,value:await callback(event,...args)};}catch(e){return{ok:false,code:e instanceof TasksError||e instanceof LibraryError?e.code:(e as NodeJS.ErrnoException).code==='ENOSPC'?'DISK_FULL':['EACCES','EPERM'].includes((e as NodeJS.ErrnoException).code??'')?'ACCESS_DENIED':'WRITE_FAILED'};}
  });
  taskHandle('preview',async event=>{
    if(choosing)throw new LibraryError('LIBRARY_IN_USE');choosing=true;pendingTasks=null;
    try{
      const library=get(),target=window();if(!target)throw new LibraryError('INVALID_INPUT');
      let path:string|null;
      if(selfTest&&existsSync(join(dataPath,'tasks-dialog.json'))){const value=JSON.parse(readFileSync(join(dataPath,'tasks-dialog.json'),'utf8')).path;path=value===null?null:resolve(value);if(path&&!path.startsWith(resolve(dataPath)+sep))throw new LibraryError('INVALID_INPUT');}
      else{const result=await dialog.showOpenDialog(target,{properties:['openFile'],filters:[{name:'Tasks iCalendar',extensions:['ics']}]});path=result.canceled?null:result.filePaths[0]??null;}
      authorize(event);if(!path)return null;if(library!==get())throw new LibraryError('VERSION_CONFLICT');
      const plan=planTasks(library,path),token=randomUUID();pendingTasks={owner:String(event.sender.id),token,plan,expires:Date.now()+10*60000};
      return{token,file:basename(path),libraryId:library.libraryId,rows:tasksRows(plan),ignored:plan.ignored};
    }finally{choosing=false;}
  });
  taskHandle('cancel',(event,token:unknown)=>{if(pendingTasks?.owner===String(event.sender.id)&&token===pendingTasks.token)pendingTasks=null;return null;});
  taskHandle('confirm',async(event,token:unknown,indices:number[],folderId:unknown=null,force:unknown=false)=>{
    if(choosing)throw new LibraryError('LIBRARY_IN_USE');
    const pending=pendingTasks;if(!pending||pending.owner!==String(event.sender.id)||typeof token!=='string'||token!==pending.token||Date.now()>pending.expires||pending.plan.library!==get())throw new TasksError('ICS_PREVIEW_EXPIRED');
    choosing=true;try{batchBusy=true;const result=await executeTasksAsync(pending.plan,indices,folderId,String(event.sender.id),value=>{if(!event.sender.isDestroyed())event.sender.send('tasks:progress',{...value,token:pending.token});},()=>{authorize(event);if(event.sender.isDestroyed()||pendingTasks!==pending||pending.plan.library!==get())throw new LibraryError('CANCELLED');if(pending.plan.library.status().security?.configured&&!pending.plan.library.status().security?.unlocked)throw new LibraryError('NOTEBOOK_LOCKED');},force);pendingTasks=null;return result;}finally{choosing=false;batchBusy=false;}
  });
  let backupStore: BackupStore | null = null;
  const backups = () => backupStore ??= new BackupStore(dataPath);
  const startedAt = Date.now(), backupRetries = new Map<string, number>();
  let backupJob: import('../shared/backup').BackupJob | null = null;
  let archivePending: string | null = null;
  const runBackup = async (id: string, directory: string) => {
    let sent = 0, phase = ''; batchBusy = true;
    const publish = (progress: import('../shared/backup').BackupProgress) => {
      backupJob = { id, progress }; const target = window(), now = Date.now();
      if (target && !target.isDestroyed() && (phase !== progress.phase || now - sent >= 100)) { target.webContents.send('library:backup-progress', backupJob); sent = now; phase = progress.phase; }
    };
    publish({ phase: 'validating', completed: 0, total: null });
    try { const result = await manager().backupAsync(id, directory, publish); backups().complete(id); return result; }
    catch (error) { publish({ phase: 'failed', completed: 0, total: null }); throw error; }
    finally { batchBusy = false; backupJob = null; const target = window(); if (target && !target.isDestroyed()) target.webContents.send('library:backup-progress', null); }
  };
  let lastActivity = Date.now(), locking = false;
  let pendingImport: { owner: string; plan: ReturnType<typeof planImport> } | null = null;
  let sourceSecurity: NotebookSecurity | null = null;
  let selectedImport: { owner: string; path: string } | null = null;
  const clearImport = () => { sourceSecurity?.lock(); sourceSecurity = null; pendingImport = null; selectedImport = null; };
  const legacyNotebookSeed = (entry: import('../shared/registry').LibraryEntry) => {
    const local = settings ?? (existsSync(join(dataPath, 'settings.json')) ? new SettingsStore(dataPath, { locale: null, theme: null, autosave: null }) : null);
    return { autosave: local?.get().libraries[entry.id] ?? null, dailyBackup: backups().state().policies[entry.id]?.enabled ?? false };
  };
  const manager = () => registry ??= new LibraryRegistry(dataPath, process.env['NOTEBOOKAID_TEST_HOME'] ? join(dataPath, 'library') : join(app.getPath('appData'), 'NotebookAid', 'library'), selfTest ? stage => {
    if (stage.startsWith('restore-') && existsSync(join(dataPath, 'simulate-restore-failure')) && readFileSync(join(dataPath, 'simulate-restore-failure'), 'utf8').trim() === stage) throw new Error('Simulated restore failure');
    if ((stage === 'journal' && existsSync(join(dataPath, 'simulate-write-failure'))) || (stage === 'notebook-settings' && existsSync(join(dataPath, 'simulate-settings-failure'))) || (stage === 'appearance' && existsSync(join(dataPath, 'simulate-appearance-failure'))) || (stage === 'registry' && existsSync(join(dataPath, 'simulate-registry-failure')))) throw new Error('Simulated write failure');
  } : undefined, progress => { const target = window(); if (target && !target.webContents.isDestroyed()) target.webContents.send('library:startup-progress', progress); }, legacyNotebookSeed);
  const get = () => manager().get();
  const settingsSnapshot = () => {
    if (!settings) throw new LibraryError('REGISTRY_INVALID');
    const state = settings.get();
    for (const [id, portable] of Object.entries(manager().portableSettings())) {
      if (portable.autosave === null) delete state.libraries[id]; else state.libraries[id] = portable.autosave;
    }
    return state;
  };
  const backupState = () => backups().notebookState(manager().portableSettings());
  const choosePath = async (): Promise<string | null> => {
    const target = window(); if (!target) throw new LibraryError('INVALID_INPUT');
    if (selfTest && existsSync(join(dataPath, 'registry-dialog.json'))) {
      const value = JSON.parse(readFileSync(join(dataPath, 'registry-dialog.json'), 'utf8'));
      if (value.path === null) return null;
      const path = resolve(value.path);
      if (!path.startsWith(resolve(dataPath) + require('node:path').sep)) throw new LibraryError('INVALID_INPUT');
      return path;
    }
    const selected = await dialog.showOpenDialog(target, { properties: ['openDirectory', 'createDirectory'] });
    return selected.canceled || !selected.filePaths[0] ? null : resolve(selected.filePaths[0]);
  };
  const chooseFor = async (action: (path: string) => unknown) => {
    if (choosing) throw new LibraryError('LIBRARY_IN_USE');
    choosing = true;
    try { const path = await choosePath(); return path ? action(path) : null; }
    finally { choosing = false; }
  };
  const handle = (name: string, callback: (owner: string, ...args: any[]) => unknown) => {
    ipcMain.handle(`library:${name}`, async (event, ...args): Promise<Result<unknown>> => {
      authorize(event);
      try { if(batchBusy&&!['status','list','query','organization','registry','end','backups','backupProgress'].includes(name)&&!(backupJob&&['settings','updateSettings'].includes(name)))throw new LibraryError('LIBRARY_IN_USE');return { ok: true, value: await callback(String(event.sender.id), ...args) }; }
      catch (error) { return { ok: false, code: (error instanceof LibraryError || error instanceof DeltaError) ? error.code : (error as NodeJS.ErrnoException).code === 'ENOSPC' ? 'DISK_FULL' : ['EACCES','EPERM'].includes((error as NodeJS.ErrnoException).code ?? '') ? 'ACCESS_DENIED' : 'WRITE_FAILED', ...(error instanceof LibraryError && error.details ? { details: error.details } : {}) }; }
    });
  };
  ipcMain.handle('folder-bulk:preview',async(event,folderId,includeChildren)=>{authorize(event);try{if(choosing)throw new LibraryError('LIBRARY_IN_USE');const plan=planFolderBulk(get(),folderId,includeChildren),token=randomUUID();pendingFolder={owner:String(event.sender.id),token,plan,expires:Date.now()+600000};return{ok:true,value:{token,folderId:plan.folderId,includeChildren:plan.includeChildren,count:plan.notes.length}};}catch(e){return{ok:false,code:e instanceof LibraryError?e.code:'WRITE_FAILED'};}});
  ipcMain.handle('folder-bulk:cancel',(event,token)=>{authorize(event);if(!batchBusy&&pendingFolder?.owner===String(event.sender.id)&&pendingFolder.token===token)pendingFolder=null;});
  ipcMain.handle('folder-bulk:confirm',async(event,token,mode)=>{authorize(event);try{
    if(choosing)throw new LibraryError('LIBRARY_IN_USE');const pending=pendingFolder;if(!pending||pending.owner!==String(event.sender.id)||pending.token!==token||Date.now()>pending.expires||pending.plan.library!==get())throw new LibraryError('VERSION_CONFLICT');
    choosing=true;batchBusy=true;try{const value=await executeFolderBulk(pending.plan,mode,progress=>{if(!event.sender.isDestroyed())event.sender.send('folder-bulk:progress',{...progress,token:pending.token});},()=>{authorize(event);if(event.sender.isDestroyed()||pendingFolder!==pending||pending.plan.library!==get())throw new LibraryError('CANCELLED');});pendingFolder=null;return{ok:true,value};}finally{choosing=false;batchBusy=false;}
  }catch(e){return{ok:false,code:e instanceof LibraryError?e.code:'WRITE_FAILED'};}});
  const maintenancePath = async (purpose: 'directory' | 'backup' | 'target', defaultPath?: string): Promise<string | null> => {
    const title = backupText(currentLocale(), purpose === 'backup' ? 'sourceTitle' : purpose === 'target' ? 'targetTitle' : 'backupDirectoryTitle');
    if (selfTest && existsSync(join(dataPath, 'backup-dialog.json'))) {
      const record = join(dataPath, 'backup-picker-titles.json'), titles = existsSync(record) ? JSON.parse(readFileSync(record, 'utf8')) : []; titles.push({ purpose, title }); writeFileSync(record, JSON.stringify(titles));
      const path = JSON.parse(readFileSync(join(dataPath, 'backup-dialog.json'), 'utf8'))[purpose];
      if (path === null) return null;
      if (typeof path !== 'string' || !resolve(path).startsWith(resolve(dataPath) + sep)) throw new LibraryError('INVALID_INPUT');
      return resolve(path);
    }
    const target = window(); if (!target) throw new LibraryError('INVALID_INPUT');
    const selected = await dialog.showOpenDialog(target, { title, buttonLabel: backupText(currentLocale(), 'choose'), ...(defaultPath ? { defaultPath } : {}), properties: purpose === 'backup' ? ['openDirectory'] : ['openDirectory','createDirectory'] });
    return selected.canceled || !selected.filePaths[0] ? null : resolve(selected.filePaths[0]);
  };
  const safeDestination = (path: string, allowNotebookId?: string) => {
    try { plainPath(path); } catch { throw new LibraryError('PATH_LINKED'); }
    const entries = manager().state().entries, same = entries.some(entry => entry.id === allowNotebookId && resolve(entry.path).toLowerCase() === resolve(path).toLowerCase());
    if ((!selfTest && (pathsOverlap(path, app.getAppPath()) || (!same && pathsOverlap(path, dataPath)))) || entries.some(entry => !(same && entry.id === allowNotebookId) && pathsOverlap(path, entry.path))) throw new LibraryError('PATH_OVERLAP');
  };
  handle('backups', () => backupState());
  handle('backupProgress', () => backupJob);
  handle('archiveOpenPending', () => archivePending !== null);
  handle('notebookArchive', async (_owner, action: 'import' | 'export', id?: string) => {
    if (!['import', 'export'].includes(action) || action === 'export' && (!id || !manager().has(id))) throw new LibraryError('INVALID_INPUT');
    if (choosing) throw new LibraryError('LIBRARY_IN_USE'); choosing = true;
    const ownerWindow = window(); if (!ownerWindow) { choosing = false; throw new LibraryError('INVALID_INPUT'); }
    const fixtures = selfTest && existsSync(join(dataPath, 'archive-dialog.json')) ? JSON.parse(readFileSync(join(dataPath, 'archive-dialog.json'), 'utf8')) : null;
    try {
      let source: string, destination: string;
      if (action === 'export') {
        const entry = manager().state().entries.find(item => item.id === id)!;
        const name = entry.name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 80) || 'NotebookAid';
        if (fixtures) destination = fixtures.target;
        else { const chosen = await dialog.showSaveDialog(ownerWindow, { title: archiveText(currentLocale(), 'export'), defaultPath: name + '.nabook', filters: [{ name: 'NotebookAid', extensions: ['nabook'] }] }); if (chosen.canceled || !chosen.filePath) return null; destination = chosen.filePath; }
        source = entry.path; safeDestination(destination);
      } else {
        const pending = archivePending; archivePending = null;
        if (pending) source = pending;
        else if (fixtures) source = fixtures.source;
        else { const chosen = await dialog.showOpenDialog(ownerWindow, { title: archiveText(currentLocale(), 'source'), properties: ['openFile'], filters: [{ name: 'NotebookAid', extensions: ['nabook'] }] }); if (chosen.canceled || !chosen.filePaths[0]) return null; source = chosen.filePaths[0]; }
        if (fixtures) destination = fixtures.target;
        else { const chosen = await dialog.showOpenDialog(ownerWindow, { title: archiveText(currentLocale(), 'location'), properties: ['openDirectory', 'createDirectory'] }); if (chosen.canceled || !chosen.filePaths[0]) return null; destination = chosen.filePaths[0]; }
        // The selected parent may contain other notebooks; the new child must not overlap one.
        safeDestination(join(destination, '.notebookaid-import-' + randomUUID()));
        if (!await dialogs.ask(ownerWindow, { kind: 'info', title: archiveText(currentLocale(), 'import'), message: archiveText(currentLocale(), 'hint'), detail: destination, cancelLabel: translate(currentLocale(), 'cancelOperation'), confirmLabel: archiveText(currentLocale(), 'import') })) return null;
      }
      if (typeof source !== 'string' || typeof destination !== 'string') throw new LibraryError('INVALID_INPUT');
      batchBusy = true; let last = 0;
      const progress = (value: import('../shared/backup').BackupProgress) => { backupJob = { id: id ?? 'archive-import', operation: action === 'export' ? 'archive-export' : 'archive-import', progress: value }; if (Date.now() - last > 100 || ['complete', 'failed'].includes(value.phase)) { last = Date.now(); if (!ownerWindow.isDestroyed()) ownerWindow.webContents.send('library:backup-progress', backupJob); } };
      progress({ phase: 'validating', completed: 0, total: null });
      if (action === 'export') { await manager().exportArchive(id!, destination, progress); return manager().state(); }
      return await manager().importArchive(source, destination, progress);
    } finally { choosing = false; batchBusy = false; backupJob = null; if (!ownerWindow.isDestroyed()) ownerWindow.webContents.send('library:backup-progress', null); }
  });
  handle('configureBackup', async (_owner, id, enabled, chooseDirectory) => {
    if (!manager().has(id) || typeof enabled !== 'boolean' || typeof chooseDirectory !== 'boolean') throw new LibraryError('INVALID_INPUT');
    if (choosing) throw new LibraryError('LIBRARY_IN_USE'); choosing = true;
    try {
      const directory = chooseDirectory ? await maintenancePath('directory') : backups().state().policies[id]?.directory ?? null;
      if (chooseDirectory && !directory) return null;
      if (directory) safeDestination(directory);
      if (enabled && !directory) throw new LibraryError('INVALID_INPUT');
      const previous = manager().notebookSettings(id).dailyBackup;
      manager().updateNotebookSettings(id, { dailyBackup: enabled });
      try { backups().update(id, directory, enabled); }
      catch (error) { manager().updateNotebookSettings(id, { dailyBackup: previous }); throw error; }
      return backupState();
    } finally { choosing = false; }
  });
  handle('maintenance', async (_owner, id, action) => {
    if (!manager().has(id) || !['backup', 'verify', 'restore', 'migrate'].includes(action)) throw new LibraryError('INVALID_INPUT');
    if (choosing) throw new LibraryError('LIBRARY_IN_USE'); choosing = true;
    try {
      if (action === 'verify') return manager().maintenance(id, action);
      if (action === 'backup') {
        const directory = backups().state().policies[id]?.directory; if (!directory) throw new LibraryError('INVALID_INPUT'); safeDestination(directory);
        return await runBackup(id, directory);
      }
      const backup = action === 'restore' ? await maintenancePath('backup') : null;
      if (action === 'restore' && !backup) return null;
      const entry = manager().state().entries.find(item => item.id === id)!;
      if (backup) {
        try { plainPath(backup); } catch { throw new LibraryError('PATH_LINKED'); }
        if (verifyBackup(backup).libraryId !== entry.libraryId) throw new LibraryError('LIBRARY_ID_MISMATCH');
      }
      const target = await maintenancePath('target', action === 'restore' ? entry.path : undefined); if (!target) return null; safeDestination(target, action === 'restore' ? id : undefined);
      const original = action === 'restore' && resolve(target).toLowerCase() === resolve(entry.path).toLowerCase();
      if (backup && pathsOverlap(target, backup)) throw new LibraryError('PATH_OVERLAP');
      if (existsSync(target) && !lstatSync(target).isDirectory()) throw new LibraryError('RESTORE_TARGET_INVALID');
      if (!original && existsSync(target) && readdirSync(target).length) throw new LibraryError('TARGET_NOT_EMPTY');
      if (Object.values(backups().state().policies).some(p => p.directory && pathsOverlap(target, p.directory))) throw new LibraryError('PATH_OVERLAP');
      const windowTarget = window(); if (!windowTarget) throw new LibraryError('INVALID_INPUT');
      if (!await dialogs.ask(windowTarget, { kind: 'warning', title: backupText(currentLocale(), action), message: backupText(currentLocale(), original ? 'restoreOriginalWarning' : 'switchWarning'), detail: backup ? backupText(currentLocale(), 'sourceTitle') + ': ' + backup + '\n' + backupText(currentLocale(), 'targetTitle') + ': ' + target : target, cancelLabel: translate(currentLocale(), 'cancelOperation'), confirmLabel: backupText(currentLocale(), action) })) return null;
      pendingTasks=null; nativeImports.clear(); clearImport(); return manager().maintenance(id, action, target, backup ?? undefined);
    } finally { choosing = false; }
  });
  handle('security', async (_owner, request: import('../shared/security').SecurityRequest) => {
    if (choosing) throw new LibraryError('LIBRARY_IN_USE');
    choosing = true;
    try { const result = await get().securityCommand(request); lastActivity = Date.now(); pendingTasks=null; nativeImports.clear(); clearImport(); return result; }
    finally { choosing = false; }
  });
  handle('securityPreference', (_owner, value) => get().setSecurityPreference(value));
  handle('encryptedNotes', () => get().encryptedNotes());
  ipcMain.handle('library:decryptNotes', async (event, credential: unknown) => {
    authorize(event);
    if (choosing || batchBusy) return { ok: false, code: 'LIBRARY_IN_USE' };
    if (typeof credential !== 'string' || credential.length > 1024) return { ok: false, code: 'INVALID_INPUT' };
    choosing = true; batchBusy = true;
    try {
      const library = get(), libraryId = library.status().libraryId;
      const value = await decryptNotes(library, credential, progress => { if (!event.sender.isDestroyed()) event.sender.send('library:decryptProgress', { ...progress, libraryId }); }, () => { authorize(event); if (event.sender.isDestroyed() || get() !== library) throw new LibraryError('CANCELLED'); });
      lastActivity = Date.now(); return { ok: true, value };
    } catch (error) { return { ok: false, code: error instanceof LibraryError ? error.code : (error as NodeJS.ErrnoException).code === 'ENOSPC' ? 'DISK_FULL' : ['EACCES', 'EPERM'].includes((error as NodeJS.ErrnoException).code ?? '') ? 'ACCESS_DENIED' : 'WRITE_FAILED' }; }
    finally { credential = ''; choosing = false; batchBusy = false; }
  });
  handle('printRecovery', async (_owner, mode, key) => {
    if (choosing) throw new LibraryError('LIBRARY_IN_USE');
    const state = get().status().security;
    if (!state?.configured || !state.unlocked) throw new LibraryError('NOTEBOOK_LOCKED');
    const target = window(); if (!target) throw new LibraryError('INVALID_INPUT');
    choosing = true;
    try { return await printRecovery(target, mode, key, currentLocale(), manager().currentName(), selfTest && process.env['NOTEBOOKAID_SECURITY_TEST'] === '1' ? dataPath : undefined); }
    finally { choosing = false; }
  });
  handle('upgradeLibrary', async (_owner, id: string, expected: number) => {
    if (choosing) throw new LibraryError('LIBRARY_IN_USE');
    const entry = manager().state().entries.find(item => item.id === id);
    if (!entry || entry.availability !== 'available') throw new LibraryError('NOT_FOUND_OR_UNAVAILABLE');
    if (entry.schemaVersion === latestNotebookSchemaVersion) return manager().upgrade(id, expected);
    const target = window(); if (!target) throw new LibraryError('INVALID_INPUT');
    choosing = true;
    try {
      const accepted = await dialogs.ask(target, { kind: 'warning', title: translate(currentLocale(), 'upgradeSchema'), message: translate(currentLocale(), 'schemaUpgradePrompt').replace('{version}', String(latestNotebookSchemaVersion)), cancelLabel: translate(currentLocale(), 'cancelOperation'), confirmLabel: translate(currentLocale(), 'upgradeSchema') });
      return accepted ? manager().upgrade(id, expected) : null;
    } finally { choosing = false; }
  });
  handle('protectNote', (_owner, id, version, encrypted) => get().protect(id, version, encrypted));
  handle('noteVisibility', (_owner, id, version, visible) => get().setVisibility(id, version, visible));
  ipcMain.on('library:activity', event => { try { authorize(event as IpcMainInvokeEvent); lastActivity = Date.now(); } catch { /* Ignore untrusted activity. */ } });
  const confirmLifecycle = async (key: LifecycleKey, action: () => unknown, upgrade = false, count?: number) => {
    if (choosing) throw new LibraryError('LIBRARY_IN_USE');
    choosing = true;
    try {
      const target = window(); if (!target) throw new LibraryError('INVALID_INPUT');
      let accepted: boolean;
      if (!showConfirmations) accepted = !existsSync(join(dataPath, 'cancel-lifecycle'));
      else {
        const confirmLabel = lifecycleText(currentLocale(), key === 'cleanupWarning' ? 'clean' : key === 'confirmRestore' ? 'restore' : key === 'confirmMove' ? 'move' : key === 'confirmPurge' ? 'purge' : 'remove');
        accepted = await dialogs.ask(target, { kind: 'warning', title: confirmLabel, message: lifecycleText(currentLocale(), key).replace('{count}', String(count ?? '')), detail: upgrade ? lifecycleText(currentLocale(), 'upgrade') : '', cancelLabel: translate(currentLocale(), 'cancelOperation'), confirmLabel });
      }
      return accepted ? action() : null;
    } finally { choosing = false; }
  };
  handle('cleanHistory', (_owner, id, version, retain, op) => {
    if (!Number.isSafeInteger(retain) || retain < 1) throw new LibraryError('INVALID_INPUT');
    const count = Math.max(0, get().history(id).total - retain);
    return confirmLifecycle('cleanupWarning', () => get().cleanHistory(id, version, retain, op), JSON.parse(readFileSync(join(get().path, 'library.json'), 'utf8')).schemaVersion < 6, count);
  });
  handle('history', (_owner, id, offset) => get().history(id, offset));
  handle('revision', (_owner, id, revision) => get().revision(id, revision));
  handle('trashNote', (_owner, id, version, op) => confirmLifecycle('confirmMove', () => get().trash(id, version, op)));
  handle('restoreNote', (_owner, id, version, op) => get().restore(id, version, op));
  handle('restoreRevision', (_owner, id, revision, version, op) => confirmLifecycle('confirmRestore', () => get().restore(id, version, op, revision)));
  handle('purgeNote', async (_owner, id, version, op) => !!await confirmLifecycle('confirmPurge', () => { get().purge(id, version, op); return true; }));
  handle('deleteOrganization', (_owner, kind, id, version) => confirmLifecycle('confirmRemove', () => get().deleteOrganization(kind, id, version), JSON.parse(readFileSync(join(get().path, 'library.json'), 'utf8')).schemaVersion < 6));
  let delayStartupTest = selfTest && process.env['NOTEBOOKAID_STARTUP_TEST'] === '1';
  handle('status', async () => { if (delayStartupTest) { delayStartupTest = false; await new Promise(resolve => setTimeout(resolve, 1200)); } return get().status(); });
  handle('cancelImport', () => { if (choosing) throw new LibraryError('LIBRARY_IN_USE'); clearImport(); });
  handle('previewImport', async (owner, credential?: string) => {
    if (choosing) throw new LibraryError('LIBRARY_IN_USE');
    choosing = true; pendingImport = null;
    try {
      if (get().securityState().configured && !get().securityState().unlocked) throw new LibraryError('NOTEBOOK_LOCKED');
      const source = credential !== undefined ? selectedImport?.owner === owner ? selectedImport.path : null : await choosePath(); if (!source) { clearImport(); return null; }
      sourceSecurity?.lock(); sourceSecurity = null;
      selectedImport = { owner, path: source };
      const inspected = inspectLibrary(source);
      sourceSecurity = new NotebookSecurity(inspected.path, inspected.libraryId, undefined, true);
      if (sourceSecurity.configured) { if (credential === undefined) throw new LibraryError('BAD_CREDENTIAL'); await sourceSecurity.unlock(credential); }
      const plan = planImport(source, get().path, { source: sourceSecurity, target: get().importSecurity() }); pendingImport = { owner, plan }; return plan.preview;
    } finally { choosing = false; }
  });
  handle('confirmImport', (owner, token: string) => {
    if (choosing || !pendingImport || pendingImport.owner !== owner || pendingImport.plan.preview.token !== token || pendingImport.plan.target.path !== get().path) throw new LibraryError('INVALID_INPUT');
    const plan = pendingImport.plan; pendingImport = null; choosing = true;
    try { const result = executeImport(plan); get().reloadImported(); return result; }
    catch (error) { if (existsSync(join(plan.target.path, 'import-transaction.json'))) manager().close(); throw error; }
    finally { clearImport(); choosing = false; }
  });
  handle('settings', (_owner, legacy: unknown) => {
    settings ??= new SettingsStore(dataPath, legacy, selfTest ? () => { if (existsSync(join(dataPath, 'simulate-settings-failure'))) throw new Error('Simulated settings failure'); } : undefined, installedLocale ?? defaultSettings.global.locale);
    localeChanged(settings.get().global.locale);
    return settingsSnapshot();
  });
  handle('updateSettings', (_owner, patch: unknown) => { if (!settings) throw new LibraryError('REGISTRY_INVALID'); const state = settings.update(patch); localeChanged(state.global.locale); return settingsSnapshot(); });
  handle('librarySettings', (_owner, id: string, value: unknown) => { if (!settings || !manager().has(id)) throw new LibraryError('INVALID_INPUT'); manager().updateNotebookSettings(id, { autosave: value }); return settingsSnapshot(); });
  handle('organization', () => get().organization());
  handle('editOrganization', (_owner, input) => get().editOrganization(input));
  handle('place', (owner, request) => {
    const result = get().place(request, owner);
    if (selfTest && existsSync(join(dataPath, 'simulate-placement-response-loss'))) throw new LibraryError('COMMIT_STATUS_UNKNOWN');
    return result;
  });
  handle('query', (_owner, input) => get().query(input));
  handle('list', () => get().list());
  handle('duplicate',(owner,request:AttachmentRequest,title:string)=>get().duplicate(request,owner,title));
  handle('attachments', (_owner, noteId: string) => get().attachmentList(noteId));
  handle('unlinkAttachment', (owner, request: AttachmentRequest, id: string) => get().unlinkAttachment(request, owner, id));
  handle('renameAttachment', (owner, request: AttachmentRequest, id: string, name: string) => get().renameAttachment(request, owner, id, name));
  handle('previewAttachment', async (_owner, noteId: string, id: string) => {
    const library = get(), bytes = library.attachmentBytes(noteId, id), mediaType = imageType(bytes);
    try {
    if (isSvg(bytes) || /\.svg$/i.test(library.read(noteId).attachments!.find(item => item.id === id)!.name)) {
      const clean = await cleanSvg(bytes);
      if (get() !== library) throw new LibraryError('NOT_FOUND_OR_UNAVAILABLE');
      library.read(noteId);
      return { mediaType: 'image/svg+xml', dataUrl: 'data:image/svg+xml;base64,' + Buffer.from(clean.body).toString('base64'), removedUnsafeSvg: clean.removed };
    }
    if (mediaType.startsWith('image/')) return { mediaType, dataUrl: `data:${mediaType};base64,${bytes.toString('base64')}` };
    if (bytes.length <= 1024 * 1024) {
      try { const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); if (!text.includes('\0')) return { mediaType: 'text/plain', text }; } catch { /* Binary files remain exportable without execution. */ }
    }
    return { mediaType };
    } finally { bytes.fill(0); }
  });
  handle('addAttachment', async (owner, request: AttachmentRequest) => {
    const target = window(); if (!target || choosing) throw new LibraryError('LIBRARY_IN_USE');
    choosing = true;
    try {
      let path: string | null;
      if (selfTest) path = await fileDialog();
      else { const result = await dialog.showOpenDialog(target, { properties: ['openFile'] }); path = result.canceled ? null : result.filePaths[0]; }
      if (!path) return null;
      if (showConfirmations && JSON.parse(readFileSync(join(get().path, 'library.json'), 'utf8')).schemaVersion < 4) {
        const accepted = await dialogs.ask(target, { kind: 'info', title: translate(currentLocale(), 'addAttachment'), message: translate(currentLocale(), 'attachmentUpgrade'), cancelLabel: translate(currentLocale(), 'cancelOperation'), confirmLabel: translate(currentLocale(), 'addAttachment') });
        if (!accepted) return null;
      }
      const library = get();
      const bytes = readAttachmentFile(path);
      if (isSvg(bytes) || /\.svg$/i.test(path)) {
        const clean = await cleanSvg(bytes);
        return { ...library.addAttachment(request, owner, path, Buffer.from(clean.body)), removedUnsafeSvg: clean.removed };
      }
      return library.addAttachment(request, owner, path);
    } finally { choosing = false; }
  });
  handle('exportAttachment', async (_owner, noteId: string, id: string) => {
    const target = window(); if (!target || choosing) throw new LibraryError('LIBRARY_IN_USE');
    choosing = true;
    let bytes: Buffer | undefined;
    try {
      const note = get().read(noteId), item = note.attachments!.find(row => row.id === id)!;
      if (note.encrypted && !await confirmPlainExport(target)) return false;
      bytes = get().attachmentBytes(noteId, id);
      let path: string | null | undefined;
      if (selfTest) path = await fileDialog();
      else { const result = await dialog.showSaveDialog(target, { defaultPath: item.name }); path = result.canceled ? null : result.filePath; }
      if (!path) return false;
      exportAttachmentFile(path, bytes, [dataPath, app.isPackaged ? dirname(process.execPath) : app.getAppPath(), ...manager().state().entries.map(entry => entry.path)]);
      return true;
    } finally { bytes?.fill(0); choosing = false; }
  });
  handle('create', async (owner, id: string, input?: NoteInput) => {
    if (choosing) throw new LibraryError('LIBRARY_IN_USE');
    choosing = true;
    try {
      const original = input;
      if (input?.nativeImportToken !== undefined) {
        const resolved = nativeImports.resolve(owner, get().libraryId, id, input);
        if (resolved.result) return resolved.result;
        input = resolved.input;
      }
      if (input?.primaryFormat === 'delta') {
        if (!original?.nativeImportToken) validateNative(input.body, input.nativeAttachments);
        if (showConfirmations && JSON.parse(readFileSync(join(get().path, 'library.json'), 'utf8')).schemaVersion < 5) {
          const target = window(); if (!target) throw new LibraryError('INVALID_INPUT');
          const accepted = await dialogs.ask(target, { kind: 'info', title: translate(currentLocale(), 'newNote'), message: translate(currentLocale(), 'deltaUpgrade'), cancelLabel: translate(currentLocale(), 'cancelOperation'), confirmLabel: translate(currentLocale(), 'newNote') });
          if (!accepted) { nativeImports.clear(owner); throw new LibraryError('CANCELLED'); }
        }
      }
      const result = get().create(id, input);
      if (original?.nativeImportToken) nativeImports.complete(id, original, result);
      return result;
    } finally { choosing = false; }
  });
  const fileDialog = async (input?: NoteInput): Promise<string | null> => {
    const target = window(); if (!target) throw new LibraryError('INVALID_INPUT');
    if (selfTest && existsSync(join(dataPath, 'note-file-dialog.json'))) {
      const fixture = JSON.parse(readFileSync(join(dataPath, 'note-file-dialog.json'), 'utf8'));
      if (fixture.path === null) return null;
      const path = resolve(fixture.path);
      const exportRoot = join(tmpdir(), `notebookaid-export-${basename(dataPath)}`);
      if (!path.startsWith(resolve(dataPath) + sep) && !path.startsWith(exportRoot + sep)) throw new LibraryError('INVALID_INPUT');
      return path;
    }
    if (input) {
      if (!Object.hasOwn(formatExtensions, input.primaryFormat) || typeof input.title !== 'string') throw new LibraryError('INVALID_INPUT');
      const extension = formatExtensions[input.primaryFormat];
      const name = input.title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/, '').slice(0, 80) || 'NotebookAid';
      const selected = await dialog.showSaveDialog(target, { defaultPath: `${name}-copy.${extension}`, filters: [{ name: extension.toUpperCase(), extensions: [extension] }] });
      return selected.canceled ? null : selected.filePath ?? null;
    }
    const selected = await dialog.showOpenDialog(target, { properties: ['openFile'], filters: [{ name: 'UTF-8 notes', extensions: ['md', 'markdown', 'html', 'htm', 'txt', 'nadelta'] }] });
    return selected.canceled ? null : selected.filePaths[0] ?? null;
  };
  handle('importFile', async (owner) => {
    if (choosing) throw new LibraryError('LIBRARY_IN_USE');
    choosing = true;
    try {
      const path = await fileDialog(); if (!path) return null;
      nativeImports.clear();
      const input = importNote(path);
      if (input.primaryFormat === 'delta') {
        let removed = 0;
        for (const item of input.nativeAttachments ?? []) {
          const bytes = Buffer.from(item.data, 'base64');
          if (isSvg(bytes) || /\.svg$/i.test(item.name)) {
            const clean = await cleanSvg(bytes), safe = Buffer.from(clean.body);
            item.data = safe.toString('base64'); item.size = safe.length; item.sha256 = attachmentHash(safe); item.mediaType = 'application/octet-stream'; removed += clean.removed;
          }
        }
        return { ...nativeImports.put(owner, get().libraryId, input), removed };
      }
      if (input.primaryFormat !== 'html') return input;
      const cleaned = await cleanHtmlImport(input.body);
      return { ...input, body: cleaned.body, removed: cleaned.removed };
    }
    finally { clearImport(); choosing = false; }
  });
  handle('exportFile', async (_owner, input: NoteInput) => {
    if (choosing) throw new LibraryError('LIBRARY_IN_USE');
    if (!input || !Object.hasOwn(formatExtensions, input.primaryFormat) || typeof input.body !== 'string' || Buffer.byteLength(input.body) > 2 * 1024 * 1024) throw new LibraryError('INVALID_INPUT');
    choosing = true;
    try {
      const target = window(); if (!target) throw new LibraryError('INVALID_INPUT');
      const exported = input.attachmentNoteId ? get().read(input.attachmentNoteId) : undefined;
      if (exported?.encrypted && !await confirmPlainExport(target)) return false;
      const path = await fileDialog(input); if (!path) return false;
      const library = get();
      const note = input.primaryFormat === 'delta' ? library.read(input.attachmentNoteId ?? '') : undefined;
      const source = note ? { items: note.attachments ?? [], read: (item: import('../shared/attachments').Attachment) => library.attachmentBytes(note.id, item.id) } : undefined;
      exportNote(path, input, [dataPath, app.isPackaged ? dirname(process.execPath) : app.getAppPath(), ...manager().state().entries.map(entry => entry.path)], source);
      return true;
    } finally { choosing = false; }
  });
  handle('printNote', async (_owner, input: NoteInput, mode: unknown) => {
    if (choosing) throw new LibraryError('LIBRARY_IN_USE');
    if (!input || input.primaryFormat !== 'html' || typeof input.title !== 'string' || input.title.length > 300 || typeof input.body !== 'string' || input.body.includes('\0') || Buffer.byteLength(input.body) > 12 * 1024 * 1024 || typeof input.attachmentNoteId !== 'string' || !['print', 'pdf'].includes(mode as string)) throw new LibraryError('INVALID_INPUT');
    const library = get(), note = library.read(input.attachmentNoteId);
    choosing = true;
    try {
      const target = window(); if (!target) throw new LibraryError('INVALID_INPUT');
      if (note.encrypted && !await confirmPlainExport(target)) return false;
      let path: string | null = null;
      if (mode === 'pdf') {
        if (selfTest && existsSync(join(dataPath, 'note-file-dialog.json'))) path = await fileDialog();
        else {
          const name = input.title.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/, '').slice(0, 80) || 'NotebookAid';
          const selected = await dialog.showSaveDialog(target, { defaultPath: name + '.pdf', filters: [{ name: 'PDF', extensions: ['pdf'] }] });
          path = selected.canceled ? null : selected.filePath ?? null;
        }
        if (!path) return false;
      }
      library.read(note.id);
      const result = await renderNotePrint(target, input.title, input.body, mode === 'pdf', selfTest);
      if (Buffer.isBuffer(result)) {
        try { exportPdf(path!, result, [dataPath, app.isPackaged ? dirname(process.execPath) : app.getAppPath(), ...manager().state().entries.map(entry => entry.path)]); }
        finally { result.fill(0); }
        return true;
      }
      return result;
    } finally { choosing = false; }
  });
  const confirmPlainExport = async (target: BrowserWindow): Promise<boolean> => !showConfirmations || dialogs.ask(target, { kind: 'warning', title: translate(currentLocale(), 'exportCopy'), message: securityText(currentLocale(), 'plainExport'), cancelLabel: securityText(currentLocale(), 'cancel'), confirmLabel: securityText(currentLocale(), 'confirm') });
  handle('begin', (owner, id: string) => get().begin(id, owner));
  handle('end', (owner, token: string, generation: string) => get().end(token, generation, owner));
  handle('save', (owner, request: SaveRequest) => get().save(request, owner));
  handle('rebuild', () => get().rebuild());
  handle('registry', () => manager().state());
  handle('setNotebookAppearance', (_owner, id, value) => {
    if (choosing) throw new LibraryError('LIBRARY_IN_USE');
    value = validateAppearance(value);
    if (value?.cover) {
      if (typeof value.cover !== 'string' || value.cover.length > 1500000 || !value.cover.startsWith('data:image/png;base64,')) throw new LibraryError('INVALID_INPUT');
      const image = nativeImage.createFromDataURL(value.cover), size = image.getSize();
      if (image.isEmpty() || size.width !== 512 || size.height !== 512) throw new LibraryError('INVALID_INPUT');
      value = { ...value, cover: image.toDataURL() };
    }
    return manager().setAppearance(id, value);
  });
  handle('chooseNotebookCover', async (_owner, id) => {
    if (!manager().has(id)) throw new LibraryError('INVALID_INPUT');
    if (choosing) throw new LibraryError('LIBRARY_IN_USE');
    choosing = true;
    try {
      let path: string | null;
      if (selfTest && existsSync(join(dataPath, 'cover-dialog.json'))) {
        const value = JSON.parse(readFileSync(join(dataPath, 'cover-dialog.json'), 'utf8')).path;
        path = value === null ? null : typeof value === 'string' && resolve(value).startsWith(resolve(dataPath) + sep) ? resolve(value) : null;
      } else {
        const target = window(); if (!target) throw new LibraryError('INVALID_INPUT');
        const result = await dialog.showOpenDialog(target, { properties: ['openFile'], filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] }] });
        path = result.canceled ? null : result.filePaths[0] ?? null;
      }
      if (!path) return null;
      const info = lstatSync(path);
      if (!info.isFile() || info.isSymbolicLink() || info.size > 20 * 1024 * 1024) throw new LibraryError('INVALID_INPUT');
      const image = nativeImage.createFromBuffer(readFileSync(path)), size = image.getSize();
      if (image.isEmpty() || size.width > 8192 || size.height > 8192 || size.width * size.height > 32000000) throw new LibraryError('INVALID_INPUT');
      const limit = Math.min(1, 2048 / Math.max(size.width, size.height));
      return (limit < 1 ? image.resize({ width: Math.max(1, Math.round(size.width * limit)), height: Math.max(1, Math.round(size.height * limit)), quality: 'good' }) : image).toDataURL();
    } finally { choosing = false; }
  });
  handle('activate', (_owner, id: string) => { if (choosing) throw new LibraryError('LIBRARY_IN_USE'); pendingTasks=null;pendingFolder=null; clearImport(); nativeImports.clear(); return manager().activate(id); });
  handle('register', (_owner, mode: 'existing' | 'create') => {
    if (mode !== 'existing' && mode !== 'create') throw new LibraryError('INVALID_INPUT');
    return chooseFor(path => manager().add(path, mode));
  });
  handle('rename', (_owner, id: string, name: string) => manager().rename(id, name));
  handle('remove', (_owner, id: string) => manager().remove(id));
  handle('relocate', (_owner, id: string) => chooseFor(path => manager().relocate(id, path)));
  const exitState = (target: BrowserWindow, command: ExitCommand): Promise<ExitState | null> => new Promise(resolveState => {
    if (target.isDestroyed() || target.webContents.isDestroyed() || target.webContents.isLoadingMainFrame()) { resolveState(null); return; }
    const id = randomUUID();
    const finish = (state: ExitState | null) => { clearTimeout(timer); ipcMain.removeListener('library:exit-result', listener); resolveState(state); };
    const listener = (event: Electron.IpcMainEvent, responseId: unknown, value: unknown) => {
      if (responseId !== id || event.sender !== target.webContents || event.senderFrame !== target.webContents.mainFrame) return;
      const state = value as ExitState | null;
      finish(state && typeof state.dirty === 'boolean' && typeof state.busy === 'boolean' && typeof state.saved === 'boolean' ? state : null);
    };
    const timer = setTimeout(() => finish(null), 15000);
    ipcMain.on('library:exit-result', listener); target.webContents.send('library:flush-exit', id, command);
  });
  const autoLock = setInterval(() => {
    const testIdle = selfTest && existsSync(join(dataPath, 'simulate-security-idle'));
    if (!registry || choosing || locking || (!testIdle && Date.now() - lastActivity < 15 * 60 * 1000)) return;
    const target = window(); if (!target || (!get().securityState().unlocked && !applicationLock?.enabled())) return;
    locking = true;
    void (async () => {
      let reloaded = false;
      try {
        const state = await exitState(target, 'save');
        if (state?.saved && !state.dirty && !state.busy) { get().lockSecurity(); pendingTasks=null; nativeImports.clear(); clearImport(); target.webContents.send('library:locked'); if (applicationLock?.enabled()) { reloaded = true; applicationLock.lock(); } }
      } finally { lastActivity = Date.now(); if (!reloaded) await exitState(target, 'resume'); locking = false; }
    })();
  }, 5000);
  autoLock.unref();
  const backupTimer = setInterval(() => {
    if (!registry || choosing || locking) return;
    let due: import('../shared/backup').BackupState['policies'];
    try { due = backupState().policies; } catch { return; }
    const dueNow = selfTest && process.env['NOTEBOOKAID_BACKUP_TEST'] === '1' && existsSync(join(dataPath, 'simulate-backup-due')) ? Date.now() + 86400001 : Date.now();
    const item = Object.entries(due).find(([id, p]) => p.enabled && p.directory && p.nextAt !== null && p.nextAt >= startedAt && p.nextAt <= dueNow && (backupRetries.get(id) ?? 0) < Date.now() && manager().has(id));
    const target = window(); if (!item || !target) return;
    const [id, policy] = item; locking = true; choosing = true;
    void (async () => {
      try {
        const state = await exitState(target, 'save'); if (!state?.saved || state.dirty || state.busy) return;
        const latest = backupState().policies[id]; if (!latest?.enabled || latest.directory !== policy.directory) return;
        choosing = true; safeDestination(policy.directory!); await runBackup(id, policy.directory!);
        if (!target.isDestroyed()) target.webContents.send('library:backup-status', { ok: true, libraryId: manager().state().entries.find(entry => entry.id === id)?.libraryId ?? null });
      } catch { backupRetries.set(id, Date.now() + 300000); if (!target.isDestroyed()) target.webContents.send('library:backup-status', { ok: false, libraryId: null }); }
      finally { choosing = false; if (!target.isDestroyed()) await exitState(target, 'resume'); locking = false; }
    })();
  }, selfTest && process.env['NOTEBOOKAID_BACKUP_TEST'] === '1' ? 1000 : 60000); backupTimer.unref();
  return {
    requestArchive: (path: string) => { archivePending = path; const target = window(); if (target && !target.isDestroyed()) target.webContents.send('library:archive-open'); },
    writingContext: () => {if(batchBusy)throw new LibraryError('LIBRARY_IN_USE');return {library:get(),locale:currentLocale()};},
    writingEnabled: () => !!settings && settings.get().global.aiEnabled !== false,
    autoUpdatesEnabled: () => settings?.get().global.autoUpdates !== false,
    confirmUpdate: async () => { const target = window(); return !!target && !choosing && !batchBusy && dialogs.ask(target, { kind: 'info', title: updateText(currentLocale(), 'title'), message: updateText(currentLocale(), 'confirm'), cancelLabel: translate(currentLocale(), 'cancelOperation'), confirmLabel: updateText(currentLocale(), 'install') }); },
    confirmWriting: (message: string) => { const target = window(); return target ? dialogs.ask(target, {kind:'warning',title:translate(currentLocale(),'about'),message,cancelLabel:translate(currentLocale(),'cancelOperation'),confirmLabel:securityText(currentLocale(),'confirm')}) : Promise.resolve(false); },
    addonContext: () => { if(batchBusy)throw new LibraryError('LIBRARY_IN_USE');const library = get(); return { library, name: manager().currentName(), unlocked: true, locale: currentLocale(), theme: settings?.get().global.theme ?? 'system' }; },
    locale: currentLocale,
    zoom: () => { try { return (settings ?? (existsSync(join(dataPath, 'settings.json')) ? new SettingsStore(dataPath, { locale: null, theme: null, autosave: null }) : null))?.get().global.zoomPercent ?? 100; } catch { return 100; } },
    theme: () => { try { return (settings ?? (existsSync(join(dataPath, 'settings.json')) ? new SettingsStore(dataPath, { locale: null, theme: null, autosave: null }) : null))?.get().global.theme ?? 'system'; } catch { return 'system' as const; } },
    lock: () => { pendingFolder=null;pendingTasks=null; nativeImports.clear(); clearImport(); if (registry?.state().activeId) get().lockSecurity(); },
    release: (owner: string) => { if(pendingFolder?.owner===owner)pendingFolder=null; if(pendingTasks?.owner===owner)pendingTasks=null; dialogs.cancel(); nativeImports.clear(owner); clearImport(); registry?.release(owner); if (registry?.state().activeId) registry.get().lockSecurity(); },
    close: () => { pendingFolder=null;pendingTasks=null; clearInterval(tasksTimer); clearInterval(autoLock); clearInterval(backupTimer); clearImport(); dialogs.cancel(); nativeImports.clear(); registry?.close(); registry = null; },
    flush: async (): Promise<boolean> => {
      if (choosing || batchBusy || locking) return false;
      const target = window(); if (!target || target.webContents.isDestroyed()) return false;
      const state = await exitState(target, 'save');
      const saved = !!state?.saved && !state.dirty && !state.busy;
      if (!saved) await exitState(target, 'resume');
      return saved;
    },
    confirmExit: async (allowTray = false): Promise<boolean | 'tray'> => {
      const target = window(); if (!target || choosing) return false;
      let accepted = false;
      try {
        const state = await exitState(target, 'inspect');
        if (!state || state.busy) {
          await dialogs.ask(target, { kind: 'warning', title: translate(currentLocale(), 'exitApp'), message: translate(currentLocale(), 'exitBlocked'), cancelLabel: translate(currentLocale(), 'cancelOperation'), confirmLabel: translate(currentLocale(), 'keepEditing') });
          return false;
        }
        const answer = await dialogs.choose(target, {
          kind: state.dirty ? 'warning' : 'info', title: translate(currentLocale(), allowTray ? 'closeWindow' : 'exitApp'),
          message: allowTray ? translate(currentLocale(), 'closeWindowChoice') + (state.dirty ? '\n' + translate(currentLocale(), 'exitUnsaved') : '') : translate(currentLocale(), state.dirty ? 'exitUnsaved' : 'exitClean'),
          trayLabel: allowTray ? translate(currentLocale(), 'minimizeToTray') : undefined,
          cancelLabel: translate(currentLocale(), 'cancelOperation'),
          confirmLabel: translate(currentLocale(), state.dirty ? 'saveAndExit' : 'confirmExit'),
          discardLabel: state.dirty ? translate(currentLocale(), 'discardAndExit') : undefined
        });
        if (answer === false) return false;
        if (answer === 'tray') return 'tray';
        if (answer === 'discard') { accepted = true; return true; }
        const final = await exitState(target, state.dirty ? 'save' : 'inspect');
        accepted = !!final && !final.busy && !final.dirty && (!state.dirty || final.saved);
        return accepted;
      } finally { if (!accepted) await exitState(target, 'resume'); }
    }
  };
}
