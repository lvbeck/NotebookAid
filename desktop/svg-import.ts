import { BrowserWindow } from 'electron';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sanitizeSvg } from '../core/svg-safety';

export async function cleanSvg(bytes: Buffer): Promise<{ body: string; removed: number }> {
  if (bytes.length > 1024 * 1024) throw new Error('SVG exceeds 1 MB');
  const input = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const window = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, partition: 'svg-import', backgroundThrottling: false } });
  window.webContents.session.webRequest.onBeforeRequest((_details, callback) => callback({ cancel: true }));
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const work = async () => {
      await window.loadURL('about:blank');
      await window.webContents.executeJavaScript(readFileSync(join(__dirname, 'purify.js'), 'utf8'));
      return window.webContents.executeJavaScript(`(${sanitizeSvg.toString()})(${JSON.stringify(input)}, DOMPurify, document)`);
    };
    return await Promise.race([work(), new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error('SVG import timeout')), 10000); })]);
  } finally { if (timer) clearTimeout(timer); window.destroy(); }
}
