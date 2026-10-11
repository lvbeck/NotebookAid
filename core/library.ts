import { isSvg, attachmentHash, attachmentName, imageType, readAttachmentFile, validateAttachments } from './attachments';
import type { AttachmentRequest, AttachmentView } from '../shared/attachments';
import { basename, extname } from 'node:path';
import { copyTree, recoverImport } from './library-import';
import type { Organization, OrganizationEdit, NotePlacement, PlacementRequest, NoteQuery } from '../shared/organization';
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { EventEmitter } from 'node:events';
import { formatExtensions, type NoteInput, type EditSession, type LibraryErrorCode, type LibraryStatus, type NoteDocument, type NoteSummary, type SaveRequest, type SaveResult } from '../shared/library';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const maxBody = 2 * 1024 * 1024;
const digest = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');
export class LibraryError extends Error { constructor(readonly code: LibraryErrorCode) { super(code); } }
type Head = { formatVersion: 1; id: string; revisionId: string; version: number; metadataHash: string };
type Metadata = Omit<NoteDocument, 'body'> & { schemaVersion: 1; parentRevisionId: string | null; bodyHash: string; operationId: string; requestHash: string; visibleInThunderbird: true };
type Journal = { schemaVersion: 1; operationId: string; requestHash: string; head: Head };
type Session = { noteId: string; owner: string; token: string; generation: string };
export type CommitStage = 'journal' | 'revision' | 'head' | 'index' | 'organization';

