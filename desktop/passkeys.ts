import { app, type BrowserWindow } from 'electron';
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { AppPasskeys } from '../core/app-passkeys';

export function passkeyClient(directory: string) {
  const gate = new AppPasskeys(directory); let busy = false;
  const executable = app.isPackaged ? join(dirname(process.execPath), 'NotebookAid.Passkey.exe') : join(app.getAppPath(), 'dist', 'NotebookAid.Passkey.exe');
  const run = (input: object): Promise<any> => new Promise((resolve, reject) => {
    const child = spawn(executable, [], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '', failed = false;
    const timer = setTimeout(() => { failed = true; child.kill(); reject(Error('PASSKEY_TIMEOUT')); }, 135000);
    child.once('error', () => { clearTimeout(timer); failed = true; reject(Error('PASSKEY_UNAVAILABLE')); });
    child.stdout.on('data', bytes => { output += bytes.toString(); if (output.length > 128 * 1024) { failed = true; child.kill(); clearTimeout(timer); reject(Error('PASSKEY_FAILED')); } });
    child.stderr.resume();
    child.once('close', () => { clearTimeout(timer); if (failed) return; try { const value = JSON.parse(output); if (value.error) throw Error(value.error); resolve(value); } catch { reject(Error('PASSKEY_CANCELLED_OR_FAILED')); } });
    child.stdin.on('error', () => {}); child.stdin.end(JSON.stringify(input) + '\n');
  });
  let supported: boolean | undefined;
  return {
    gate,
    async supported(): Promise<boolean> { if (process.platform !== 'win32') return false; if (supported === undefined) { try { supported = (await run({ action: 'probe' })).supported === true; } catch { supported = false; } } return supported; },
    async action(action: 'enable' | 'unlock' | 'disable', window: BrowserWindow): Promise<void> {
      if (process.platform !== 'win32') throw Error('PASSKEY_UNAVAILABLE');
      if (busy) throw Error('PASSKEY_BUSY'); busy = true;
      try {
        const authenticate = async (mode: 'create' | 'get') => {
          const input = gate.begin(mode), handle = window.getNativeWindowHandle();
          const response = await run({ action: mode, ...input, window: handle.readBigUInt64LE().toString() });
          if (window.isDestroyed()) throw Error('PASSKEY_CANCELLED');
          await gate.finish(response);
        };
        if (action === 'enable') { if (!gate.unlocked) throw Error('APP_LOCKED'); if (gate.enabled) await authenticate('get'); await authenticate('create'); }
        else { await authenticate('get'); if (action === 'disable') gate.disable(); }
      } finally { gate.cancel(); busy = false; }
    }
  };
}
