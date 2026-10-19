import { formulaHtml } from '../shared/math-render';
import { mathPrintStyles } from './math-print-assets';
import { app, BrowserWindow } from 'electron';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { LibraryError } from '../core/library';
import { printDocument } from '../shared/print-document';
import { cleanHtmlImport } from './html-import';

async function printWindows(parent: BrowserWindow, document: Buffer): Promise<boolean> {
  if (document.length > 128 * 1024 * 1024) throw new LibraryError('INVALID_INPUT');
  const executable = app.isPackaged ? join(dirname(process.execPath), 'NotebookAid.Print.exe') : join(app.getAppPath(), 'dist/NotebookAid.Print.exe');
  const handle = parent.getNativeWindowHandle();
  const owner = (handle.length === 8 ? handle.readBigUInt64LE() : BigInt(handle.readUInt32LE())).toString(16);
  parent.setEnabled(false);
  try {
    return await new Promise<boolean>((resolve, reject) => {
      const child = spawn(executable, [owner], { windowsHide: true, stdio: ['pipe', 'ignore', 'ignore'] });
      const closed = () => child.kill();
      parent.once('closed', closed);
      child.once('error', () => reject(new LibraryError('WRITE_FAILED')));
      child.once('close', code => {
        parent.removeListener('closed', closed);
        if (code === 0) resolve(true);
        else if (code === 2) resolve(false);
        else reject(new LibraryError('WRITE_FAILED'));
      });
      child.stdin.on('error', () => { /* The exit status handles broken pipes without logging document content. */ });
      child.stdin.end(document);
    });
  } finally {
    document.fill(0);
    if (!parent.isDestroyed()) { parent.setEnabled(true); parent.focus(); }
  }
}

export async function renderNotePrint(parent: BrowserWindow, title: string, html: string, pdf: boolean, simulatedPrint = false): Promise<Buffer | boolean> {
  const clean = await cleanHtmlImport(html);
  const page = new BrowserWindow({ show: false, parent, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, partition: 'note-print-' + randomUUID(), backgroundThrottling: false } });
  page.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  page.webContents.on('will-navigate', event => event.preventDefault());
  page.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  page.webContents.session.webRequest.onBeforeRequest((request, callback) => callback({ cancel: !request.url.startsWith('data:image/') && !request.url.startsWith('data:font/woff2;') }));
  try {
    await page.loadURL('about:blank');
    const content = await page.webContents.executeJavaScript(`(()=>{const p=new DOMParser().parseFromString(${JSON.stringify(clean.body)},'text/html');return Array.from(p.head.querySelectorAll('style')).map(e=>e.outerHTML).join('')+p.body.innerHTML})()`);
    let document = printDocument(title, content);
    const hasMath = /data-note-math=/.test(content);
    if (hasMath) document = document.replace("font-src 'none'", 'font-src data:').replace('</head>', '<style>' + mathPrintStyles() + '</style></head>');
    await page.webContents.executeJavaScript(`document.open();document.write(${JSON.stringify(document)});document.close();`);
    if (hasMath) {
      const sources: string[] = await page.webContents.executeJavaScript("Array.from(document.querySelectorAll('[data-note-math]')).map(node=>node.getAttribute('data-note-math'))");
      const formulas = sources.map((source, index) => { try { return {source, html:index < 1000 ? formulaHtml(source) : null}; } catch { return {source, html:null}; } });
      await page.webContents.executeJavaScript(`(()=>{const values=${JSON.stringify(formulas)};document.querySelectorAll('[data-note-math]').forEach((node,index)=>{const value=values[index];if(value.html)node.innerHTML=value.html;else node.textContent=value.source;});})()`);
    }
    await page.webContents.executeJavaScript('Promise.race([Promise.all([document.fonts.ready,...Array.from(document.images).map(i=>i.decode().catch(()=>{}))]),new Promise(resolve=>setTimeout(resolve,5000))])');
    if (pdf) return await page.webContents.printToPDF({ pageSize: 'A4', printBackground: true, displayHeaderFooter: false, preferCSSPageSize: true });
    if (simulatedPrint) return true;
    if (process.platform === 'win32') return await printWindows(parent, await page.webContents.printToPDF({ pageSize: 'A4', printBackground: true, displayHeaderFooter: false, preferCSSPageSize: true }));
    return await new Promise<boolean>((resolve, reject) => page.webContents.print({ silent: false, printBackground: true }, (success, reason) => {
      if (success) resolve(true);
      else if (/cancel/i.test(reason)) resolve(false);
      else reject(new LibraryError('WRITE_FAILED'));
    }));
  } finally { page.destroy(); }
}
