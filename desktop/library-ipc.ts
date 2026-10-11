import { translate, type Locale } from '../src/app/i18n';
import { defaultSettings } from '../shared/settings';
import { app, dialog, ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from 'electron';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { LibraryError } from '../core/library';
import { LibraryRegistry } from '../core/registry';
import { SettingsStore } from '../core/settings';
import { formatExtensions, type NoteInput, type Result, type SaveRequest } from '../shared/library';
import { importNote, exportNote } from '../core/note-files';
import { cleanSvg } from './svg-import';
import { readAttachmentFile } from '../core/attachments';
import { cleanHtmlImport } from './html-import';
import { planImport, executeImport } from '../core/library-import';
import { exportAttachmentFile, imageType, isSvg } from '../core/attachments';
import type { AttachmentRequest } from '../shared/attachments';

export function registerLibrary(dataPath: string, window: () => BrowserWindow | null, authorize: (event: IpcMainInvokeEvent) => void, selfTest = false, localeChanged: (locale: Locale) => void = () => {}) {
  let registry: LibraryRegistry | null = null;
  let settings: SettingsStore | null = null;
  const currentLocale = (): Locale => {
    if (settings) return settings.get().global.locale;
    if (existsSync(join(dataPath, 'settings.json'))) {
      try { return new SettingsStore(dataPath, { locale: null, theme: null, autosave: null }).get().global.locale; } catch { /* Keep startup available for settings recovery. */ }
    }
    return defaultSettings.global.locale;
  };
  let choosing = false;
  let pendingImport: { owner: string; plan: ReturnType<typeof planImport> } | null = null;
  const manager = () => registry ??= new LibraryRegistry(dataPath, process.env['NOTEBOOKAID_TEST_HOME'] ? join(dataPath, 'library') : join(app.getPath('appData'), 'NotebookAid', 'library'), selfTest ? stage => {
    if ((stage === 'journal' && existsSync(join(dataPath, 'simulate-write-failure'))) || (stage === 'registry' && existsSync(join(dataPath, 'simulate-registry-failure')))) throw new Error('Simulated write failure');
  } : undefined);
  const get = () => manager().get();
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
      try { return { ok: true, value: await callback(String(event.sender.id), ...args) }; }
      catch (error) { return { ok: false, code: error instanceof LibraryError ? error.code : 'WRITE_FAILED' }; }
    });
  };
  handle('status', () => get().status());
  handle('previewImport', async (owner) => {
    if (choosing) throw new LibraryError('LIBRARY_IN_USE');
    choosing = true; pendingImport = null;
    try {
      const source = await choosePath(); if (!source) return null;
      const plan = planImport(source, get().path); pendingImport = { owner, plan }; return plan.preview;
    } finally { choosing = false; }
  });
  handle('confirmImport', (owner, token: string) => {
    if (choosing || !pendingImport || pendingImport.owner !== owner || pendingImport.plan.preview.token !== token || pendingImport.plan.target.path !== get().path) throw new LibraryError('INVALID_INPUT');
    const plan = pendingImport.plan; pendingImport = null; choosing = true;
    try { const result = executeImport(plan); get().reloadImported(); return result; }
    catch (error) { if (existsSync(join(plan.target.path, 'import-transaction.json'))) manager().close(); throw error; }
    finally { choosing = false; }
  });
  handle('settings', (_owner, legacy: unknown) => {
    settings ??= new SettingsStore(dataPath, legacy, selfTest ? () => { if (existsSync(join(dataPath, 'simulate-settings-failure'))) throw new Error('Simulated settings failure'); } : undefined);
    localeChanged(settings.get().global.locale);
    return settings.get();
  });
  handle('updateSettings', (_owner, patch: unknown) => { if (!settings) throw new LibraryError('REGISTRY_INVALID'); const state = settings.update(patch); localeChanged(state.global.locale); return state; });
  handle('librarySettings', (_owner, id: string, value: unknown) => { if (!settings || !manager().has(id)) throw new LibraryError('INVALID_INPUT'); return settings.override(id, value); });
  handle('organization', () => get().organization());
  handle('editOrganization', (_owner, input) => get().editOrganization(input));
  handle('place', (owner, request) => {
    const result = get().place(request, owner);
    if (selfTest && existsSync(join(dataPath, 'simulate-placement-response-loss'))) throw new LibraryError('COMMIT_STATUS_UNKNOWN');
    return result;
  });
  handle('query', (_owner, input) => get().query(input));
  handle('list', () => get().list());
  handle('attachments', (_owner, noteId: string) => get().attachmentList(noteId));
  handle('unlinkAttachment', (owner, request: AttachmentRequest, id: string) => get().unlinkAttachment(request, owner, id));
  handle('renameAttachment', (owner, request: AttachmentRequest, id: string, name: string) => get().renameAttachment(request, owner, id, name));
  handle('previewAttachment', async (_owner, noteId: string, id: string) => {
    const bytes = get().attachmentBytes(noteId, id), mediaType = imageType(bytes);
    if (isSvg(bytes) || /\.svg$/i.test(get().read(noteId).attachments!.find(item => item.id === id)!.name)) {
      const clean = await cleanSvg(bytes);
      return { mediaType: 'image/svg+xml', dataUrl: 'data:image/svg+xml;base64,' + Buffer.from(clean.body).toString('base64'), removedUnsafeSvg: clean.removed };
    }
    if (mediaType.startsWith('image/')) return { mediaType, dataUrl: `data:${mediaType};base64,${bytes.toString('base64')}` };
    if (bytes.length <= 1024 * 1024) {
      try { const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); if (!text.includes('\0')) return { mediaType: 'text/plain', text }; } catch { /* Binary files remain exportable without execution. */ }
    }
    return { mediaType };
  });
  handle('addAttachment', async (owner, request: AttachmentRequest) => {
    const target = window(); if (!target || choosing) throw new LibraryError('LIBRARY_IN_USE');
    choosing = true;
    try {
      let path: string | null;
      if (selfTest) path = await fileDialog();
      else { const result = await dialog.showOpenDialog(target, { properties: ['openFile'] }); path = result.canceled ? null : result.filePaths[0]; }
      if (!path) return null;
      if (!selfTest && JSON.parse(readFileSync(join(get().path, 'library.json'), 'utf8')).schemaVersion < 4) {
        const result = await dialog.showMessageBox(target, { type: 'info', title: 'NotebookAid', message: translate(currentLocale(), 'attachmentUpgrade'), buttons: [translate(currentLocale(), 'cancelOperation'), translate(currentLocale(), 'addAttachment')], defaultId: 0, cancelId: 0 });
        if (result.response !== 1) return null;
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
    try {
      const bytes = get().attachmentBytes(noteId, id), item = get().read(noteId).attachments!.find(row => row.id === id)!;
      let path: string | null | undefined;
      if (selfTest) path = await fileDialog();
      else { const result = await dialog.showSaveDialog(target, { defaultPath: item.name }); path = result.canceled ? null : result.filePath; }
      if (!path) return false;
      exportAttachmentFile(path, bytes, [dataPath, app.isPackaged ? dirname(process.execPath) : app.getAppPath(), ...manager().state().entries.map(entry => entry.path)]);
      return true;
    } finally { choosing = false; }
  });
  handle('create', (_owner, id: string, input?: NoteInput) => get().create(id, input));
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
    const selected = await dialog.showOpenDialog(target, { properties: ['openFile'], filters: [{ name: 'UTF-8 notes', extensions: ['md', 'markdown', 'html', 'htm', 'txt'] }] });
    return selected.canceled ? null : selected.filePaths[0] ?? null;
  };
  handle('importFile', async () => {
    if (choosing) throw new LibraryError('LIBRARY_IN_USE');
    choosing = true;
    try {
      const path = await fileDialog(); if (!path) return null;
      const input = importNote(path);
      if (input.primaryFormat !== 'html') return input;
      const cleaned = await cleanHtmlImport(input.body);
      return { ...input, body: cleaned.body, removed: cleaned.removed };
    }
    finally { choosing = false; }
  });
  handle('exportFile', async (_owner, input: NoteInput) => {
    if (choosing) throw new LibraryError('LIBRARY_IN_USE');
    if (!input || !Object.hasOwn(formatExtensions, input.primaryFormat) || typeof input.body !== 'string' || Buffer.byteLength(input.body) > 2 * 1024 * 1024) throw new LibraryError('INVALID_INPUT');
    choosing = true;
    try {
      const path = await fileDialog(input); if (!path) return false;
      exportNote(path, input, [dataPath, app.isPackaged ? dirname(process.execPath) : app.getAppPath(), ...manager().state().entries.map(entry => entry.path)]);
      return true;
    } finally { choosing = false; }
  });
  handle('begin', (owner, id: string) => get().begin(id, owner));
  handle('end', (owner, token: string, generation: string) => get().end(token, generation, owner));
  handle('save', (owner, request: SaveRequest) => get().save(request, owner));
  handle('rebuild', () => get().rebuild());
  handle('registry', () => manager().state());
  handle('activate', (_owner, id: string) => { if (choosing) throw new LibraryError('LIBRARY_IN_USE'); return manager().activate(id); });
  handle('register', (_owner, mode: 'existing' | 'create') => {
    if (mode !== 'existing' && mode !== 'create') throw new LibraryError('INVALID_INPUT');
    return chooseFor(path => manager().add(path, mode));
  });
  handle('rename', (_owner, id: string, name: string) => manager().rename(id, name));
  handle('remove', (_owner, id: string) => manager().remove(id));
  handle('relocate', (_owner, id: string) => chooseFor(path => manager().relocate(id, path)));
  return {
    locale: currentLocale,
    release: (owner: string) => { if (pendingImport?.owner === owner) pendingImport = null; registry?.release(owner); },
    close: () => { registry?.close(); registry = null; },
    flush: async (): Promise<boolean> => {
      const target = window(); if (!target || target.webContents.isDestroyed()) return true;
      const saved = await new Promise<boolean>(resolveSaved => {
        const listener = (event: Electron.IpcMainEvent, value: unknown) => {
          if (event.sender !== target.webContents || event.senderFrame !== target.webContents.mainFrame) return;
          clearTimeout(timer); ipcMain.removeListener('library:exit-result', listener); resolveSaved(value === true);
        };
        const timer = setTimeout(() => { ipcMain.removeListener('library:exit-result', listener); resolveSaved(false); }, 15000);
        ipcMain.on('library:exit-result', listener); target.webContents.send('library:flush-exit');
      });
      if (saved) return true;
      const result = await dialog.showMessageBox(target, { type: 'warning', title: 'NotebookAid', message: translate(currentLocale(), 'unsavedExit'), buttons: [translate(currentLocale(), 'keepEditing'), translate(currentLocale(), 'discardExit')], defaultId: 0, cancelId: 0, noLink: true });
      return result.response === 1;
    }
  };
}
