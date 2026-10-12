import { ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from 'electron';
import { randomUUID } from 'node:crypto';
import type { AppDialog, DialogAnswer } from '../shared/dialog';

/** Keep confirmation and the protected operation in the main process. */
export function registerDialogs(authorize: (event: IpcMainInvokeEvent) => void) {
  let pending: { id: string; target: BrowserWindow; allowDiscard: boolean; allowTray: boolean; finish: (accepted: DialogAnswer) => void } | null = null;
  ipcMain.handle('app-dialog:respond', (event, id: unknown, accepted: unknown) => {
    authorize(event);
    if (typeof id !== 'string' || (typeof accepted !== 'boolean' && !(accepted === 'discard' && pending?.allowDiscard) && !(accepted === 'tray' && pending?.allowTray))) return;
    if (pending?.id === id && event.sender === pending.target.webContents) pending.finish(accepted);
  });
  const choose = (target: BrowserWindow, data: Omit<AppDialog, 'id'>): Promise<DialogAnswer> => {
      if (pending || target.isDestroyed() || target.webContents.isDestroyed() || target.webContents.isLoadingMainFrame()) return Promise.resolve(false);
      return new Promise(resolve => {
        const id = randomUUID(), contents = target.webContents;
        const cancel = () => finish(false);
        const navigation = (_event: unknown, _url: string, _inPlace: boolean, main: boolean) => { if (main) cancel(); };
        const timer = setTimeout(cancel, 10 * 60 * 1000);
        const finish = (accepted: DialogAnswer) => {
          if (pending?.id !== id) return;
          pending = null; clearTimeout(timer);
          target.removeListener('closed', cancel); target.removeListener('hide', cancel);
          contents.removeListener('render-process-gone', cancel); contents.removeListener('did-start-navigation', navigation);
          if (!contents.isDestroyed()) contents.send('app-dialog:dismiss', id);
          resolve(accepted);
        };
        pending = { id, target, finish, allowDiscard: !!data.discardLabel, allowTray: !!data.trayLabel };
        target.once('closed', cancel); target.once('hide', cancel);
        contents.once('render-process-gone', cancel); contents.on('did-start-navigation', navigation);
        if (target.isMinimized()) target.restore();
        target.show(); target.focus();
        contents.send('app-dialog:request', { ...data, id } satisfies AppDialog);
      });
  };
  return { cancel: () => pending?.finish(false), choose, ask: async (target: BrowserWindow, data: Omit<AppDialog, 'id'>): Promise<boolean> => (await choose(target, data)) === true };
}
