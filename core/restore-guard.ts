import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
function canonical(directory: string): string { const path = resolve(directory); return existsSync(path) ? realpathSync(path) : existsSync(dirname(path)) ? join(realpathSync(dirname(path)), basename(path)) : path; }
export function restoreGuardPath(directory: string): string { const path = canonical(directory); return join(dirname(path), '.notebookaid-restore-' + createHash('sha256').update(path.toLowerCase()).digest('hex').slice(0, 24) + '.json'); }
export function restoreAllowed(directory: string, token?: string): boolean {
  const file = restoreGuardPath(directory);
  try {
    const info = lstatSync(file);
    if (!info.isFile() || info.isSymbolicLink() || info.size > 8192 || !token) return false;
    const value = JSON.parse(readFileSync(file, 'utf8')); return value.token === token && resolve(value.target).toLowerCase() === canonical(directory).toLowerCase();
  } catch (error) { return !existsSync(file) && (error as NodeJS.ErrnoException).code === 'ENOENT'; }
}
