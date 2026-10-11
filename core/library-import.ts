import { readAttachmentFile, validateAttachments } from './attachments';
import type { Attachment } from '../shared/attachments';
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, mkdirSync, copyFileSync, writeFileSync, openSync, fsyncSync, closeSync, renameSync, unlinkSync, rmSync } from 'node:fs';
import { join, dirname, basename, resolve, relative, sep, isAbsolute } from 'node:path';
import { LibraryError } from './library';
import type { Organization } from '../shared/organization';
import type { LibraryImportPreview, LibraryImportResult } from '../shared/library-import';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const extensions: Record<string, string> = { markdown: 'md', html: 'html', text: 'txt' };
const fail = (code: 'INVALID_INPUT' | 'INTEGRITY_CHECK_FAILED' | 'UNSUPPORTED_LIBRARY' | 'LIBRARY_IN_USE' | 'VERSION_CONFLICT' | 'DUPLICATE_LIBRARY' = 'INTEGRITY_CHECK_FAILED'): never => { throw new LibraryError(code); };
type Revision = { metadata: any; body: string };
type SnapshotNote = { id: string; head: any; revisions: Revision[]; fingerprint: string; blobs: { item: Attachment; path: string }[] };
interface Snapshot { path: string; manifest: any; organization: Organization; notes: SnapshotNote[]; fingerprint: string; }
interface Receipt { source: string; note: string; fingerprint: string; target: string; }
interface Plan { source: Snapshot; target: Snapshot; organization: Organization; notes: SnapshotNote[]; receipts: Receipt[]; preview: LibraryImportPreview; }
const key = (name: string) => name.normalize('NFKC').trim().toLowerCase();
export function plainPath(path: string): void {
  const absolute = resolve(path); let current = absolute;
  while (true) {
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) fail('INVALID_INPUT');
    const parent = dirname(current); if (parent === current) break; current = parent;
  }
}
function read(path: string, limit = 128 * 1024): string {
  plainPath(path); const stat = lstatSync(path);
  if (!stat.isFile() || stat.size > limit) fail();
  const bytes = readFileSync(path);
  try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); } catch { return fail(); }
}
function json(path: string, limit?: number): any { try { return JSON.parse(read(path, limit)); } catch (error) { if (error instanceof LibraryError) throw error; return fail(); } }
function atomic(path: string, value: string): void {
  plainPath(path); const temp = join(dirname(path), `.pending-${randomUUID()}`); const fd = openSync(temp, 'wx');
  try { writeFileSync(fd, value, 'utf8'); fsyncSync(fd); } finally { closeSync(fd); }
  renameSync(temp, path);
}
function structure(value: Organization): void {
  if (!value || value.schemaVersion !== 1 || !Number.isSafeInteger(value.version) || value.version < 0 || !Array.isArray(value.folders) || !Array.isArray(value.tags) || value.folders.length > 500 || value.tags.length > 500 || Buffer.byteLength(JSON.stringify(value)) > 128 * 1024) fail();
  const ids = new Set<string>(), names = new Set<string>();
  for (const item of [...value.folders, ...value.tags]) {
    if (!item || typeof item.id !== 'string' || !uuid.test(item.id) || ids.has(item.id) || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 80 || /[\x00-\x1f]/.test(item.name)) fail(); ids.add(item.id);
  }
  for (const folder of value.folders) {
    if (folder.order !== undefined && (!Number.isSafeInteger(folder.order) || folder.order < 0)) fail();
    const name = `${folder.parentId}/${key(folder.name)}`; if (names.has(name)) fail(); names.add(name);
    let parent = folder.parentId; const seen = new Set([folder.id]);
    while (parent !== null) { const row = value.folders.find(item => item.id === parent); if (!row || seen.has(parent) || seen.size >= 16) fail(); seen.add(parent); parent = row!.parentId; }
  }
  names.clear();
  for (const tag of value.tags) { if (names.has(key(tag.name)) || typeof tag.color !== 'string' || !/^#[a-f0-9]{6}$/i.test(tag.color)) fail(); names.add(key(tag.name)); }
}
function snapshot(path: string): Snapshot {
  plainPath(path); path = realpathSync(path);
  if (existsSync(join(path, 'import-transaction.json'))) fail('LIBRARY_IN_USE');
  const manifest = json(join(path, 'library.json'));
  if (![1, 2, 3, 4].includes(manifest?.schemaVersion)) fail('UNSUPPORTED_LIBRARY');
  if (!uuid.test(manifest.libraryId)) fail();
  // Future storage structures require an explicit importer, never silent omission.
  for (const name of ['attachments', 'security', 'keyring.json']) if (existsSync(join(path, name))) fail('UNSUPPORTED_LIBRARY');
  const organization: Organization = existsSync(join(path, 'organization.json')) ? json(join(path, 'organization.json')) : { schemaVersion: 1, version: 0, folders: [], tags: [] };
  structure(organization);
  const notes: SnapshotNote[] = []; let bytes = 0, revisions = 0;
  plainPath(join(path, 'notes'));
  for (const id of readdirSync(join(path, 'notes')).sort()) {
    if (!uuid.test(id)) fail();
    const root = join(path, 'notes', id); plainPath(root);
    if (!existsSync(join(root, 'head.json'))) fail();
    const head = json(join(root, 'head.json'));
    if (head.formatVersion !== 1 || head.id !== id || !uuid.test(head.revisionId) || !Number.isSafeInteger(head.version) || head.version < 1) fail();
    const blobs = new Map<string, { item: Attachment; path: string }>();
    const chain: Revision[] = []; let revision = head.revisionId, version = head.version; const seen = new Set<string>();
    while (revision !== null) {
      if (!uuid.test(revision) || seen.has(revision) || ++revisions > 10000) fail(); seen.add(revision);
      const directory = join(root, 'revisions', revision); const raw = read(join(directory, 'metadata.json')); const meta = JSON.parse(raw);
      if (version === head.version && hash(raw) !== head.metadataHash) fail();
      if (meta.schemaVersion !== 1 || meta.id !== id || meta.revisionId !== revision || meta.version !== version || !Object.hasOwn(extensions, meta.primaryFormat) || !uuid.test(meta.operationId) || !/^[a-f0-9]{64}$/.test(meta.requestHash)) fail();
      if (typeof meta.title !== 'string' || !meta.title.trim() || meta.title.length > 300 || meta.title.includes('\0') || !Number.isSafeInteger(meta.contentVersion) || meta.contentVersion < 1 || meta.contentVersion > meta.version || !Number.isFinite(Date.parse(meta.createdAt)) || !Number.isFinite(Date.parse(meta.updatedAt)) || (meta.deletedAt !== null && !Number.isFinite(Date.parse(meta.deletedAt)))) fail();
      if ((meta.folderId !== null && !organization.folders.some(item => item.id === meta.folderId)) || !Array.isArray(meta.tagIds) || meta.tagIds.length > 100 || new Set(meta.tagIds).size !== meta.tagIds.length || meta.tagIds.some((tag: string) => !organization.tags.some(item => item.id === tag)) || typeof meta.pinned !== 'boolean' || meta.visibleInThunderbird !== true) fail('UNSUPPORTED_LIBRARY');
      const body = read(join(directory, `content.${extensions[meta.primaryFormat]}`), 2 * 1024 * 1024);
      if (hash(body) !== meta.bodyHash || body.includes('\0')) fail();
      bytes += Buffer.byteLength(raw) + Buffer.byteLength(body); if (bytes > 256 * 1024 * 1024) fail('INVALID_INPUT');
      if (meta.attachments !== undefined) {
        validateAttachments(meta.attachments);
        if (manifest.schemaVersion < 4) fail();
        for (const item of meta.attachments as Attachment[]) {
          const existing = blobs.get(item.id);
          if (existing && (existing.item.sha256 !== item.sha256 || existing.item.size !== item.size)) fail();
          const path = join(root, 'attachments', item.id);
          if (!existing) { bytes += item.size; if (bytes > 256 * 1024 * 1024) fail('INVALID_INPUT'); readAttachmentFile(path, item); blobs.set(item.id, { item, path }); }
        }
      }
      chain.push({ metadata: meta, body }); revision = meta.parentRevisionId; version--;
    }
    if (version !== 0) fail();
    notes.push({ id, head, revisions: chain, fingerprint: hash(JSON.stringify(chain)), blobs: [...blobs.values()] });
  }
  return { path, manifest, organization, notes, fingerprint: hash(JSON.stringify({ manifest, organization, notes })) };
}
function sourceLock(path: string): DatabaseSync {
  const file = join(path, '.writer.sqlite'); plainPath(file);
  if (!existsSync(file)) fail('UNSUPPORTED_LIBRARY');
  let db: DatabaseSync | undefined;
  try { db = new DatabaseSync(file, { readOnly: true }); db.exec('PRAGMA busy_timeout=0; BEGIN'); db.prepare('SELECT * FROM writer').all(); return db; }
  catch { db?.close(); return fail('LIBRARY_IN_USE'); }
}
function receiptFile(path: string): Receipt[] {
  const file = join(path, 'imports.json'); if (!existsSync(file)) return [];
  const value = json(file, 4 * 1024 * 1024);
  if (!Array.isArray(value) || value.length > 10000 || value.some(row => !row || !uuid.test(row.source) || !uuid.test(row.note) || !uuid.test(row.target) || !/^[a-f0-9]{64}$/.test(row.fingerprint))) fail();
  return value;
}
function overlaps(a: string, b: string): boolean { const r = relative(a.toLowerCase(), b.toLowerCase()); return !r || (!r.startsWith(`..${sep}`) && r !== '..' && !isAbsolute(r)); }
export function planImport(sourcePath: string, targetPath: string): Plan {
  plainPath(sourcePath); plainPath(targetPath);
  sourcePath = realpathSync(sourcePath); targetPath = realpathSync(targetPath);
  if (overlaps(sourcePath, targetPath) || overlaps(targetPath, sourcePath)) fail('INVALID_INPUT');
  const lock = sourceLock(sourcePath);
  try {
    const source = snapshot(sourcePath), target = snapshot(targetPath);
    if (source.manifest.libraryId === target.manifest.libraryId) fail('DUPLICATE_LIBRARY');
    const receipts = receiptFile(target.path); const organization = structuredClone(target.organization);
    const folderMap = new Map<string, string>(), tagMap = new Map<string, string>();
    const used = new Set([...organization.folders, ...organization.tags].map(item => item.id));
    const mappedId = (id: string) => { const result = used.has(id) ? randomUUID() : id; used.add(result); return result; };
    const mapFolder = (id: string): string => {
      if (folderMap.has(id)) return folderMap.get(id)!;
      const row = source.organization.folders.find(item => item.id === id)!;
      const parentId = row.parentId === null ? null : mapFolder(row.parentId);
      const match = organization.folders.find(item => item.parentId === parentId && key(item.name) === key(row.name));
      const result = match?.id ?? mappedId(id); if (!match) organization.folders.push({ ...row, id: result, parentId }); folderMap.set(id, result); return result;
    };
    for (const folder of source.organization.folders) mapFolder(folder.id);
    for (const tag of source.organization.tags) {
      let name = tag.name, suffix = 2;
      let match = organization.tags.find(item => key(item.name) === key(name));
      while (match && match.color.toLowerCase() !== tag.color.toLowerCase()) { name = `${tag.name.slice(0, 68)} (${suffix++})`; match = organization.tags.find(item => key(item.name) === key(name)); }
      const id = match?.id ?? mappedId(tag.id); if (!match) organization.tags.push({ ...tag, id, name }); tagMap.set(tag.id, id);
    }
    organization.version++; structure(organization);
    let skipped = 0, conflicts = 0; const notes: SnapshotNote[] = []; const ids = new Set(target.notes.map(note => note.id));
    for (const note of source.notes) {
      if (receipts.some(row => row.source === source.manifest.libraryId && row.note === note.id && row.fingerprint === note.fingerprint && ids.has(row.target))) { skipped++; continue; }
      const id = ids.has(note.id) ? randomUUID() : note.id; if (id !== note.id) conflicts++; ids.add(id);
      const revisions = note.revisions.map(row => ({ body: row.body, metadata: { ...row.metadata, id, folderId: row.metadata.folderId === null ? null : folderMap.get(row.metadata.folderId), tagIds: row.metadata.tagIds.map((tag: string) => tagMap.get(tag)) } }));
      const head = { ...note.head, id, metadataHash: hash(JSON.stringify(revisions[0].metadata)) };
      notes.push({ ...note, id, head, revisions }); receipts.push({ source: source.manifest.libraryId, note: note.id, fingerprint: note.fingerprint, target: id });
    }
    if (receipts.length > 10000 || Buffer.byteLength(JSON.stringify(receipts)) > 4 * 1024 * 1024) fail('INVALID_INPUT');
    return { source, target, organization, notes, receipts, preview: { token: randomUUID(), sourcePath, targetPath, sourceVersion: source.manifest.schemaVersion, targetVersion: target.manifest.schemaVersion, notes: notes.length, revisions: notes.reduce((sum, note) => sum + note.revisions.length, 0), folders: organization.folders.length - target.organization.folders.length, tags: organization.tags.length - target.organization.tags.length, skipped, conflicts, deleted: notes.filter(note => note.revisions[0].metadata.deletedAt !== null).length } };
  } finally { lock.close(); }
}
export function copyTree(source: string, target: string): void {
  plainPath(source); plainPath(target); const info = lstatSync(source);
  if (info.isDirectory()) { mkdirSync(target, { recursive: true }); for (const name of readdirSync(source)) { if (name === '.writer.sqlite' || name.startsWith('.writer.sqlite-')) continue; copyTree(join(source, name), join(target, name)); } }
  else if (info.isFile()) { copyFileSync(source, target, 1); const fd = openSync(target, 'r+'); try { fsyncSync(fd); } finally { closeSync(fd); } if (hash(readFileSync(source)) !== hash(readFileSync(target))) fail(); }
  else fail('INVALID_INPUT');
}
interface Transaction { id: string; notes: string[]; originals: Record<string, string | null>; rolledBack?: boolean; }
const changedFiles = ['library.json', 'organization.json', 'imports.json'];
export function recoverImport(path: string): boolean {
  const file = join(path, 'import-transaction.json'); if (!existsSync(file)) return false;
  const transaction = json(file, 8 * 1024 * 1024) as Transaction;
  if (!transaction || !uuid.test(transaction.id) || !Array.isArray(transaction.notes) || transaction.notes.length > 10000 || transaction.notes.some(id => !uuid.test(id)) || !transaction.originals || Object.keys(transaction.originals).sort().join() !== [...changedFiles].sort().join()) fail();
  if (Object.values(transaction.originals).some(value => value !== null && typeof value !== 'string') || typeof transaction.originals['library.json'] !== 'string') fail();
  const originalManifest = JSON.parse(transaction.originals['library.json']!);
  if (![1, 2, 3, 4].includes(originalManifest?.schemaVersion) || !uuid.test(originalManifest.libraryId)) fail();
  if (transaction.rolledBack === true) { unlinkSync(file); return true; }
  for (const id of transaction.notes) {
    for (const target of [join(path, 'notes', id), join(path, 'recovery', `stage-import-${transaction.id}-${id}`)]) {
      plainPath(target); if (!existsSync(target)) continue;
      const owner = join(target, 'import-owner');
      if (!existsSync(owner)) {
        if (target !== join(path, 'recovery', `stage-import-${transaction.id}-${id}`) || readdirSync(target).length) fail();
      } else if (read(owner) !== transaction.id) fail();
      // Only this transaction's newly added note directories can be removed.
      const check = (directory: string) => { plainPath(directory); for (const name of readdirSync(directory)) { const child = join(directory, name); plainPath(child); if (lstatSync(child).isDirectory()) check(child); } }; check(target);
      rmSync(target, { recursive: true });
    }
  }
  for (const name of ['organization.json', 'imports.json']) {
    const value = transaction.originals[name]; if (value !== null && typeof value !== 'string') fail();
    const target = join(path, name); plainPath(target);
    if (value === null) { if (existsSync(target)) unlinkSync(target); } else atomic(target, value);
  }
  const manifest = transaction.originals['library.json']; if (typeof manifest !== 'string') fail();
  atomic(file, JSON.stringify({ ...transaction, rolledBack: true }));
  atomic(join(path, 'library.json'), manifest!);
  unlinkSync(file); return true;
}
export function executeImport(plan: Plan, fault?: (stage: string) => void): LibraryImportResult {
  const path = plan.target.path; const source = sourceLock(plan.source.path);
  try {
    if (snapshot(plan.source.path).fingerprint !== plan.source.fingerprint || snapshot(path).fingerprint !== plan.target.fingerprint) fail('VERSION_CONFLICT');
    if (!plan.notes.length && !plan.preview.folders && !plan.preview.tags && plan.target.manifest.schemaVersion >= 3) return { imported: 0, skipped: plan.preview.skipped, backupPath: null, targetVersion: plan.target.manifest.schemaVersion };
    const id = randomUUID(), backupPath = join(dirname(path), `${basename(path)}.import-backups`, id);
    if (overlaps(plan.source.path, backupPath) || overlaps(backupPath, plan.source.path)) fail('INVALID_INPUT');
    plainPath(backupPath); copyTree(path, backupPath); fault?.('backup');
    const originals = Object.fromEntries(changedFiles.map(name => [name, existsSync(join(path, name)) ? read(join(path, name), 4 * 1024 * 1024) : null]));
    const transaction: Transaction = { id, notes: plan.notes.map(note => note.id), originals };
    atomic(join(path, 'library.json'), JSON.stringify({ ...plan.target.manifest, schemaVersion: Math.max(3, plan.target.manifest.schemaVersion, plan.source.manifest.schemaVersion) }));
    try { atomic(join(path, 'import-transaction.json'), JSON.stringify(transaction)); }
    catch (error) { atomic(join(path, 'library.json'), originals['library.json']!); throw error; }
    try {
      fault?.('journal');
      for (const note of plan.notes) {
        const root = join(path, 'notes', note.id); plainPath(root); if (existsSync(root)) fail('VERSION_CONFLICT');
        const stage = join(path, 'recovery', `stage-import-${id}-${note.id}`);
        mkdirSync(stage); atomic(join(stage, 'import-owner'), id);
        for (const row of note.revisions) { const revision = join(stage, 'revisions', row.metadata.revisionId); mkdirSync(revision, { recursive: true }); atomic(join(revision, 'metadata.json'), JSON.stringify(row.metadata)); atomic(join(revision, `content.${extensions[row.metadata.primaryFormat]}`), row.body); }
        for (const blob of note.blobs) { const bytes = readAttachmentFile(blob.path, blob.item); const dir = join(stage, 'attachments'); mkdirSync(dir, { recursive: true }); const fd = openSync(join(dir, blob.item.id), 'wx'); try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); } }
        atomic(join(stage, 'head.json'), JSON.stringify(note.head)); renameSync(stage, root); fault?.('note');
      }
      atomic(join(path, 'organization.json'), JSON.stringify(plan.organization)); fault?.('organization');
      atomic(join(path, 'imports.json'), JSON.stringify(plan.receipts));
      atomic(join(path, 'library.json'), JSON.stringify({ ...plan.target.manifest, schemaVersion: Math.max(3, plan.target.manifest.schemaVersion, plan.source.manifest.schemaVersion) })); fault?.('manifest');
      unlinkSync(join(path, 'import-transaction.json'));
      return { imported: plan.notes.length, skipped: plan.preview.skipped, backupPath, targetVersion: Math.max(3, plan.target.manifest.schemaVersion, plan.source.manifest.schemaVersion) };
    } catch (error) { recoverImport(path); throw error; }
  } finally { source.close(); }
}
