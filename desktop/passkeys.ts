import { app, BrowserWindow } from 'electron';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { AppPasskeys } from '../core/app-passkeys';

export function passkeyClient(directory: string) {
  const gate = new AppPasskeys(directory); let busy = false;
  const executable = app.isPackaged ? join(dirname(process.execPath), 'NotebookAid.Passkey.exe') : join(app.getAppPath(), 'dist', 'NotebookAid.Passkey.exe');
  const run = (input: object, signal?: AbortSignal): Promise<any> => new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(Error('PASSKEY_CANCELLED')); return; }
    const child = spawn(executable, [], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '', failed = false;
    const timer = setTimeout(() => { failed = true; child.kill(); reject(Error('PASSKEY_TIMEOUT')); }, 135000);
    const abort = () => { failed = true; clearTimeout(timer); child.kill(); reject(Error('PASSKEY_CANCELLED')); };
    signal?.addEventListener('abort', abort, { once: true });
    child.once('error', () => { clearTimeout(timer); failed = true; reject(Error('PASSKEY_UNAVAILABLE')); });
    child.stdout.on('data', bytes => { output += bytes.toString(); if (output.length > 128 * 1024) { failed = true; child.kill(); clearTimeout(timer); reject(Error('PASSKEY_FAILED')); } });
    child.stderr.resume();
    child.once('close', () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); if (failed) return; try { const value = JSON.parse(output); if (value.error) { reject(Error(value.error === 'UNSUPPORTED' ? 'PASSKEY_UNAVAILABLE' : 'PASSKEY_CANCELLED_OR_FAILED')); return; } resolve(value); } catch { reject(Error('PASSKEY_CANCELLED_OR_FAILED')); } });
    child.stdin.on('error', () => {}); child.stdin.end(JSON.stringify(input) + '\n');
  });
  let supported: boolean | undefined;
  const action = async (action: 'enable' | 'unlock' | 'disable', window: BrowserWindow, signal?: AbortSignal): Promise<void> => {
      if (process.platform !== 'win32') throw Error('PASSKEY_UNAVAILABLE');
      if (busy) throw Error('PASSKEY_BUSY'); busy = true;
      const abort = () => gate.lock();
      signal?.addEventListener('abort', abort, { once: true });
      try {
        const authenticate = async (mode: 'create' | 'get') => {
          const input = gate.begin(mode), handle = window.getNativeWindowHandle();
          const response = await run({ action: mode, ...input, window: handle.readBigUInt64LE().toString() }, signal);
          if (window.isDestroyed()) throw Error('PASSKEY_CANCELLED');
          if (signal?.aborted) throw Error('PASSKEY_CANCELLED');
          await gate.finish(response);
        };
        if (action === 'enable') { if (!gate.unlocked) throw Error('APP_LOCKED'); if (gate.enabled) await authenticate('get'); await authenticate('create'); }
        else { await authenticate('get'); if (action === 'disable') gate.disable(); }
      } finally { signal?.removeEventListener('abort', abort); gate.cancel(); busy = false; }
  };
  return {
    gate, action,
    async supported(): Promise<boolean> { if (process.platform !== 'win32') return false; if (supported === undefined) { try { supported = (await run({ action: 'probe' })).supported === true; } catch { supported = false; } } return supported; },
    async unlockBackground(signal: AbortSignal): Promise<void> {
      if (gate.unlocked) return;
      if (process.platform !== 'win32' || !gate.enabled) throw Error('PASSKEY_UNAVAILABLE');
      if (signal.aborted) throw Error('PASSKEY_CANCELLED');
      if (busy) throw Error('PASSKEY_BUSY');
      const owner = new BrowserWindow({ show: false, width: 1, height: 1, skipTaskbar: true, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } });
      try { await action('unlock', owner, signal); }
      catch (error) { gate.lock(); throw error; }
      finally { if (!owner.isDestroyed()) owner.destroy(); }
    }
  };
}
