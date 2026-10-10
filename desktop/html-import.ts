import { BrowserWindow } from 'electron';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sanitizeImportedHtml } from '../core/html-safety';

/** Never parse imported markup in the privileged main process or application DOM. */
export async function cleanHtmlImport(body: string): Promise<{ body: string; removed: number }> {
  const window = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, partition: 'html-import', backgroundThrottling: false } });
  window.webContents.session.webRequest.onBeforeRequest((_details, callback) => callback({ cancel: true }));
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const work = async () => {
      await window.loadURL('about:blank');
      await window.webContents.executeJavaScript(readFileSync(join(__dirname, 'purify.js'), 'utf8'));
      return window.webContents.executeJavaScript(`(${sanitizeImportedHtml.toString()})(${JSON.stringify(body)}, DOMPurify, document)`);
    };
    return await Promise.race([work(), new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error('HTML import timeout')), 10000); })]);
  } finally { if (timer) clearTimeout(timer); window.destroy(); }
}
