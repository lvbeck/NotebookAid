import { constants, createReadStream, createWriteStream } from 'node:fs';
import { lstat, mkdir, mkdtemp, readdir, readFile, rename, rm, copyFile, unlink, open } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createBackupAsync } from './async-backup';
import { pathsOverlap } from './backups';
import { inspectLibrary } from './registry';
import { plainPath } from './library-import';
import { NoteLibrary, LibraryError } from './library';
import type { BackupProgress } from '../shared/backup';

// Load ZIP codecs only when the user imports or exports a notebook.
const zipReader = () => require('yauzl') as any;
const zipWriter = () => require('yazl') as any;
const maxFiles = 100002, maxBytes = 32 * 1024 ** 3;
type Progress = (value: BackupProgress) => void;
export const notebookArchiveExtension = '.nabook';
function invalid(): never { throw new LibraryError('INTEGRITY_CHECK_FAILED'); }
function parseJson(text: string): any { try { return JSON.parse(text); } catch { return invalid(); } }
function safeName(name: string): void {
  if (!name || name.length > 1024 || /[\\:\x00-\x1f]/.test(name) || name.startsWith('/') || name.split('/').some(part => !part || part === '.' || part === '..' || /[. ]$/.test(part) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) invalid();
}
async function walk(root: string, prefix = ''): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const name = prefix ? prefix + '/' + entry.name : entry.name; safeName(name);
    if (entry.isSymbolicLink()) invalid();
    if (entry.isDirectory()) result.push(...await walk(root, name));
    else if (entry.isFile()) result.push(name); else invalid();
    if (result.length > maxFiles) invalid();
  }
  return result;
}
export async function exportNotebookArchive(source: string, target: string, progress: Progress): Promise<void> {
  plainPath(source); plainPath(target);
  if (!target.toLowerCase().endsWith(notebookArchiveExtension) || pathsOverlap(source, target)) throw new LibraryError('INVALID_INPUT');
  const parent = dirname(resolve(target)), scratch = await mkdtemp(join(parent, '.notebookaid-export-')), pending = join(parent, '.notebookaid-archive-' + randomUUID());
  try {
    const snapshot = await createBackupAsync(source, scratch, progress);
    await open(pending, 'wx', 0o600).then(file => file.close());
    const zip = new (zipWriter().ZipFile)();
    zip.addBuffer(Buffer.from(JSON.stringify({ format: 'NotebookAidArchive', version: 1, libraryId: snapshot.libraryId })), 'archive.json');
    const names = await walk(snapshot.path); let total = 0;
    for (const name of names) { total += (await lstat(join(snapshot.path, name))).size; if (total > maxBytes) invalid(); zip.addFile(join(snapshot.path, name), name); }
    let completed = 0;
    progress({ phase: 'copying', completed, total: null });
    const meter = new Transform({ transform(chunk, _encoding, callback) { completed += chunk.length; progress({ phase: 'copying', completed, total: null }); callback(null, chunk); } });
    const writing = pipeline(zip.outputStream, meter, createWriteStream(pending, { flags: 'r+' }));
    zip.on('error', (error: Error) => zip.outputStream.destroy(error)); zip.end(); await writing;
    const file = await open(pending, 'r+'); try { await file.sync(); } finally { await file.close(); }
    // Exclusive publication also supports destination filesystems without hard links.
    await copyFile(pending, target, constants.COPYFILE_EXCL); await unlink(pending);
    progress({ phase: 'complete', completed: total, total });
  } finally { await rm(scratch, { recursive: true, force: true }); await unlink(pending).catch(() => {}); }
}
async function extract(source: string, target: string, progress: Progress): Promise<void> {
  plainPath(source); const stat = await lstat(source); if (!stat.isFile() || stat.size > maxBytes) invalid();
  const zip: any = await new Promise((resolveZip, reject) => zipReader().open(source, { lazyEntries: true, autoClose: false, strictFileNames: true, validateEntrySizes: true }, (error: Error, value: unknown) => error ? reject(error) : resolveZip(value)));
  const names = new Set<string>(); let declared = 0, actual = 0, count = 0;
  try {
    await new Promise<void>((done, reject) => {
      zip.on('error', reject); zip.on('end', done);
      zip.on('entry', (entry: any) => {
        void (async () => {
          const name: string = entry.fileName; safeName(name);
          const key = name.normalize('NFC').toLowerCase(), mode = (entry.externalFileAttributes >>> 16) & 0xf000;
          if (++count > maxFiles || names.has(key) || (mode && mode !== 0x8000) || entry.generalPurposeBitFlag & 1 || ![0, 8].includes(entry.compressionMethod) || !Number.isSafeInteger(entry.uncompressedSize) || entry.uncompressedSize < 0 || (declared += entry.uncompressedSize) > maxBytes || !['archive.json', 'backup.json'].includes(name) && !name.startsWith('notebook/')) invalid();
          if (name === 'archive.json' && entry.uncompressedSize > 4096 || name === 'backup.json' && entry.uncompressedSize > 32 * 1024 ** 2) invalid();
          if (key === 'notebook/index' || key.startsWith('notebook/index/') || key.startsWith('notebook/.writer.sqlite')) invalid();
          names.add(key); const output = join(target, name); plainPath(output); await mkdir(dirname(output), { recursive: true });
          const input: NodeJS.ReadableStream = await new Promise((accept, fail) => zip.openReadStream(entry, (error: Error, stream: NodeJS.ReadableStream) => error ? fail(error) : accept(stream)));
          let bytes = 0;
          const meter = new Transform({ transform(chunk, _encoding, callback) { bytes += chunk.length; actual += chunk.length; if (bytes > entry.uncompressedSize || actual > maxBytes) { callback(new LibraryError('INTEGRITY_CHECK_FAILED')); return; } progress({ phase: 'copying', completed: actual, total: null }); callback(null, chunk); } });
          await pipeline(input, meter, createWriteStream(output, { flags: 'wx', mode: 0o600 }));
          if (bytes !== entry.uncompressedSize) invalid(); zip.readEntry();
        })().catch(reject);
      }); zip.readEntry();
    });
    if (!names.has('archive.json') || !names.has('backup.json')) invalid();
  } finally { zip.close(); }
}
async function verifySnapshot(root: string, progress: Progress): Promise<{ libraryId: string; bytes: number }> {
  const manifest = parseJson(await readFile(join(root, 'backup.json'), 'utf8'));
  if (manifest?.format !== 'NotebookAidBackup' || manifest.version !== 1 || !Array.isArray(manifest.files) || manifest.files.length > maxFiles - 2 || !Number.isFinite(Date.parse(manifest.createdAt))) invalid();
  const notebook = join(root, 'notebook'), names = await walk(notebook), seen = new Set<string>(); let bytes = 0;
  for (const record of manifest.files) {
    if (!record || typeof record.path !== 'string' || !Number.isSafeInteger(record.bytes) || record.bytes < 0 || !/^[a-f0-9]{64}$/.test(record.sha256)) invalid();
    safeName(record.path); if (seen.has(record.path)) invalid(); seen.add(record.path);
    const file = join(notebook, record.path); if ((await lstat(file)).size !== record.bytes) invalid();
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(file)) { bytes += chunk.length; hash.update(chunk); chunk.fill(0); progress({ phase: 'verifying', completed: bytes, total: null }); }
    if (hash.digest('hex') !== record.sha256) invalid();
  }
  if (names.length !== seen.size || names.some(name => !seen.has(name)) || inspectLibrary(notebook).libraryId !== manifest.libraryId) invalid();
  return { libraryId: manifest.libraryId, bytes };
}
export async function importNotebookArchive(source: string, parent: string, progress: Progress, checkIdentity: (id: string) => void = () => {}): Promise<{ path: string; libraryId: string }> {
  plainPath(source); plainPath(parent);
  if (!source.toLowerCase().endsWith(notebookArchiveExtension) || !(await lstat(parent)).isDirectory()) throw new LibraryError('INVALID_INPUT');
  const scratch = await mkdtemp(join(parent, '.notebookaid-import-'));
  try {
    await extract(source, scratch, progress);
    if ((await lstat(join(scratch, 'archive.json'))).size > 4096) invalid();
    const descriptor = parseJson(await readFile(join(scratch, 'archive.json'), 'utf8'));
    if (descriptor?.format !== 'NotebookAidArchive' || descriptor.version !== 1) invalid();
    progress({ phase: 'verifying', completed: 0, total: null });
    const backup = await verifySnapshot(scratch, progress); if (backup.libraryId !== descriptor.libraryId) invalid(); checkIdentity(backup.libraryId);
    const library = new NoteLibrary(join(scratch, 'notebook'), undefined, 'existing');
    try { await library.verifyIntegrityAsync(progress); } finally { library.close(); }
    const stem = basename(source).slice(0, -notebookArchiveExtension.length).replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/g, '').slice(0, 60) || 'Notebook';
    const target = join(parent, stem + '-' + randomUUID()); plainPath(target);
    await rename(join(scratch, 'notebook'), target);
    progress({ phase: 'complete', completed: backup.bytes, total: backup.bytes }); return { path: target, libraryId: backup.libraryId };
  } finally { await rm(scratch, { recursive: true, force: true }); }
}