export class NoteLibrary {
  readonly path: string;
  readonly libraryId: string;
  private lock!: DatabaseSync;
  private structure: Organization = { schemaVersion: 1, version: 0, folders: [], tags: [] };
  private recent: Record<string, string> = {};
  private manifest!: { schemaVersion: number; libraryId: string; createdAt?: string };
  private readonly catalog = new Map<string, NoteDocument>();
  private index: DatabaseSync | null = null;
  private indexed = false;
  private readonly sessions = new Map<string, Session>();
  private readonly issues = new Set<string>();
  private pendingRecovery = 0;
  private readonly events = new EventEmitter();
  onChange(listener: (change: { noteId: string; version: number; indexed: boolean }) => void): () => void {
    this.events.on('change', listener); return () => { this.events.off('change', listener); };
  }
  constructor(directory: string, private readonly fault?: (stage: CommitStage) => void, mode: 'existing' | 'create' | 'legacy' = 'legacy') {
    if (mode === 'existing' && !existsSync(join(directory, 'library.json'))) throw new LibraryError('NOT_FOUND_OR_UNAVAILABLE');
    if (mode === 'create' && existsSync(directory) && readdirSync(directory).length) throw new LibraryError('INVALID_INPUT');
    if (mode !== 'existing') mkdirSync(directory, { recursive: true });
    this.path = realpathSync(directory);
    try {
      const manifestPath = this.safe('library.json');
      if (mode === 'existing' && !existsSync(manifestPath)) throw new LibraryError('NOT_FOUND_OR_UNAVAILABLE');
      if (!existsSync(manifestPath) && readdirSync(this.path).some(name => name !== '.writer.sqlite')) throw new LibraryError('INVALID_INPUT');
      this.lock = new DatabaseSync(this.safe('.writer.sqlite'));
      try { this.lock.exec('PRAGMA busy_timeout=0; CREATE TABLE IF NOT EXISTS writer(id INTEGER); BEGIN EXCLUSIVE'); }
      catch { throw new LibraryError('LIBRARY_IN_USE'); }
      for (const name of ['notes', 'index', 'recovery']) mkdirSync(this.safe(name), { recursive: true });
      if (!existsSync(manifestPath)) this.atomic(manifestPath, JSON.stringify({ schemaVersion: 1, libraryId: randomUUID(), createdAt: new Date().toISOString() }));
      recoverImport(this.path);
      const manifest = this.json(manifestPath) as { schemaVersion: number; libraryId: string };
      if (![1, 2, 3, 4].includes(manifest.schemaVersion) || !uuid.test(manifest.libraryId)) throw new LibraryError('INTEGRITY_CHECK_FAILED');
      this.libraryId = manifest.libraryId;
      this.manifest = manifest;
      const organizationPath = this.safe('organization.json');
      if (existsSync(organizationPath)) {
        try { this.structure = this.json(organizationPath) as Organization; this.validateStructure(this.structure); } catch { throw new LibraryError('INTEGRITY_CHECK_FAILED'); }
      }
      const recentPath = this.safe('recent.json');
      if (existsSync(recentPath)) {
        try {
          const records = this.json(recentPath) as Record<string, string>;
          if (!records || Array.isArray(records) || typeof records !== 'object' || Object.keys(records).length > 100) throw Error();
          for (const [id, at] of Object.entries(records)) if (!uuid.test(id) || typeof at !== 'string' || !Number.isFinite(Date.parse(at))) throw Error();
          this.recent = records;
        } catch { throw new LibraryError('INTEGRITY_CHECK_FAILED'); }
      }
      this.rebuild();
      try { for (const note of this.catalog.values()) this.validatePlacement(note); } catch { throw new LibraryError('INTEGRITY_CHECK_FAILED'); }
      this.scanRecovery();
    } catch (error) { this.index?.close(); this.lock?.close(); throw error; }
  }
  close(): void { this.sessions.clear(); this.events.removeAllListeners(); this.index?.close(); this.index = null; this.lock.close(); }
  status(): LibraryStatus { return { path: this.path, libraryId: this.libraryId, indexed: this.indexed, issues: [...this.issues], pendingRecovery: this.pendingRecovery }; }
  private id(value: unknown): asserts value is string { if (typeof value !== 'string' || !uuid.test(value)) throw new LibraryError('INVALID_INPUT'); }
  private safe(...parts: string[]): string {
    const target = resolve(this.path, ...parts);
    const rel = relative(this.path, target);
    if (rel.startsWith('..') || rel.includes(':')) throw new LibraryError('INVALID_INPUT');
    let current = this.path;
    for (const part of rel.split(sep).filter(Boolean)) {
      current = join(current, part);
      try { if (lstatSync(current).isSymbolicLink()) throw new LibraryError('INVALID_INPUT'); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    }
    return target;
  }
  private json(path: string): unknown {
    if (statSync(path).size > 128 * 1024) throw new LibraryError('INTEGRITY_CHECK_FAILED');
    return JSON.parse(readFileSync(path, 'utf8')) as unknown;
  }
  private durable(path: string, text: string): void {
    const fd = openSync(path, 'wx');
    try { writeFileSync(fd, text, 'utf8'); fsyncSync(fd); } finally { closeSync(fd); }
  }
  private atomic(path: string, text: string): void {
    const temporary = join(dirname(path), `.pending-${randomUUID()}`);
    this.durable(temporary, text);
    renameSync(temporary, path);
  }
  private head(id: string): Head {
    this.id(id);
    const path = this.safe('notes', id, 'head.json');
    if (!existsSync(path)) throw new LibraryError('NOT_FOUND_OR_UNAVAILABLE');
    const head = this.json(path) as Head;
    if (head.formatVersion !== 1 || head.id !== id || !uuid.test(head.revisionId) || !Number.isSafeInteger(head.version) || head.version < 1 || !/^[a-f0-9]{64}$/.test(head.metadataHash)) throw new LibraryError('INTEGRITY_CHECK_FAILED');
    return head;
  }
  read(id: string): NoteDocument { return this.readHead(this.head(id)); }
  private readHead(head: Head): NoteDocument {
    try {
      this.id(head.id); this.id(head.revisionId);
      const metaPath = this.safe('notes', head.id, 'revisions', head.revisionId, 'metadata.json');
      if (statSync(metaPath).size > 128 * 1024) throw new Error();
      const text = readFileSync(metaPath, 'utf8');
      const meta = JSON.parse(text) as Metadata;
      if (digest(text) !== head.metadataHash || meta.schemaVersion !== 1 || meta.id !== head.id || meta.revisionId !== head.revisionId || meta.version !== head.version || !Object.hasOwn(formatExtensions, meta.primaryFormat)) throw new Error();
      if (meta.attachments !== undefined) validateAttachments(meta.attachments);
      this.validateContent(meta.title, ''); this.validatePlacement(meta, false);
      if (!Number.isSafeInteger(meta.contentVersion) || meta.contentVersion < 1 || !uuid.test(meta.operationId) || (meta.parentRevisionId !== null && !uuid.test(meta.parentRevisionId))) throw new Error();
      if (meta.contentVersion > meta.version || !Number.isFinite(Date.parse(meta.createdAt)) || !Number.isFinite(Date.parse(meta.updatedAt)) || (meta.deletedAt !== null && !Number.isFinite(Date.parse(meta.deletedAt))) || (meta.version === 1) !== (meta.parentRevisionId === null)) throw new Error();
      const bodyPath = this.safe('notes', head.id, 'revisions', head.revisionId, `content.${formatExtensions[meta.primaryFormat]}`);
      if (statSync(bodyPath).size > maxBody) throw new Error();
      const body = readFileSync(bodyPath, 'utf8');
      if (digest(body) !== meta.bodyHash) throw new Error();
      return { id: meta.id, title: meta.title, version: meta.version, contentVersion: meta.contentVersion, createdAt: meta.createdAt, updatedAt: meta.updatedAt, deletedAt: meta.deletedAt, primaryFormat: meta.primaryFormat, revisionId: meta.revisionId, body, folderId: meta.folderId, tagIds: meta.tagIds, pinned: meta.pinned, ...(meta.attachments ? { attachments: meta.attachments } : {}) };
    } catch { throw new LibraryError('INTEGRITY_CHECK_FAILED'); }
  }
  private documents(): NoteDocument[] {
    const notes: NoteDocument[] = [];
    for (const id of readdirSync(this.safe('notes'))) {
      if (!uuid.test(id)) { this.issues.add('UNRECOGNIZED_NOTE_DIRECTORY'); continue; }
      if (!existsSync(this.safe('notes', id, 'head.json'))) continue;
      try { notes.push(this.read(id)); } catch { this.issues.add(`DAMAGED_NOTE:${id}`); }
    }
    return notes;
  }
  reloadImported(): void {
    this.manifest = this.json(this.safe('library.json')) as typeof this.manifest;
    this.structure = existsSync(this.safe('organization.json')) ? this.json(this.safe('organization.json')) as Organization : { schemaVersion: 1, version: 0, folders: [], tags: [] };
    this.validateStructure(this.structure); this.rebuild(); this.scanRecovery();
  }
  organization(): Organization { return structuredClone(this.structure); }
  private enableOrganization(): void {
    if (this.manifest.schemaVersion >= 2) return;
    const next = { ...this.manifest, schemaVersion: 2 };
    const previous = this.safe('library-v1.json');
    if (!existsSync(previous)) this.durable(previous, JSON.stringify(this.manifest));
    this.atomic(this.safe('library.json'), JSON.stringify(next)); this.manifest = next;
  }
  private validateStructure(value: Organization): void {
    if (!value || value.schemaVersion !== 1 || !Number.isSafeInteger(value.version) || value.version < 0 || !Array.isArray(value.folders) || !Array.isArray(value.tags) || value.folders.length > 500 || value.tags.length > 500 || Buffer.byteLength(JSON.stringify(value)) > 128 * 1024) throw new LibraryError('INVALID_INPUT');
    const ids = new Set<string>(), names = new Set<string>();
    for (const item of [...value.folders, ...value.tags]) {
      if (!item || typeof item !== 'object') throw new LibraryError('INVALID_INPUT');
      this.id(item.id);
      if (ids.has(item.id) || typeof item.name !== 'string' || !item.name.trim() || item.name !== item.name.trim() || item.name.length > 80 || /[\x00-\x1f]/.test(item.name)) throw new LibraryError('INVALID_INPUT');
      ids.add(item.id);
    }
    for (const folder of value.folders) {
      if (folder.order !== undefined && (!Number.isSafeInteger(folder.order) || folder.order < 0)) throw new LibraryError('INVALID_INPUT');
      const key = `${folder.parentId}/${folder.name.normalize('NFKC').toLowerCase()}`;
      if (names.has(key)) throw new LibraryError('INVALID_INPUT'); names.add(key);
      const visited = new Set([folder.id]); let parent = folder.parentId;
      while (parent !== null) {
        this.id(parent);
        const found = value.folders.find(item => item.id === parent);
        if (!found || visited.has(parent) || visited.size >= 16) throw new LibraryError('INVALID_INPUT');
        visited.add(parent); parent = found.parentId;
      }
    }
    names.clear();
    for (const tag of value.tags) {
      const key = tag.name.normalize('NFKC').toLowerCase();
      if (names.has(key) || typeof tag.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(tag.color)) throw new LibraryError('INVALID_INPUT'); names.add(key);
    }
  }
  editOrganization(input: OrganizationEdit): Organization {
    if (!input || !['folder', 'tag', 'folder-order'].includes(input.kind)) throw new LibraryError('INVALID_INPUT');
    if (input.kind !== 'folder-order') { this.id(input.id); if (typeof input.name !== 'string') throw new LibraryError('INVALID_INPUT'); }
    if (input.expectedVersion !== this.structure.version) throw new LibraryError('VERSION_CONFLICT');
    const next = this.organization();
    if (input.kind === 'folder-order') {
      if (!Array.isArray(input.ids) || input.ids.length !== next.folders.length || new Set(input.ids).size !== input.ids.length || input.ids.some(id => !next.folders.some(folder => folder.id === id))) throw new LibraryError('INVALID_INPUT');
      next.folders = next.folders.map(folder => ({ ...folder, order: input.ids.indexOf(folder.id) }));
    } else if (input.kind === 'folder') {
      const row = { ...next.folders.find(item => item.id === input.id), id: input.id, name: input.name.trim(), parentId: input.parentId ?? null };
      const index = next.folders.findIndex(item => item.id === input.id);
      if (index < 0) next.folders.push(row); else next.folders[index] = row;
    } else {
      const row = { id: input.id, name: input.name.trim(), color: input.color ?? '#7460c9' };
      const index = next.tags.findIndex(item => item.id === input.id);
      if (index < 0) next.tags.push(row); else next.tags[index] = row;
    }
    next.version++; this.validateStructure(next);
    this.enableOrganization(); this.fault?.('organization');
    this.atomic(this.safe('organization.json'), JSON.stringify(next)); this.structure = next;
    return this.organization();
  }
  private validatePlacement(value: NotePlacement, references = true): void {
    if (value.folderId !== null) this.id(value.folderId);
    if (!Array.isArray(value.tagIds) || value.tagIds.length > 100 || new Set(value.tagIds).size !== value.tagIds.length || typeof value.pinned !== 'boolean') throw new LibraryError('INVALID_INPUT');
    for (const id of value.tagIds) this.id(id);
    if (references && ((value.folderId !== null && !this.structure.folders.some(item => item.id === value.folderId)) || value.tagIds.some(id => !this.structure.tags.some(item => item.id === id)))) throw new LibraryError('INVALID_INPUT');
  }
  place(request: PlacementRequest, owner: string): SaveResult {
    if (!request || typeof request !== 'object') throw new LibraryError('INVALID_INPUT');
    this.id(request.noteId); this.id(request.operationId); this.validatePlacement(request);
    const session = this.sessions.get(request.noteId);
    if (!session || session.owner !== owner || session.token !== request.token || session.generation !== request.generation) throw new LibraryError('SESSION_EXPIRED');
    const placement = { folderId: request.folderId, tagIds: [...request.tagIds].sort(), pinned: request.pinned };
    const hash = digest(JSON.stringify(['place', request.noteId, request.expectedVersion, placement]));
    const replay = this.operation(request.operationId, hash); if (replay) return replay;
    const current = this.read(request.noteId);
    if (current.version !== request.expectedVersion) throw new LibraryError('VERSION_CONFLICT');
    if (current.folderId === placement.folderId && current.pinned === placement.pinned && JSON.stringify([...current.tagIds].sort()) === JSON.stringify(placement.tagIds)) return { note: current, saved: true, indexed: this.indexed };
    this.enableOrganization();
    return this.commit({ ...current, ...placement }, current, request.operationId, hash);
  }
  query(input: NoteQuery = {}): { notes: NoteSummary[]; total: number } {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new LibraryError('INVALID_INPUT');
    const { text = '', tagIds = [], view = 'all', offset = 0, limit = 50 } = input;
    if (typeof text !== 'string' || text.length > 300 || !Array.isArray(tagIds) || tagIds.length > 100 || !['all', 'pinned', 'recent'].includes(view) || !Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new LibraryError('INVALID_INPUT');
    for (const id of tagIds) this.id(id);
    const folders = new Set<string | null>();
    if (input.folderId !== undefined) {
      if (input.folderId !== null) this.id(input.folderId);
      folders.add(input.folderId);
      if (input.folderId !== null) for (let i = 0; i < 16; i++) for (const folder of this.structure.folders) if (folders.has(folder.parentId)) folders.add(folder.id);
    }
    const terms = text.normalize('NFKC').toLowerCase().trim().split(/\s+/).filter(Boolean);
    const rows = [...this.catalog.values()].filter(note => {
      if (note.deletedAt || (folders.size && !folders.has(note.folderId)) || !tagIds.every(id => note.tagIds.includes(id)) || (view === 'pinned' && !note.pinned) || (view === 'recent' && !this.recent[note.id])) return false;
      const content = `${note.title}\n${note.body}`.normalize('NFKC').toLowerCase();
      return terms.every(term => content.includes(term));
    });
    rows.sort((a, b) => view === 'recent' ? this.recent[b.id].localeCompare(this.recent[a.id]) || a.id.localeCompare(b.id) : Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
    return { total: rows.length, notes: rows.slice(offset, offset + limit).map(({ body: _body, revisionId: _revision, ...summary }) => ({ ...summary, tagIds: [...summary.tagIds] })) };
  }
  list(): NoteSummary[] {
    return this.documents().filter(note => !note.deletedAt).map(({ body: _body, revisionId: _revision, ...summary }) => summary)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
  }
  rebuild(): LibraryStatus {
    this.index?.close(); this.index = null; this.indexed = false; this.issues.clear();
    const notes = this.documents();
    this.catalog.clear(); for (const note of notes) this.catalog.set(note.id, note);
    const path = this.safe('index', 'catalog.sqlite');
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        this.index = new DatabaseSync(path);
        this.index.exec('CREATE TABLE IF NOT EXISTS notes(id TEXT PRIMARY KEY, title TEXT NOT NULL, version INTEGER NOT NULL, updatedAt TEXT NOT NULL, deletedAt TEXT); BEGIN; DELETE FROM notes');
        for (const note of notes) this.indexNote(note);
        this.index.exec('COMMIT'); this.indexed = true; break;
      } catch {
        try { this.index?.close(); } catch { /* Preserve authoritative files. */ } this.index = null;
        if (attempt === 0) {
          try { if (existsSync(path)) renameSync(path, this.safe('index', `catalog-damaged-${randomUUID()}.sqlite`)); }
          catch { break; }
        }
      }
    }
    if (!this.indexed) this.issues.add('INDEX_REBUILD_REQUIRED');
    return this.status();
  }
  private indexNote(note: NoteDocument): void {
    if (!this.index) throw new Error('Index unavailable');
    this.index.prepare('INSERT OR REPLACE INTO notes VALUES (?, ?, ?, ?, ?)').run(note.id, note.title, note.version, note.updatedAt, note.deletedAt);
  }
  begin(id: string, owner: string): EditSession {
    const note = this.read(id);
    if (note.deletedAt) throw new LibraryError('NOT_FOUND_OR_UNAVAILABLE');
    const existing = this.sessions.get(id);
    if (existing && existing.owner !== owner) throw new LibraryError('NOTE_IN_USE');
    const session = existing ?? { noteId: id, owner, token: randomUUID(), generation: randomUUID() };
    const timestamp = Math.max(Date.now(), ...Object.values(this.recent).map(value => Date.parse(value) + 1));
    const nextRecent = Object.fromEntries([[id, new Date(timestamp).toISOString()], ...Object.entries(this.recent).filter(([key]) => key !== id)].slice(0, 100));
    this.atomic(this.safe('recent.json'), JSON.stringify(nextRecent)); this.recent = nextRecent;
    this.sessions.set(id, session);
    return { token: session.token, generation: session.generation, note };
  }
  end(token: string, generation: string, owner: string): void {
    for (const [id, session] of this.sessions) if (session.owner === owner && session.token === token && session.generation === generation) this.sessions.delete(id);
  }
  releaseOwner(owner: string): void { for (const [id, session] of this.sessions) if (session.owner === owner) this.sessions.delete(id); }
  private validateContent(title: unknown, body: unknown): void {
    if (typeof title !== 'string' || !title.trim() || title.length > 300 || typeof body !== 'string' || Buffer.byteLength(body, 'utf8') > maxBody || title.includes('\0') || body.includes('\0')) throw new LibraryError('INVALID_INPUT');
  }
  private operation(id: string, requestHash: string): SaveResult | null {
    this.id(id);
    const path = this.safe('recovery', `${id}.json`);
    if (!existsSync(path)) return null;
    const journal = this.json(path) as Journal;
    if (journal.schemaVersion !== 1 || journal.operationId !== id || journal.requestHash !== requestHash) throw new LibraryError('INVALID_INPUT');
    this.id(journal.head.id); this.id(journal.head.revisionId);
    if (!existsSync(this.safe('notes', journal.head.id, 'head.json'))) return null;
    let revision: string | null = this.head(journal.head.id).revisionId;
    const visited = new Set<string>();
    while (revision) {
      this.id(revision);
      if (visited.has(revision)) throw new LibraryError('INTEGRITY_CHECK_FAILED');
      visited.add(revision);
      if (revision === journal.head.revisionId) return { note: this.readHead(journal.head), saved: true, indexed: this.indexed };
      const metadata = this.json(this.safe('notes', journal.head.id, 'revisions', revision, 'metadata.json')) as Metadata;
      revision = metadata.parentRevisionId;
    }
    return null;
  }
  create(operationId: string, input?: NoteInput): SaveResult {
    this.id(operationId);
    if (input !== undefined && (!input || typeof input !== 'object' || !Object.hasOwn(formatExtensions, input.primaryFormat))) throw new LibraryError('INVALID_INPUT');
    const initial = input ?? { title: 'Untitled', body: '', primaryFormat: 'markdown' as const };
    this.validateContent(initial.title, initial.body);
    const placement: NotePlacement = { folderId: initial.folderId ?? null, tagIds: [], pinned: false }; this.validatePlacement(placement);
    if (placement.folderId) this.enableOrganization();
    const hash = digest(input === undefined ? 'create' : JSON.stringify(['create', initial.primaryFormat, initial.title, initial.body, ...(placement.folderId ? [placement.folderId] : [])]));
    const replay = this.operation(operationId, hash); if (replay) return replay;
    const now = new Date().toISOString();
    return this.commit({ id: randomUUID(), revisionId: '', title: initial.title, body: initial.body, primaryFormat: initial.primaryFormat, version: 0, contentVersion: 0, createdAt: now, updatedAt: now, deletedAt: null, ...placement }, null, operationId, hash);
  }
  save(request: SaveRequest, owner: string): SaveResult {
    if (!request || typeof request !== 'object') throw new LibraryError('INVALID_INPUT');
    this.id(request.noteId); this.id(request.operationId); this.validateContent(request.title, request.body);
    const session = this.sessions.get(request.noteId);
    if (!session || session.owner !== owner || session.token !== request.token || session.generation !== request.generation) throw new LibraryError('SESSION_EXPIRED');
    const hash = digest(JSON.stringify([request.noteId, request.expectedVersion, request.title, request.body]));
    const replay = this.operation(request.operationId, hash); if (replay) return replay;
    const current = this.read(request.noteId);
    if (current.version !== request.expectedVersion) throw new LibraryError('VERSION_CONFLICT');
    return this.commit({ ...current, title: request.title, body: request.body }, current, request.operationId, hash);
  }
  attachmentList(id: string): AttachmentView[] {
    return (this.read(id).attachments ?? []).map(item => {
      try { const bytes = this.attachmentBytes(id, item.id); return { ...item, mediaType: isSvg(bytes) || /\.svg$/i.test(item.name) ? 'image/svg+xml' : item.mediaType, available: true }; }
      catch { return { ...item, available: false }; }
    });
  }
  attachmentBytes(noteId: string, id: string): Buffer {
    this.id(noteId); this.id(id);
    const item = this.read(noteId).attachments?.find(row => row.id === id);
    if (!item) throw new LibraryError('NOT_FOUND_OR_UNAVAILABLE');
    return readAttachmentFile(this.safe('notes', noteId, 'attachments', id), item);
  }
  private attachmentSession(request: AttachmentRequest, owner: string): NoteDocument {
    if (!request || typeof request !== 'object') throw new LibraryError('INVALID_INPUT');
    this.id(request.noteId); this.id(request.operationId);
    const session = this.sessions.get(request.noteId);
    if (!session || session.owner !== owner || session.token !== request.token || session.generation !== request.generation) throw new LibraryError('SESSION_EXPIRED');
    return this.read(request.noteId);
  }
  addAttachment(request: AttachmentRequest, owner: string, path: string, sanitizedBytes?: Buffer): SaveResult {
    const current = this.attachmentSession(request, owner);
    const sourceBytes = readAttachmentFile(path);
    const bytes = sanitizedBytes ?? sourceBytes;
    const hash = digest(JSON.stringify(['attachment', request.noteId, request.expectedVersion, basename(path), attachmentHash(bytes)]));
    const replay = this.operation(request.operationId, hash); if (replay) return replay;
    if (current.version !== request.expectedVersion) throw new LibraryError('VERSION_CONFLICT');
    const existing = current.attachments ?? []; const original = attachmentName(basename(path));
    let name = original, suffix = 2;
    const extension = extname(original), stem = basename(original, extension);
    while (existing.some(row => row.name.normalize('NFKC').toLowerCase() === name.normalize('NFKC').toLowerCase())) name = stem.slice(0,140) + ' (' + suffix++ + ')' + extension.slice(0,20);
    const item = { id: randomUUID(), name, size: bytes.length, sha256: attachmentHash(bytes), mediaType: imageType(bytes) };
    const attachments = [...existing, item]; validateAttachments(attachments);
    if (this.manifest.schemaVersion < 4) {
      const backup = join(dirname(this.path), basename(this.path) + '.attachment-backups', randomUUID());
      copyTree(this.path, backup);
      this.atomic(this.safe('library.json'), JSON.stringify({ ...this.manifest, schemaVersion: 4 })); this.manifest.schemaVersion = 4;
    }
    const directory = this.safe('notes', current.id, 'attachments'); mkdirSync(directory, { recursive: true });
    const fd = openSync(this.safe('notes', current.id, 'attachments', item.id), 'wx');
    try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
    return this.commit({ ...current, attachments }, current, request.operationId, hash);
  }
  renameAttachment(request: AttachmentRequest, owner: string, id: string, value: string): SaveResult {
    const current = this.attachmentSession(request, owner); this.id(id); const name = attachmentName(value);
    const hash = digest(JSON.stringify(['attachment-name', request.noteId, request.expectedVersion, id, name]));
    const replay = this.operation(request.operationId, hash); if (replay) return replay;
    if (current.version !== request.expectedVersion) throw new LibraryError('VERSION_CONFLICT');
    if (!current.attachments?.some(row => row.id === id)) throw new LibraryError('NOT_FOUND_OR_UNAVAILABLE');
    const attachments = current.attachments.map(row => row.id === id ? { ...row, name } : row); validateAttachments(attachments);
    return this.commit({ ...current, attachments }, current, request.operationId, hash);
  }
  unlinkAttachment(request: AttachmentRequest, owner: string, id: string): SaveResult {
    const current = this.attachmentSession(request, owner); this.id(id);
    const hash = digest(JSON.stringify(['attachment-unlink', request.noteId, request.expectedVersion, id]));
    const replay = this.operation(request.operationId, hash); if (replay) return replay;
    if (current.version !== request.expectedVersion) throw new LibraryError('VERSION_CONFLICT');
    if (!current.attachments?.some(row => row.id === id)) throw new LibraryError('NOT_FOUND_OR_UNAVAILABLE');
    const attachments = current.attachments.filter(row => row.id !== id);
    return this.commit({ ...current, attachments }, current, request.operationId, hash);
  }
  trash(id: string, expectedVersion: number, operationId: string): SaveResult {
    this.id(id); this.id(operationId);
    if (this.sessions.has(id)) throw new LibraryError('NOTE_IN_USE');
    const hash = digest(JSON.stringify(['trash', id, expectedVersion]));
    const replay = this.operation(operationId, hash); if (replay) return replay;
    const current = this.read(id);
    if (current.version !== expectedVersion) throw new LibraryError('VERSION_CONFLICT');
    return this.commit({ ...current, deletedAt: new Date().toISOString() }, current, operationId, hash);
  }
  private commit(input: NoteDocument, previous: NoteDocument | null, operationId: string, requestHash: string): SaveResult {
    const note: NoteDocument = { ...input, revisionId: randomUUID(), version: input.version + 1, contentVersion: previous ? previous.contentVersion + Number(previous.body !== input.body) : 1, updatedAt: new Date().toISOString() };
    const { body, ...fields } = note;
    const meta: Metadata = { ...fields, schemaVersion: 1, parentRevisionId: previous?.revisionId ?? null, bodyHash: digest(body), operationId, requestHash, visibleInThunderbird: true };
    const text = JSON.stringify(meta);
    const head: Head = { formatVersion: 1, id: note.id, revisionId: note.revisionId, version: note.version, metadataHash: digest(text) };
    let committed = false;
    try {
      const staging = this.safe('recovery', `stage-${note.revisionId}`); mkdirSync(staging);
      this.durable(join(staging, 'metadata.json'), text); this.durable(join(staging, `content.${formatExtensions[note.primaryFormat]}`), body);
      this.atomic(this.safe('recovery', `${operationId}.json`), JSON.stringify({ schemaVersion: 1, operationId, requestHash, head } satisfies Journal));
      this.fault?.('journal');
      mkdirSync(this.safe('notes', note.id, 'revisions'), { recursive: true });
      renameSync(staging, this.safe('notes', note.id, 'revisions', note.revisionId));
      this.readHead(head); this.fault?.('revision');
      this.atomic(this.safe('notes', note.id, 'head.json'), JSON.stringify(head));
      committed = true; this.fault?.('head');
      this.fault?.('index'); this.indexNote(note);
    } catch (error) {
      if (!committed) {
        try { committed = this.head(note.id).revisionId === note.revisionId; }
        catch (check) { if (!(check instanceof LibraryError && check.code === 'NOT_FOUND_OR_UNAVAILABLE')) throw new LibraryError('COMMIT_STATUS_UNKNOWN'); }
      }
      if (!committed) throw error instanceof LibraryError ? error : new LibraryError('WRITE_FAILED');
      this.indexed = false; this.issues.add('INDEX_REBUILD_REQUIRED');
    }
    this.catalog.set(note.id, note);
    // Observers cannot roll back a committed revision by throwing.
    for (const listener of this.events.listeners('change')) {
      try { listener({ noteId: note.id, version: note.version, indexed: this.indexed }); } catch { /* The durable commit remains authoritative. */ }
    }
    return { note, saved: true, indexed: this.indexed };
  }
  private scanRecovery(): void {
    this.pendingRecovery = 0;
    const committed = new Set<string>();
    for (const note of this.documents()) {
      let revision: string | null = note.revisionId;
      const visited = new Set<string>();
      try {
        while (revision) {
          this.id(revision);
          if (visited.has(revision)) throw new Error('Revision cycle');
          visited.add(revision); committed.add(`${note.id}/${revision}`);
          const metadata = this.json(this.safe('notes', note.id, 'revisions', revision, 'metadata.json')) as Metadata;
          revision = metadata.parentRevisionId;
        }
      } catch { this.issues.add(`DAMAGED_HISTORY:${note.id}`); }
    }
    for (const name of readdirSync(this.safe('recovery'))) {
      if (name.startsWith('stage-')) { this.pendingRecovery++; continue; }
      if (!/^[a-f0-9-]+\.json$/i.test(name)) continue;
      try {
        const journal = this.json(this.safe('recovery', name)) as Journal;
        if (journal.schemaVersion !== 1 || journal.operationId + '.json' !== name) throw new Error('Invalid journal');
        this.id(journal.head.id); this.id(journal.head.revisionId);
        if (!committed.has(`${journal.head.id}/${journal.head.revisionId}`)) this.pendingRecovery++;
      } catch { this.issues.add('RECOVERY_RECORD_DAMAGED'); }
    }
    for (const id of readdirSync(this.safe('notes'))) if (uuid.test(id) && !existsSync(this.safe('notes', id, 'head.json'))) this.pendingRecovery++;
  }
}
