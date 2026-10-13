import { BrowserWindow, dialog } from 'electron';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { LibraryError } from '../core/library';
import { securityText } from '../src/app/security-i18n';
import type { Locale } from '../src/app/i18n';
import { recoveryDocument, recoveryFileName } from '../shared/recovery-document';

export async function printRecovery(parent: BrowserWindow, mode: unknown, key: unknown, locale: Locale, notebookName: string, testDirectory?: string): Promise<boolean> {
  if ((mode !== 'print' && mode !== 'pdf') || typeof key !== 'string' || !/^NA1-(?:[a-f0-9]{8}-){7}[a-f0-9]{8}$/i.test(key)) throw new LibraryError('INVALID_INPUT');
  let path: string | undefined;
  const fileName = recoveryFileName(notebookName);
  if (mode === 'pdf') {
    if (testDirectory) path = join(testDirectory, fileName);
    else {
      const selected = await dialog.showSaveDialog(parent, { defaultPath: fileName, filters: [{ name: 'PDF', extensions: ['pdf'] }] });
      if (selected.canceled || !selected.filePath) return false;
      path = selected.filePath;
    }
  }
  const page = new BrowserWindow({ show: false, parent, webPreferences: { partition: 'recovery-print-' + randomUUID(), sandbox: true, contextIsolation: true, nodeIntegration: false } });
  page.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  page.webContents.session.webRequest.onBeforeRequest((request, callback) => callback({ cancel: !request.url.startsWith('data:') }));
  try {
    // The document URL contains no credential; the key exists only in the temporary page's memory.
    await page.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(recoveryDocument('', '', '')));
    await page.webContents.executeJavaScript(`document.title=${JSON.stringify(fileName.slice(0, -4))}`);
    await page.webContents.executeJavaScript(`document.querySelector('h1').textContent=${JSON.stringify('NotebookAid · ' + securityText(locale, 'recovery'))};document.querySelector('p').textContent=${JSON.stringify(securityText(locale, 'recoveryHint'))};document.querySelector('pre').textContent=${JSON.stringify(key)};document.fonts.ready`);
    if (mode === 'pdf') {
      const pdf = await page.webContents.printToPDF({ pageSize: 'A4', printBackground: true, displayHeaderFooter: false, preferCSSPageSize: true });
      try { writeFileSync(path!, pdf, { mode: 0o600 }); } finally { pdf.fill(0); }
      return true;
    }
    if (testDirectory) {
      // Self-tests exercise the callback without sending credentials to a real printer.
      page.webContents.print = (_options, callback) => callback?.(true, '');
    }
    return await new Promise<boolean>((resolve, reject) => page.webContents.print({ silent: false, printBackground: true, pageSize: 'A4' }, (success, reason) => {
      if (success) resolve(true);
      else if (/cancel/i.test(reason)) resolve(false);
      else reject(new LibraryError('WRITE_FAILED'));
    }));
  } finally {
    key = '';
    page.destroy();
  }
}
