import { app, safeStorage } from 'electron';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawn } from 'node:child_process';
import type { McpCipher } from '../core/mcp-profile';
const helper = () => app.isPackaged ? join(dirname(process.execPath), 'NotebookAid.McpCrypt.exe') : join(app.getAppPath(), 'dist/NotebookAid.McpCrypt.exe');
function dpapi(action: 'protect' | 'unprotect', value: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(helper(), [], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }); let output = '', finished = false;
    const timer = setTimeout(() => finish(), 10000);
    function finish(result?: string) { if (finished) return; finished = true; clearTimeout(timer); if (result === undefined) { child.kill(); reject(Error('SECURE_STORAGE_UNAVAILABLE')); } else resolve(result); }
    child.once('error', () => finish()); child.stderr.resume(); child.stdin.on('error', () => finish());
    child.stdout.on('data', chunk => { output += chunk.toString(); if (output.length > 32768) finish(); });
    child.once('close', code => { try { const parsed = JSON.parse(output); if (code !== 0 || typeof parsed.value !== 'string') throw Error(); finish(parsed.value); } catch { finish(); } });
    child.stdin.end(JSON.stringify({ action, value }) + '\n');
  });
}
export const mcpCipher: McpCipher = {
  available: async () => process.platform === 'win32' ? existsSync(helper()) : process.platform === 'darwin' && safeStorage.isEncryptionAvailable(),
  encrypt: async value => process.platform === 'win32' ? Buffer.from(await dpapi('protect', value), 'base64') : safeStorage.encryptString(value),
  decrypt: async value => process.platform === 'win32' ? dpapi('unprotect', value.toString('base64')) : safeStorage.decryptString(value)
};
