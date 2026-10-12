import { createHash, randomUUID } from 'node:crypto';
import { closeSync, copyFileSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { LibraryError } from './library';
import { plainPath } from './library-import';
import { inspectLibrary } from './registry';
import type { BackupPolicy, BackupResult, BackupState } from '../shared/backup';

const fail = (): never => { throw new LibraryError('INTEGRITY_CHECK_FAILED'); };
export function pathsOverlap(a: string, b: string): boolean {
  const inside = (x: string, y: string) => { const r = relative(resolve(x).toLowerCase(), resolve(y).toLowerCase()); return !r || (!r.startsWith('..' + sep) && r !== '..' && !isAbsolute(r)); };
  return inside(a, b) || inside(b, a);
}
interface FileRecord { path: string; bytes: number; sha256: string; }
function files(root: string, prefix = ''): string[] {
  plainPath(root); const result: string[] = [];
  for (const name of readdirSync(root)) {
    if (!prefix && (name === 'index' || name.startsWith('.writer.sqlite'))) continue;
    const path = join(root, name), local = prefix ? prefix + '/' + name : name; plainPath(path);
    const stat = lstatSync(path); if (!stat.isFile() && !stat.isDirectory()) fail();
    result.push(...(stat.isDirectory() ? files(path, local) : [local]));
    if (result.length > 100000) fail();
  }
  return result.sort();
}
function hashFile(path: string): string {
  plainPath(path); const fd = openSync(path, 'r'), buffer = Buffer.alloc(1024 * 1024), hash = createHash('sha256');
  try { let size: number; while ((size = readSync(fd, buffer, 0, buffer.length, null)) > 0) hash.update(buffer.subarray(0, size)); return hash.digest('hex'); }
  finally { buffer.fill(0); closeSync(fd); }
}
function records(root: string): FileRecord[] { return files(root).map(path => ({ path, bytes: statSync(join(root, path)).size, sha256: hashFile(join(root, path)) })); }
function atomic(file: string, value: unknown): void {
  plainPath(file); const temporary = file + '.pending-' + randomUUID(), fd = openSync(temporary, 'wx');
  try { writeFileSync(fd, JSON.stringify(value)); fsyncSync(fd); } finally { closeSync(fd); }
  try { renameSync(temporary, file); } finally { if (existsSync(temporary)) unlinkSync(temporary); }
}
function copyVerified(source: string, target: string, rows: FileRecord[]): void {
  plainPath(source); plainPath(target);
  if (pathsOverlap(source, target)) throw new LibraryError('PATH_OVERLAP');
  if (existsSync(target) && !lstatSync(target).isDirectory()) throw new LibraryError('RESTORE_TARGET_INVALID');
  if (existsSync(target) && readdirSync(target).length) throw new LibraryError('TARGET_NOT_EMPTY');
  mkdirSync(target, { recursive: true });
  for (const row of rows) {
    const output = join(target, row.path); plainPath(output); mkdirSync(dirname(output), { recursive: true }); copyFileSync(join(source, row.path), output);
    const fd = openSync(output, 'r+'); try { fsyncSync(fd); } finally { closeSync(fd); }
    if (statSync(output).size !== row.bytes || hashFile(output) !== row.sha256) fail();
  }
}
export function createBackup(source: string, directory: string): BackupResult {
  plainPath(directory); if (pathsOverlap(source, directory)) throw new LibraryError('INVALID_INPUT');
  const library = inspectLibrary(source), rows = records(source), createdAt = new Date().toISOString();
  const path = join(directory, createdAt.replace(/[:.]/g, '-') + '-' + randomUUID() + '.nabackup');
  copyVerified(source, join(path, 'notebook'), rows);
  const manifest = { format: 'NotebookAidBackup', version: 1, libraryId: library.libraryId, createdAt, files: rows };
  atomic(join(path, 'backup.json'), manifest);
  return verifyBackup(path);
}
export function verifyBackup(path: string): BackupResult {
  try { return inspectBackup(path); } catch (error) { if (error instanceof LibraryError) throw error; return fail(); }
}
function inspectBackup(path: string): BackupResult {
  plainPath(path); const manifest = join(path, 'backup.json'); plainPath(manifest);
  if (statSync(manifest).size > 32 * 1024 * 1024) fail();
  const value = JSON.parse(readFileSync(manifest, 'utf8'));
  if (value?.format !== 'NotebookAidBackup' || value.version !== 1 || !Array.isArray(value.files) || value.files.length > 100000 || !Number.isFinite(Date.parse(value.createdAt))) fail();
  const root = join(path, 'notebook'), actual = files(root), names = new Set<string>(); let bytes = 0;
  for (const row of value.files) {
    if (!row || typeof row.path !== 'string' || !row.path || row.path.length > 1024 || row.path.includes('\\') || row.path.includes(':') || row.path.split('/').some((part: string) => !part || part === '..' || part === '.') || names.has(row.path) || !Number.isSafeInteger(row.bytes) || row.bytes < 0 || !/^[a-f0-9]{64}$/.test(row.sha256)) fail();
    names.add(row.path); const file = join(root, row.path); plainPath(file);
    if (!lstatSync(file).isFile() || statSync(file).size !== row.bytes || hashFile(file) !== row.sha256) fail();
    bytes += row.bytes;
  }
  if (actual.length !== names.size || actual.some(name => !names.has(name)) || inspectLibrary(root).libraryId !== value.libraryId) fail();
  return { path, files: actual.length, bytes, libraryId: value.libraryId, createdAt: value.createdAt };
}
export function restoreBackup(backup: string, target: string, libraryId: string): void {
  if (verifyBackup(backup).libraryId !== libraryId) throw new LibraryError('LIBRARY_ID_MISMATCH');
  const source = join(backup, 'notebook'); copyVerified(source, target, records(source));
}
export function copyNotebook(source: string, target: string): void { copyVerified(source, target, records(source)); }

export class BackupStore {
  private readonly file: string;
  private policies: Record<string, BackupPolicy> = {};
  constructor(directory: string) {
    this.file = join(directory, 'backups.json'); plainPath(this.file);
    if (existsSync(this.file)) {
      if (statSync(this.file).size > 1024 * 1024) fail();
      const value = JSON.parse(readFileSync(this.file, 'utf8'));
      if (value?.version !== 1 || !value.policies || typeof value.policies !== 'object' || Array.isArray(value.policies) || Object.keys(value.policies).length > 1000) fail();
      for (const [id, policy] of Object.entries(value.policies)) { this.validate(id, policy as BackupPolicy); }
      this.policies = value.policies;
    }
  }
  private validate(id: string, p: BackupPolicy): void {
    if (!/^[a-f0-9-]{36}$/i.test(id) || !p || typeof p.enabled !== 'boolean' || (p.directory !== null && (typeof p.directory !== 'string' || !isAbsolute(p.directory))) || (p.enabled && !p.directory) || [p.nextAt, p.lastAt].some(value => value !== null && (!Number.isSafeInteger(value) || value! < 0))) throw new LibraryError('INVALID_INPUT');
  }
  state(now = Date.now()): BackupState { return { policies: structuredClone(this.policies), missed: Object.entries(this.policies).filter(([, p]) => p.enabled && p.nextAt !== null && p.nextAt < now).map(([id]) => id) }; }
  update(id: string, directory: string | null, enabled: boolean): BackupPolicy {
    const old = this.policies[id]; const p = { directory, enabled, lastAt: old?.lastAt ?? null, nextAt: enabled ? old?.enabled && old.directory === directory ? old.nextAt : Date.now() + 86400000 : null };
    this.validate(id, p); this.save(id, p); return p;
  }
  complete(id: string): void { const p = this.policies[id]; if (p) this.save(id, { ...p, lastAt: Date.now(), nextAt: p.enabled ? Date.now() + 86400000 : null }); }
  private save(id: string, p: BackupPolicy): void { const next = { ...this.policies, [id]: p }; atomic(this.file, { version: 1, policies: next }); this.policies = next; }
}
