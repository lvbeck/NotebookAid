import { app, dialog, ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from 'electron';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { LibraryError } from '../core/library';
import { LibraryRegistry } from '../core/registry';
import { SettingsStore } from '../core/settings';
import { formatExtensions, type NoteInput, type Result, type SaveRequest } from '../shared/library';
import { importNote, exportNote } from '../core/note-files';
import { cleanHtmlImport } from './html-import';

export function registerLibrary(dataPath: string, window: () => BrowserWindow | null, authorize: (event: IpcMainInvokeEvent) => void, selfTest = false) {
  let registry: LibraryRegistry | null = null;
  let settings: SettingsStore | null = null;
  let choosing = false;
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
  handle('settings', (_owner, legacy: unknown) => {
    settings ??= new SettingsStore(dataPath, legacy, selfTest ? () => { if (existsSync(join(dataPath, 'simulate-settings-failure'))) throw new Error('Simulated settings failure'); } : undefined);
    return settings.get();
  });
  handle('updateSettings', (_owner, patch: unknown) => { if (!settings) throw new LibraryError('REGISTRY_INVALID'); return settings.update(patch); });
  handle('librarySettings', (_owner, id: string, value: unknown) => { if (!settings || !manager().has(id)) throw new LibraryError('INVALID_INPUT'); return settings.override(id, value); });
  handle('list', () => get().list());
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
    release: (owner: string) => registry?.release(owner),
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
      const result = await dialog.showMessageBox(target, { type: 'warning', title: 'NotebookAid', message: '笔记尚未保存。保留窗口以重试，或放弃未保存编辑并退出。\nUnsaved changes remain. Keep editing to retry, or discard and exit.', buttons: ['保留窗口 / Keep editing', '放弃并退出 / Discard and exit'], defaultId: 0, cancelId: 0, noLink: true });
      return result.response === 1;
    }
  };
}
