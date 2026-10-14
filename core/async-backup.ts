import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, lstat, mkdir, open, readdir, rename, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathsOverlap } from './backups';
import { LibraryError } from './library';
import { plainPath } from './library-import';
import { inspectLibrary } from './registry';
import type { BackupProgress, BackupResult } from '../shared/backup';

type Progress = (value: BackupProgress) => void;
interface Record { path: string; bytes: number; sha256: string; }
async function files(root: string): Promise<string[]> {
  const rows: string[] = [];
  const visit = async (directory: string, prefix: string) => {
    plainPath(directory);
    for (const name of await readdir(directory)) {
      if (!prefix && (name === 'index' || name.startsWith('.writer.sqlite'))) continue;
      const file = join(directory, name), local = prefix ? prefix + '/' + name : name;
      plainPath(file); const stat = await lstat(file);
      if (stat.isDirectory()) await visit(file, local);
      else if (stat.isFile()) rows.push(local);
      else throw new LibraryError('INTEGRITY_CHECK_FAILED');
      if (rows.length > 100000) throw new LibraryError('INTEGRITY_CHECK_FAILED');
    }
  };
  await visit(root, ''); return rows.sort();
}
async function hash(file: string, chunk: (bytes: number) => void): Promise<string> {
  plainPath(file); const digest = createHash('sha256');
  for await (const value of createReadStream(file, { highWaterMark: 1024 * 1024 })) {
    digest.update(value); chunk(value.length); value.fill(0);
  }
  return digest.digest('hex');
}

export async function createBackupAsync(source: string, directory: string, progress: Progress): Promise<BackupResult> {
  plainPath(source); plainPath(directory);
  if (pathsOverlap(source, directory)) throw new LibraryError('PATH_OVERLAP');
  const library = inspectLibrary(source);
  progress({ phase: 'scanning', completed: 0, total: null });
  const names = await files(source), rows: Record[] = []; let bytes = 0;
  for (const name of names) { const size = (await lstat(join(source, name))).size; rows.push({ path: name, bytes: size, sha256: '' }); bytes += size; }
  let completed = 0;
  progress({ phase: 'hashing', completed, total: bytes });
  for (const row of rows) row.sha256 = await hash(join(source, row.path), size => { completed += size; progress({ phase: 'hashing', completed, total: bytes }); });
  const createdAt = new Date().toISOString(), path = join(directory, createdAt.replace(/[:.]/g, '-') + '-' + randomUUID() + '.nabackup'), root = join(path, 'notebook');
  await mkdir(root, { recursive: true }); completed = 0;
  progress({ phase: 'copying', completed, total: bytes });
  for (const row of rows) {
    const input = join(source, row.path), output = join(root, row.path); plainPath(input); plainPath(output);
    await mkdir(dirname(output), { recursive: true }); await copyFile(input, output);
    const file = await open(output, 'r+'); try { await file.sync(); } finally { await file.close(); }
    completed += row.bytes; progress({ phase: 'copying', completed, total: bytes });
  }
  completed = 0; progress({ phase: 'verifying', completed, total: bytes });
  for (const row of rows) {
    const output = join(root, row.path);
    if ((await lstat(output)).size !== row.bytes || await hash(output, size => { completed += size; progress({ phase: 'verifying', completed, total: bytes }); }) !== row.sha256) throw new LibraryError('INTEGRITY_CHECK_FAILED');
  }
  const actual = await files(root);
  if (actual.length !== names.length || actual.some((name, index) => name !== names[index]) || inspectLibrary(root).libraryId !== library.libraryId) throw new LibraryError('INTEGRITY_CHECK_FAILED');
  const manifest = join(path, 'backup.json'), pending = manifest + '.pending-' + randomUUID(); plainPath(manifest);
  const file = await open(pending, 'wx');
  try { await file.writeFile(JSON.stringify({ format: 'NotebookAidBackup', version: 1, libraryId: library.libraryId, createdAt, files: rows })); await file.sync(); }
  finally { await file.close(); }
  try { await rename(pending, manifest); } finally { await unlink(pending).catch(() => {}); }
  progress({ phase: 'complete', completed: bytes, total: bytes });
  return { path, files: rows.length, bytes, libraryId: library.libraryId, createdAt };
}
