import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { NotificationInputError, NotificationStore } from '../core/notifications';
import type { NotificationResult } from '../shared/notifications';

export function registerNotifications(dataPath: string, authorize: (event: IpcMainInvokeEvent) => void, selfTest = false) {
  let store: NotificationStore | undefined;
  const handle = (name: string, action: (value: unknown) => unknown) => {
    ipcMain.handle(`notifications:${name}`, (event, value): NotificationResult<unknown> => {
      authorize(event);
      try {
        if (selfTest && existsSync(join(dataPath, 'simulate-notification-failure'))) throw new Error('Simulated notification failure');
        store ??= new NotificationStore(join(dataPath, 'notifications.sqlite'));
        return { ok: true, value: action(value) };
      } catch (error) { return { ok: false, code: error instanceof NotificationInputError ? 'INVALID_INPUT' : 'NOTIFICATION_STORAGE_UNAVAILABLE' }; }
    });
  };
  handle('state', () => store!.state());
  handle('publish', value => store!.publish(value));
  handle('read', value => store!.read(value));
  handle('remove', value => store!.remove(value));
  handle('clear', () => store!.clear());
  handle('position', value => store!.position(value));
  return { close: () => store?.close() };
}
