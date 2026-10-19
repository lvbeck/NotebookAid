import {validateTasksLedger,type TasksLedger} from '../shared/task-receipts';
import { validateTaskSource, type TaskSource } from '../shared/task-source';
import { NotebookSecurity } from './security';
import { validateSummary, validateTranslation, type GeneratedTranslation, type GeneratedSummary } from '../shared/writing';
import { validateAppearance } from './notebook-appearance';
import { notebookSettingsFile, readNotebookSettings, validateNotebookSettings, type NotebookSettings, type NotebookSettingsSeed } from './notebook-settings';
import { restoreAllowed } from './restore-guard';
import { renameWithRetry } from './file-rename';
import type { SecurityState, SecurityRequest } from '../shared/security';
import { parseDelta, deltaText } from '../shared/delta-document';
import { validateNative } from './delta-files';
import { isSvg, attachmentHash, attachmentName, imageType, readAttachmentFile, validateAttachments } from './attachments';
import type { AttachmentRequest, AttachmentView } from '../shared/attachments';
import { basename, extname } from 'node:path';
import { copyTree, recoverImport } from './library-import';
import type { Organization, OrganizationEdit, NotePlacement, PlacementRequest, NoteQuery } from '../shared/organization';
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { rmSync, unlinkSync, closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { EventEmitter } from 'node:events';
import { performance } from 'node:perf_hooks';
import type { StartupProgress, StartupMetrics } from '../shared/startup';
import { latestNotebookSchemaVersion, maxNoteMetadataBytes, formatExtensions, type LibraryUpgradeResult, type NoteInput, type EditSession, type LibraryErrorCode, type LibraryStatus, type NoteDocument, type NoteSummary, type SaveRequest, type SaveResult } from '../shared/library';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const maxBody = 2 * 1024 * 1024;
const digest = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');
export class LibraryError extends Error { constructor(readonly code: LibraryErrorCode, readonly details?: { targetPath?: string; rollbackPath?: string; stagingPath?: string }) { super(code); } }
type Head = { formatVersion: 1; id: string; revisionId: string; version: number; metadataHash: string };
type Metadata = Omit<NoteDocument, 'body'> & { schemaVersion: 1; parentRevisionId: string | null; bodyHash: string; operationId: string; requestHash: string; visibleInThunderbird: boolean };
type CatalogNote = Omit<NoteDocument, 'body'> & { body?: string };
type Journal = { schemaVersion: 1; operationId: string; requestHash?: string; head: Head };
type Session = { noteId: string; owner: string; token: string; generation: string };
export type CommitStage = 'restore-prepared' | 'restore-original-moved' | 'restore-replacement-moved' | 'restore-verified' | 'restore-rollback' | 'notebook-settings' | 'appearance' | 'schema' | 'journal' | 'revision' | 'head' | 'index' | 'organization' | 'purge-journal' | 'purge-moved' | 'history-floor' | 'history-pruned' | 'security-prepared' | 'security-moved';

export class NoteLibrary {
  notebookSettings(seed?: NotebookSettingsSeed): NotebookSettings | null {
    const current = readNotebookSettings(this.path, this.libraryId);
    if (current || !seed) return current;
    const next = validateNotebookSettings({ ...seed, format: 'NotebookAidNotebookSettings', schemaVersion: 1, libraryId: this.libraryId, revision: 1 }, this.libraryId);
    this.writeNotebookSettings(next); return next;
  }
  updateNotebookSettings(patch: unknown): NotebookSettings {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch) || !Object.keys(patch).length || Object.keys(patch).some(key => !['name','autosave','dailyBackup'].includes(key))) throw new LibraryError('INVALID_INPUT');
    const current = this.notebookSettings(); if (!current) throw new LibraryError('INTEGRITY_CHECK_FAILED');
    const next = validateNotebookSettings({ ...current, ...patch, revision: current.revision + 1 }, this.libraryId);
    this.writeNotebookSettings(next); return next;
  }
  private writeNotebookSettings(value: NotebookSettings): void {
    try { this.fault?.('notebook-settings'); this.atomic(this.safe(notebookSettingsFile), JSON.stringify(value)); }
    catch (error) { if (error instanceof LibraryError) throw error; throw new LibraryError('WRITE_FAILED'); }
  }
  setAppearance(value: unknown): void {
    const appearance = validateAppearance(value);
    try { this.fault?.('appearance'); this.atomic(this.safe('appearance.json'), JSON.stringify(appearance)); }
    catch (error) { if (error instanceof LibraryError) throw error; throw new LibraryError('WRITE_FAILED'); }
  }
  readonly path: string;
  readonly libraryId: string;
  private lock!: DatabaseSync;
  private security!: NotebookSecurity;
  private structure: Organization = { schemaVersion: 1, version: 0, folders: [], tags: [] };
  private recent: Record<string, string> = {};
  private manifest!: { schemaVersion: number; libraryId: string; createdAt?: string };
  private readonly catalog = new Map<string, CatalogNote>();
  private index: DatabaseSync | null = null;
  private indexed = false;
  private readonly sessions = new Map<string, Session>();
  private readonly issues = new Set<string>();
  private pendingRecovery = 0;
  private startupActive = true;
  private readonly startup: StartupMetrics = { totalMs: 0, phasesMs: {} };
  private readonly events = new EventEmitter();
  onChange(listener: (change: { noteId: string; version: number; indexed: boolean }) => void): () => void {
    this.events.on('change', listener); return () => { this.events.off('change', listener); };
  }
  constructor(directory: string, private readonly fault?: (stage: CommitStage) => void, mode: 'existing' | 'create' | 'legacy' = 'legacy', restoreToken?: string, private readonly startupObserver?: (progress: StartupProgress) => void) {
    const started = performance.now(); let phaseStarted = started;
    const measured = (phase: string) => { const now = performance.now(); this.startup.phasesMs[phase] = now - phaseStarted; phaseStarted = now; };
    if (!restoreAllowed(directory, restoreToken)) throw new LibraryError('RESTORE_INTERRUPTED');
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
      if (!existsSync(manifestPath)) this.atomic(manifestPath, JSON.stringify({ schemaVersion: mode === 'create' ? latestNotebookSchemaVersion : 1, libraryId: randomUUID(), createdAt: new Date().toISOString() }));
      recoverImport(this.path);
      const manifest = this.json(manifestPath) as { schemaVersion: number; libraryId: string };
      if (![1, 2, 3, 4, 5, 6, 7, 8, 9, 10].includes(manifest.schemaVersion) || !uuid.test(manifest.libraryId)) throw new LibraryError('INTEGRITY_CHECK_FAILED');
      this.libraryId = manifest.libraryId;
      this.manifest = manifest;
      readNotebookSettings(this.path, this.libraryId);
      if (mode === 'create') this.notebookSettings({ name: basename(this.path).slice(0, 100) || 'NotebookAid', autosave: null, dailyBackup: false });
      this.security = new NotebookSecurity(this.path, this.libraryId, stage => this.fault?.(stage as CommitStage));
      if (this.security.configured && this.manifest.schemaVersion < 7) { this.atomic(manifestPath, JSON.stringify({ ...this.manifest, schemaVersion: Math.max(this.manifest.schemaVersion, 7) })); this.manifest.schemaVersion = Math.max(this.manifest.schemaVersion, 7); }
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
      measured('prepare'); this.progress({ phase: 'recovery' });
      this.recoverPurges();
      this.recoverHistoryCleanup();
      measured('recovery');
      this.rebuild();
      measured('catalogAndIndex');
      try { for (const note of this.catalog.values()) this.validatePlacement(note); } catch { throw new LibraryError('INTEGRITY_CHECK_FAILED'); }
      this.progress({ phase: 'history' });
      this.scanRecovery();
      measured('history'); this.startup.totalMs = performance.now() - started;
    } catch (error) { this.index?.close(); this.lock?.close(); throw error; }
    finally { this.startupActive = false; }
  }
  private progress(value: StartupProgress): void {
    if (!this.startupActive) return;
    try { this.startupObserver?.(value); } catch { /* Observers cannot interrupt authoritative checks. */ }
  }
  close(): void { this.security?.lock(); this.catalog.clear(); this.sessions.clear(); this.events.removeAllListeners(); this.index?.close(); this.index = null; if (this.lock.isOpen) this.lock.close(); }
  status(): LibraryStatus {
    const resumeNoteId = Object.entries(this.recent).sort((a, b) => b[1].localeCompare(a[1])).find(([id]) => this.catalog.has(id) && !this.catalog.get(id)!.deletedAt)?.[0];
    return { security: this.securityState(), path: this.path, libraryId: this.libraryId, indexed: this.indexed, issues: [...this.issues], pendingRecovery: this.pendingRecovery, resumeNoteId, startup: structuredClone(this.startup) };
  }
  assertMaintenance(allowDamaged = false): void { if (this.sessions.size) throw new LibraryError('NOTE_IN_USE'); if (!allowDamaged && (this.pendingRecovery || this.issues.size)) throw new LibraryError('INTEGRITY_CHECK_FAILED'); }
  verifyIntegrity(): import('../shared/backup').IntegrityResult {
    const steps = this.integritySteps();
    let next = steps.next();
    while (!next.done) next = steps.next();
    return next.value;
  }
  async verifyIntegrityAsync(progress: (value: import('../shared/backup').BackupProgress) => void): Promise<import('../shared/backup').IntegrityResult> {
    const steps = this.integritySteps();
    let next = steps.next();
    while (!next.done) { progress(next.value); await new Promise<void>(resolve => setImmediate(resolve)); next = steps.next(); }
    return next.value;
  }
  private *integritySteps(): Generator<import('../shared/backup').BackupProgress, import('../shared/backup').IntegrityResult> {
    readNotebookSettings(this.path, this.libraryId);
    if (this.pendingRecovery || this.issues.size) throw new LibraryError('INTEGRITY_CHECK_FAILED');
    this.security.verifyStructure();
    let notes = 0, revisions = 0, attachments = 0, encryptedSkipped = 0;
    const seen = new Set<string>();
    const ids = readdirSync(this.safe('notes')); let completed = 0;
    yield { phase: 'validating', completed, total: ids.length };
    for (const id of ids) {
      this.id(id);
      if (this.security.encrypted(id) && !this.security.unlocked) { encryptedSkipped++; completed++; yield { phase: 'validating', completed, total: ids.length }; continue; }
      notes++;
      for (const head of this.revisionHeads(id)) {
        const note = this.readHead(head); revisions++;
        for (const item of note.attachments ?? []) {
          const key = id + '/' + item.id; if (seen.has(key)) continue;
          seen.add(key); this.checkedAttachment(id, item).fill(0); attachments++;
          yield { phase: 'validating', completed, total: ids.length };
        }
        yield { phase: 'validating', completed, total: ids.length };
      }
      completed++; yield { phase: 'validating', completed, total: ids.length };
    }
    return { notes, revisions, attachments, encryptedSkipped };
  }
  upgradeSchema(expected: number): LibraryUpgradeResult {
    if (!Number.isSafeInteger(expected) || expected < 1 || expected > latestNotebookSchemaVersion) throw new LibraryError('INVALID_INPUT');
    if (this.manifest.schemaVersion === latestNotebookSchemaVersion) return { schemaVersion: latestNotebookSchemaVersion, backupPath: null };
    if (expected !== this.manifest.schemaVersion) throw new LibraryError('VERSION_CONFLICT');
    if (this.sessions.size) throw new LibraryError('NOTE_IN_USE');
    if (this.pendingRecovery || this.issues.size) throw new LibraryError('INTEGRITY_CHECK_FAILED');
    const backupPath = join(dirname(this.path), basename(this.path) + '.schema-backups', randomUUID());
    try {
      copyTree(this.path, backupPath);
      this.fault?.('schema');
      this.atomic(this.safe('library.json'), JSON.stringify({ ...this.manifest, schemaVersion: latestNotebookSchemaVersion }));
      this.manifest.schemaVersion = latestNotebookSchemaVersion;
    } catch (error) { throw error instanceof LibraryError ? error : new LibraryError('WRITE_FAILED'); }
    return { schemaVersion: latestNotebookSchemaVersion, backupPath };
  }
  private id(value: unknown): asserts value is string { if (typeof value !== 'string' || !uuid.test(value)) throw new LibraryError('INVALID_INPUT'); }
  securityState(): SecurityState {
    const file = this.safe('security-preference.json');
    const preference = existsSync(file) ? this.json(file) as boolean | null : null;
    if (preference !== null && typeof preference !== 'boolean') throw new LibraryError('INTEGRITY_CHECK_FAILED');
    return { configured: this.security.configured, unlocked: this.security.unlocked, encryptedNotes: this.security.encryptedIds().length, preference };
  }
  importSecurity(): NotebookSecurity { return this.security; }
  setSecurityPreference(value: boolean | null): void {
    if (value !== null && typeof value !== 'boolean') throw new LibraryError('INVALID_INPUT');
    if (value === false && this.security.configured) throw new LibraryError('ENCRYPTED_NOTES_REMAIN');
    this.atomic(this.safe('security-preference.json'), JSON.stringify(value));
  }
  private clearDiskIndex(): void {
    for (const name of readdirSync(this.safe('index'))) {
      if (!/^catalog(?:-damaged-[a-f0-9-]+)?\.sqlite(?:-wal|-shm|-journal)?$/i.test(name)) throw new LibraryError('INTEGRITY_CHECK_FAILED');
      const path = this.safe('index', name); if (!lstatSync(path).isFile()) throw new LibraryError('INVALID_INPUT'); unlinkSync(path);
    }
  }
  async securityCommand(request: SecurityRequest): Promise<{ state: SecurityState; recoveryKey?: string }> {
    if (!request || !['setup', 'unlock', 'recover', 'password', 'lock', 'disable'].includes(request.action)) throw new LibraryError('INVALID_INPUT');
    let recoveryKey: string | undefined;
    if (request.action === 'setup') {
      recoveryKey = await this.security.setup(request.password!);
      this.atomic(this.safe('library.json'), JSON.stringify({ ...this.manifest, schemaVersion: Math.max(this.manifest.schemaVersion, 7) })); this.manifest.schemaVersion = Math.max(this.manifest.schemaVersion, 7);
      this.atomic(this.safe('security-preference.json'), 'true');
    } else if (request.action === 'unlock') await this.security.unlock(request.credential!);
    else if (request.action === 'recover' || request.action === 'password') await this.security.changePassword(request.credential!, request.password!, request.action === 'recover');
    else if (request.action === 'disable') {
      await this.security.unlock(request.credential!); this.security.disable(); this.atomic(this.safe('security-preference.json'), 'false');
    } else this.security.lock();
    this.sessions.clear(); this.recoverPurges(); this.recoverHistoryCleanup(); this.rebuild(); this.scanRecovery();
    this.events.emit('change', { noteId: '', version: 0, indexed: this.indexed });
    return { state: this.securityState(), ...(recoveryKey ? { recoveryKey } : {}) };
  }
  lockSecurity(): void { this.security.lock(); this.sessions.clear(); this.catalog.clear(); this.rebuild(); this.events.emit('change', { noteId: '', version: 0, indexed: this.indexed }); }
  protect(id: string, expectedVersion: number, encrypted: boolean): void {
    this.id(id); if (typeof encrypted !== 'boolean') throw new LibraryError('INVALID_INPUT');
    if (this.sessions.size) throw new LibraryError('NOTE_IN_USE');
    const note = this.read(id); if (note.version !== expectedVersion) throw new LibraryError('VERSION_CONFLICT');
    this.scanRecovery(); if (this.pendingRecovery || this.issues.size) throw new LibraryError('INTEGRITY_CHECK_FAILED');
    for (const head of this.revisionHeads(id)) { const revision = this.readHead(head); for (const item of revision.attachments ?? []) this.checkedAttachment(id, item).fill(0); }
    this.index?.close(); this.index = null; this.clearDiskIndex();
    try { this.security.convert(id, encrypted); } finally { this.rebuild(); this.scanRecovery(); this.events.emit('change', { noteId: '', version: 0, indexed: this.indexed }); }
  }
  assertSecurityIdle(): void { if (this.sessions.size) throw new LibraryError('NOTE_IN_USE'); }
  encryptedNotes(): import('../shared/security').EncryptedNote[] {
    if (!this.security.unlocked) throw new LibraryError('NOTEBOOK_LOCKED');
    const folders = this.organization().folders;
    return this.security.encryptedIds().map(id => {
      const note = this.read(id), names: string[] = []; let folder = folders.find(item => item.id === note.folderId);
      for (let depth = 0; folder && depth < 16; depth++) { names.unshift(folder.name); folder = folders.find(item => item.id === folder!.parentId); }
      return { id, title: note.title, version: note.version, folder: names.join(' / '), deleted: !!note.deletedAt };
    });
  }
  setVisibility(id: string, expectedVersion: number, visible: boolean): SaveResult {
    this.id(id); if (typeof visible !== 'boolean') throw new LibraryError('INVALID_INPUT');
    if (this.sessions.has(id)) throw new LibraryError('NOTE_IN_USE');
    const note = this.read(id); if (note.version !== expectedVersion) throw new LibraryError('VERSION_CONFLICT');
    return this.commit({ ...note, visibleInThunderbird: visible }, note, randomUUID(), digest(JSON.stringify([id, expectedVersion, visible])));
  }
  /** This facade is the only note-reading surface intended for future addon transports. */
  addon() {
    const allowed = (id: string) => { try { const note = this.read(id); if (note.deletedAt || note.visibleInThunderbird === false) throw new LibraryError('NOT_FOUND_OR_UNAVAILABLE'); return note; } catch { throw new LibraryError('NOT_FOUND_OR_UNAVAILABLE'); } };
    return {
      read: (id: string) => { try { return allowed(id); } catch { throw new LibraryError('NOT_FOUND_OR_UNAVAILABLE'); } },
      query: (input: NoteQuery = {}) => this.query(input, true),
      attachment: (id: string, attachment: string) => { allowed(id); return this.attachmentBytes(id, attachment); },
      onChange: (listener: (change: { invalidated: true }) => void) => this.onChange(() => listener({ invalidated: true }))
    };
  }
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
    return JSON.parse(this.text(path, basename(path) === 'metadata.json' ? maxNoteMetadataBytes : 128 * 1024)) as unknown;
  }
  private text(path: string, max: number): string {
    if (!this.security) { if (statSync(path).size > max) throw new LibraryError('INTEGRITY_CHECK_FAILED'); return readFileSync(path, 'utf8'); }
    const bytes = this.security.read(path, max); try { return bytes.toString('utf8'); } finally { bytes.fill(0); }
  }
  private durable(path: string, text: string): void {
    const fd = openSync(path, 'wx');
    try { writeFileSync(fd, text, 'utf8'); fsyncSync(fd); } finally { closeSync(fd); }
  }
  private atomic(path: string, text: string): void {
    const temporary = join(dirname(path), `.pending-${randomUUID()}`);
    this.durable(temporary, text);
    renameWithRetry(temporary, path);
  }
  private head(id: string): Head {
    this.id(id);
    const path = this.safe('notes', id, 'head.json');
    if (!existsSync(path)) throw new LibraryError('NOT_FOUND_OR_UNAVAILABLE');
    const head = this.json(path) as Head;
    if (head.formatVersion !== 1 || head.id !== id || !uuid.test(head.revisionId) || !Number.isSafeInteger(head.version) || head.version < 1 || !/^[a-f0-9]{64}$/.test(head.metadataHash)) throw new LibraryError('INTEGRITY_CHECK_FAILED');
    return head;
  }
  read(id: string): NoteDocument {
    this.id(id); if (this.security.encrypted(id) && !this.security.unlocked) throw new LibraryError('NOTEBOOK_LOCKED');
    try { return this.readHead(this.head(id)); }
    catch (error) { if (error instanceof LibraryError && error.code === 'INTEGRITY_CHECK_FAILED') this.issues.add(`DAMAGED_NOTE:${id}`); throw error; }
  }
  private readHead(head: Head): NoteDocument;
  private readHead(head: Head, metadataOnly: boolean): CatalogNote;
  private readHead(head: Head, metadataOnly = false): CatalogNote {
    try {
      this.id(head.id); this.id(head.revisionId);
      const metaPath = this.safe('notes', head.id, 'revisions', head.revisionId, 'metadata.json');
      const text = this.text(metaPath, maxNoteMetadataBytes);
      const meta = JSON.parse(text) as Metadata;
      if (digest(text) !== head.metadataHash || meta.schemaVersion !== 1 || meta.id !== head.id || meta.revisionId !== head.revisionId || meta.version !== head.version || !Object.hasOwn(formatExtensions, meta.primaryFormat)) throw new Error();
      if (meta.attachments !== undefined) validateAttachments(meta.attachments);
      if (meta.generatedSummary !== undefined) { if (this.manifest.schemaVersion < 8) throw new Error(); validateSummary(meta.generatedSummary); }
      if (meta.generatedTranslation !== undefined) { if (this.manifest.schemaVersion < 9) throw new Error(); validateTranslation(meta.generatedTranslation); }
      if(meta.taskSource!==undefined){if(this.manifest.schemaVersion<10)throw Error();validateTaskSource(meta.taskSource);}
      this.validateContent(meta.title, ''); this.validatePlacement(meta, false);
      if (!Number.isSafeInteger(meta.contentVersion) || meta.contentVersion < 1 || !uuid.test(meta.operationId) || (meta.parentRevisionId !== null && !uuid.test(meta.parentRevisionId))) throw new Error();
      if (meta.contentVersion > meta.version || !Number.isFinite(Date.parse(meta.createdAt)) || !Number.isFinite(Date.parse(meta.updatedAt)) || (meta.deletedAt !== null && !Number.isFinite(Date.parse(meta.deletedAt))) || (meta.version === 1) !== (meta.parentRevisionId === null)) throw new Error();
      if (!/^[a-f0-9]{64}$/.test(meta.bodyHash) || (meta.primaryFormat === 'delta' && this.manifest.schemaVersion < 5)) throw new Error();
      const bodyPath = this.safe('notes', head.id, 'revisions', head.revisionId, `content.${formatExtensions[meta.primaryFormat]}`);
      let body: string | undefined;
      if (metadataOnly) { if (!statSync(bodyPath).isFile()) throw new Error(); }
      else {
        body = this.text(bodyPath, maxBody);
        if (digest(body) !== meta.bodyHash) throw new Error();
        if (meta.primaryFormat === 'delta') parseDelta(body);
      }
      return { encrypted: this.security.encrypted(meta.id), visibleInThunderbird: meta.visibleInThunderbird !== false, id: meta.id, title: meta.title, version: meta.version, contentVersion: meta.contentVersion, createdAt: meta.createdAt, updatedAt: meta.updatedAt, deletedAt: meta.deletedAt, primaryFormat: meta.primaryFormat, revisionId: meta.revisionId, ...(body !== undefined ? { body } : {}), folderId: meta.folderId, tagIds: meta.tagIds, pinned: meta.pinned, ...(meta.attachments ? { attachments: meta.attachments } : {}), ...(meta.generatedSummary ? { generatedSummary: meta.generatedSummary } : {}), ...(meta.generatedTranslation ? { generatedTranslation: meta.generatedTranslation } : {}), ...(meta.taskSource ? {taskSource:meta.taskSource} : {}) };
    } catch (error) { if (error instanceof LibraryError && error.code === 'NOTEBOOK_LOCKED') throw error; throw new LibraryError('INTEGRITY_CHECK_FAILED'); }
  }
  private documents(metadataOnly = false): CatalogNote[] {
    const notes: CatalogNote[] = [];
    const ids = readdirSync(this.safe('notes')); let processed = 0, lastProgress = 0;
    this.progress({ phase: 'notes', processed: 0, total: ids.length });
    for (const id of ids) {
      try {
      if (!uuid.test(id)) { this.issues.add('UNRECOGNIZED_NOTE_DIRECTORY'); continue; }
      if (!existsSync(this.safe('notes', id, 'head.json'))) continue;
      if (this.security.encrypted(id) && !this.security.unlocked) continue;
      try { notes.push(this.readHead(this.head(id), metadataOnly)); } catch { this.issues.add(`DAMAGED_NOTE:${id}`); }
      } finally {
        processed++; const now = performance.now();
        if (now - lastProgress >= 40 || processed === ids.length) { this.progress({ phase: 'notes', processed, total: ids.length }); lastProgress = now; }
      }
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
      if (tag.thunderbird) { this.id(tag.thunderbird.profileId); if (typeof tag.thunderbird.key !== 'string' || !tag.thunderbird.key || tag.thunderbird.key.length > 128 || /[\x00-\x1f]/.test(tag.thunderbird.key) || typeof tag.thunderbird.missing !== 'boolean') throw new LibraryError('INVALID_INPUT'); }
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
      const row = { ...next.tags.find(item => item.id === input.id), id: input.id, name: input.name.trim(), color: input.color ?? '#7460c9' };
      const index = next.tags.findIndex(item => item.id === input.id);
      if (index < 0) next.tags.push(row); else next.tags[index] = row;
    }
    next.version++; this.validateStructure(next);
    this.enableOrganization(); this.fault?.('organization');
    this.atomic(this.safe('organization.json'), JSON.stringify(next)); this.structure = next;
    return this.organization();
  }
  mapThunderbirdTags(profileId: unknown, tags: unknown, expectedVersion: unknown): { mapped: number; retained: number; version: number } {
    if (typeof profileId !== 'string') throw new LibraryError('INVALID_INPUT'); this.id(profileId);
    if (expectedVersion !== this.structure.version) throw new LibraryError('VERSION_CONFLICT');
    if (!Array.isArray(tags) || tags.length > 500) throw new LibraryError('INVALID_INPUT');
    const keys = new Set<string>();
    for (const tag of tags) {
      if (!tag || typeof tag.key !== 'string' || !tag.key || tag.key.length > 128 || /[\x00-\x1f]/.test(tag.key) || keys.has(tag.key) || typeof tag.name !== 'string' || !tag.name.trim() || tag.name.length > 80 || /[\x00-\x1f]/.test(tag.name) || typeof tag.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(tag.color)) throw new LibraryError('INVALID_INPUT');
      keys.add(tag.key);
    }
    const next = this.organization(); let retained = 0;
    for (const row of next.tags) if (row.thunderbird?.profileId === profileId) { row.thunderbird.missing = !keys.has(row.thunderbird.key); if (row.thunderbird.missing) retained++; }
    for (const tag of tags) {
      let row = next.tags.find(t => t.thunderbird?.profileId === profileId && t.thunderbird.key === tag.key);
      let name = tag.name.trim(), suffix = 1;
      const taken = (value: string) => next.tags.some(t => t.id !== row?.id && t.name.normalize('NFKC').toLowerCase() === value.normalize('NFKC').toLowerCase());
      while (taken(name)) name = tag.name.trim().slice(0, 58) + ' (Thunderbird ' + suffix++ + ')';
      if (!row) { row = { id: randomUUID(), name, color: tag.color, thunderbird: { profileId, key: tag.key, missing: false } }; next.tags.push(row); }
      else { row.name = name; row.color = tag.color; row.thunderbird!.missing = false; }
    }
    next.version++; this.validateStructure(next); this.enableOrganization(); this.fault?.('organization');
    this.atomic(this.safe('organization.json'), JSON.stringify(next)); this.structure = next;
    this.events.emit('change', { noteId: '', version: 0, indexed: this.indexed });
    return { mapped: tags.length, retained, version: next.version };
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
  query(input: NoteQuery = {}, addon = false): { notes: NoteSummary[]; total: number } {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new LibraryError('INVALID_INPUT');
    const { text = '', tagIds = [], view = 'all', offset = 0, limit = 50 } = input;
    const { keywords, matchMode = 'AND' } = input;
    if (input.includeDescendants !== undefined && typeof input.includeDescendants !== 'boolean') throw new LibraryError('INVALID_INPUT');
    if ((keywords !== undefined && (!Array.isArray(keywords) || keywords.length > 8 || keywords.some(term => typeof term !== 'string' || term.length > 300))) || !['AND', 'OR'].includes(matchMode)) throw new LibraryError('INVALID_INPUT');
    if (typeof text !== 'string' || text.length > 300 || !Array.isArray(tagIds) || tagIds.length > 100 || !['all', 'pinned', 'recent', 'trash'].includes(view) || !Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new LibraryError('INVALID_INPUT');
    for (const id of tagIds) this.id(id);
    const folders = new Set<string | null>();
    if (input.folderId !== undefined) {
      if (input.folderId !== null) this.id(input.folderId);
      folders.add(input.folderId);
      if (input.folderId !== null && input.includeDescendants !== false) for (let i = 0; i < 16; i++) for (const folder of this.structure.folders) if (folders.has(folder.parentId)) folders.add(folder.id);
    }
    const terms = keywords === undefined ? text.normalize('NFKC').toLowerCase().trim().split(/\s+/).filter(Boolean) : keywords.map(term => term.normalize('NFKC').toLowerCase().trim()).filter(Boolean);
    const rows = [...this.catalog.values()].filter(note => {
      if (addon && (note.visibleInThunderbird === false || note.deletedAt)) return false;
      if ((view === 'trash' ? !note.deletedAt : !!note.deletedAt) || (folders.size && !folders.has(note.folderId)) || !tagIds.every(id => note.tagIds.includes(id)) || (view === 'pinned' && !note.pinned) || (view === 'recent' && !this.recent[note.id])) return false;
      if (!terms.length) return true;
      if (note.body === undefined) { const loaded = this.read(note.id); this.validatePlacement(loaded); Object.assign(note, loaded); }
      const content = `${note.title}\n${note.primaryFormat === 'delta' ? deltaText(note.body!) : note.body}`.normalize('NFKC').toLowerCase();
      return matchMode === 'OR' ? terms.some(term => content.includes(term)) : terms.every(term => content.includes(term));
    });
    rows.sort((a, b) => view === 'trash' ? b.deletedAt!.localeCompare(a.deletedAt!) || a.id.localeCompare(b.id) : view === 'recent' ? this.recent[b.id].localeCompare(this.recent[a.id]) || a.id.localeCompare(b.id) : Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
    return { total: rows.length, notes: rows.slice(offset, offset + limit).map(({ body: _body, revisionId: _revision, generatedSummary: _generated, generatedTranslation: _translation, taskSource: _taskSource, ...summary }) => ({ ...summary, tagIds: [...summary.tagIds] })) };
  }
  list(): NoteSummary[] {
    // The single-writer catalog is rebuilt on open, import, restore and security changes.
    return [...this.catalog.values()].filter(note => !note.deletedAt).map(({ body: _body, revisionId: _revision, generatedSummary: _generated, generatedTranslation: _translation, taskSource: _taskSource, ...summary }) => structuredClone(summary))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
  }
  rebuild(): LibraryStatus {
    this.index?.close(); this.index = null; this.indexed = false; this.issues.clear();
    const notes = this.documents(this.startupActive);
    this.catalog.clear(); for (const note of notes) this.catalog.set(note.id, note);
    const path = this.safe('index', 'catalog.sqlite');
    if (this.security.configured) this.clearDiskIndex();
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        this.index = new DatabaseSync(this.security.configured ? ':memory:' : path);
        if (this.security.configured) this.index.exec('PRAGMA temp_store=MEMORY');
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
  private indexNote(note: NoteSummary): void {
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
    this.catalog.set(note.id, note);
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
    if (journal.schemaVersion !== 1 || journal.operationId !== id || (journal.requestHash !== undefined && journal.requestHash !== requestHash)) throw new LibraryError('INVALID_INPUT');
    this.id(journal.head.id); this.id(journal.head.revisionId);
    if (!existsSync(this.safe('notes', journal.head.id, 'head.json'))) return null;
    const floor = this.historyFloor(journal.head.id);
    if (floor && journal.head.version < floor.firstVersion) throw new LibraryError('INVALID_INPUT');
    let revision: string | null = this.head(journal.head.id).revisionId;
    const visited = new Set<string>();
    while (revision) {
      this.id(revision);
      if (visited.has(revision)) throw new LibraryError('INTEGRITY_CHECK_FAILED');
      visited.add(revision);
      if (revision === journal.head.revisionId) {
        const metadata = this.json(this.safe('notes', journal.head.id, 'revisions', revision, 'metadata.json')) as Metadata;
        if (metadata.operationId !== id || metadata.requestHash !== requestHash) throw new LibraryError('INVALID_INPUT');
        return { note: this.readHead(journal.head), saved: true, indexed: this.indexed };
      }
      const metadata = this.json(this.safe('notes', journal.head.id, 'revisions', revision, 'metadata.json')) as Metadata;
      revision = floor?.firstRevisionId === revision ? null : metadata.parentRevisionId;
    }
    return null;
  }
  create(operationId: string, input?: NoteInput, taskSource?: TaskSource): SaveResult {
    this.id(operationId);
    if (input !== undefined && (!input || typeof input !== 'object' || !Object.hasOwn(formatExtensions, input.primaryFormat))) throw new LibraryError('INVALID_INPUT');
    if(taskSource!==undefined){try{validateTaskSource(taskSource);}catch{throw new LibraryError('INVALID_INPUT');}if(this.manifest.schemaVersion<10)throw new LibraryError('VERSION_CONFLICT');}
    const initial = input ?? { title: 'Untitled', body: '', primaryFormat: 'text' as const };
    this.validateContent(initial.title, initial.body);
    if (initial.primaryFormat === 'delta') validateNative(initial.body, initial.nativeAttachments);
    else if (initial.nativeAttachments) throw new LibraryError('INVALID_INPUT');
    const placement: NotePlacement = { folderId: initial.folderId ?? null, tagIds: [], pinned: false }; this.validatePlacement(placement);
    if (placement.folderId) this.enableOrganization();
    const hash = digest(input === undefined ? 'create' : JSON.stringify(['create', initial.primaryFormat, initial.title, initial.body, ...(initial.nativeAttachments ? [initial.nativeAttachments.map(({data,...item}) => item)] : []), ...(placement.folderId ? [placement.folderId] : []), ...(taskSource ? [taskSource] : [])]));
    const replay = this.operation(operationId, hash); if (replay) return replay;
    const now = new Date().toISOString(), id = randomUUID();
    let attachments;
    if (initial.primaryFormat === 'delta') {
      this.enableDelta();
      attachments = (initial.nativeAttachments ?? []).map(({ data, ...item }) => item);
      if (attachments.length) {
        const directory = this.safe('notes', id, 'attachments'); mkdirSync(directory, { recursive: true });
        for (const item of initial.nativeAttachments!) { const fd = openSync(this.safe('notes', id, 'attachments', item.id), 'wx'); try { writeFileSync(fd, Buffer.from(item.data, 'base64')); fsyncSync(fd); } finally { closeSync(fd); } }
      }
    }
    return this.commit({ ...(attachments ? { attachments } : {}), ...(taskSource?{taskSource}:{}), id, revisionId: '', title: initial.title, body: initial.body, primaryFormat: initial.primaryFormat, version: 0, contentVersion: 0, createdAt: now, updatedAt: now, deletedAt: null, ...placement }, null, operationId, hash);
  }
  duplicate(request:import('../shared/attachments').AttachmentRequest,owner:string,title:string):SaveResult {
    const current=this.attachmentSession(request,owner);this.validateContent(title,current.body);
    const hash=digest(JSON.stringify(['duplicate',request.noteId,request.expectedVersion,title]));
    const replay=this.operation(request.operationId,hash);if(replay)return replay;
    if(current.deletedAt||current.version!==request.expectedVersion)throw new LibraryError('VERSION_CONFLICT');
    for(const item of current.attachments??[])this.checkedAttachment(current.id,item).fill(0);
    const id=randomUUID(),directory=this.safe('notes',id),now=new Date().toISOString();mkdirSync(directory);
    try {
      if(current.encrypted)this.security.initializeEncryptedNote(id);
      if(current.attachments?.length){mkdirSync(this.safe('notes',id,'attachments'));for(const item of current.attachments){const bytes=this.checkedAttachment(current.id,item);try{const fd=openSync(this.safe('notes',id,'attachments',item.id),'wx');try{writeFileSync(fd,this.security.encode(bytes,`notes/${id}/attachments/${item.id}`,!!current.encrypted));fsyncSync(fd);}finally{closeSync(fd);}}finally{bytes.fill(0);}}}
      const {generatedSummary,generatedTranslation,...source}=current;
      return this.commit({...source,id,title,revisionId:'',version:0,contentVersion:0,createdAt:now,updatedAt:now,pinned:false},null,request.operationId,hash);
    }catch(error){if(!existsSync(this.safe('recovery',request.operationId+'.json'))&&!existsSync(this.safe('notes',id,'head.json'))){this.plainTree(directory);rmSync(directory,{recursive:true});}throw error;}
  }
  enableTaskSources(): void {
    if(this.manifest.schemaVersion>=10)return;
    this.fault?.('schema');this.atomic(this.safe('library.json'),JSON.stringify({...this.manifest,schemaVersion:10}));this.manifest.schemaVersion=10;
  }
  migrateTaskSource(id:string,expectedVersion:number,source:TaskSource,legacyBody:string,body:string,operationId:string,owner?:string):SaveResult {
    this.id(id);this.id(operationId);try{validateTaskSource(source);}catch{throw new LibraryError('INVALID_INPUT');}
    const current=this.read(id);if(this.sessions.has(id)&&this.sessions.get(id)!.owner!==owner)throw new LibraryError('NOTE_IN_USE');
    if(current.version!==expectedVersion||current.taskSource||current.deletedAt||current.primaryFormat!=='text'||current.body!==legacyBody||this.manifest.schemaVersion<10)throw new LibraryError('VERSION_CONFLICT');
    return this.commit({...current,body,taskSource:source},current,operationId,digest(JSON.stringify(['task-source',id,expectedVersion,source,body])));
  }
  assertNotesAvailable(ids:string[]):void {for(const id of ids){this.id(id);if(this.sessions.has(id))throw new LibraryError('NOTE_IN_USE');}}
  save(request: SaveRequest, owner: string): SaveResult {
    if (!request || typeof request !== 'object') throw new LibraryError('INVALID_INPUT');
    this.id(request.noteId); this.id(request.operationId); this.validateContent(request.title, request.body);
    const session = this.sessions.get(request.noteId);
    if (!session || session.owner !== owner || session.token !== request.token || session.generation !== request.generation) throw new LibraryError('SESSION_EXPIRED');
    const hash = digest(JSON.stringify([request.noteId, request.expectedVersion, request.title, request.body]));
    const replay = this.operation(request.operationId, hash); if (replay) return replay;
    const current = this.read(request.noteId);
    if (current.version !== request.expectedVersion) throw new LibraryError('VERSION_CONFLICT');
    if (current.primaryFormat === 'delta') parseDelta(request.body);
    return this.commit({ ...current, title: request.title, body: request.body }, current, request.operationId, hash);
  }
  writingSnapshot(request: AttachmentRequest, owner: string): NoteDocument {
    const note = this.attachmentSession(request, owner);
    if (note.deletedAt) throw new LibraryError('NOT_FOUND_OR_UNAVAILABLE');
    if (note.version !== request.expectedVersion) throw new LibraryError('VERSION_CONFLICT');
    return note;
  }
  saveSummary(request: AttachmentRequest, owner: string, summary: GeneratedSummary): SaveResult {
    const note = this.attachmentSession(request, owner); validateSummary(summary);
    const hash = digest(JSON.stringify(['summary', request.noteId, request.expectedVersion, summary]));
    const replay = this.operation(request.operationId, hash); if (replay) return replay;
    if (note.deletedAt || note.version !== request.expectedVersion || this.manifest.schemaVersion < 8 || summary.sourceContentVersion !== note.contentVersion || summary.sourceRevisionId !== note.revisionId) throw new LibraryError('VERSION_CONFLICT');
    return this.commit({ ...note, generatedSummary: summary }, note, request.operationId, hash);
  }
  saveTranslation(request:AttachmentRequest,owner:string,translation:GeneratedTranslation):SaveResult{
    const note=this.attachmentSession(request,owner);validateTranslation(translation);
    const hash=digest(JSON.stringify(['translation',request.noteId,request.expectedVersion,translation]));
    const replay=this.operation(request.operationId,hash);if(replay)return replay;
    if(note.deletedAt||note.version!==request.expectedVersion||this.manifest.schemaVersion<9||translation.sourceContentVersion!==note.contentVersion||translation.sourceRevisionId!==note.revisionId)throw new LibraryError('VERSION_CONFLICT');
    return this.commit({...note,generatedTranslation:translation},note,request.operationId,hash);
  }
  private enableDelta(): void {
    if (this.manifest.schemaVersion >= 5) return;
    const backup = join(dirname(this.path), basename(this.path) + '.delta-backups', randomUUID());
    copyTree(this.path, backup);
    this.atomic(this.safe('library.json'), JSON.stringify({ ...this.manifest, schemaVersion: 5 }));
    this.manifest.schemaVersion = 5;
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
    return this.checkedAttachment(noteId, item);
  }
  private checkedAttachment(noteId: string, item: import('../shared/attachments').Attachment): Buffer {
    const bytes = this.security.read(this.safe('notes', noteId, 'attachments', item.id), 20 * 1024 * 1024);
    if (bytes.length !== item.size || attachmentHash(bytes) !== item.sha256) { bytes.fill(0); throw new LibraryError('INTEGRITY_CHECK_FAILED'); }
    return bytes;
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
    try { writeFileSync(fd, this.security.encode(bytes, `notes/${current.id}/attachments/${item.id}`, this.security.encrypted(current.id))); fsyncSync(fd); } finally { closeSync(fd); }
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
    if (current.deletedAt) throw new LibraryError('INVALID_INPUT');
    return this.commit({ ...current, deletedAt: new Date().toISOString() }, current, operationId, hash);
  }
  private historyFloor(id: string): { schemaVersion: 1; firstVersion: number; firstRevisionId: string; pending: boolean; operationId?: string; removed?: number; requestHash?: string } | null {
    const file = this.safe('notes', id, 'history.json'); if (!existsSync(file)) return null;
    const value = this.json(file) as { schemaVersion: 1; firstVersion: number; firstRevisionId: string; pending: boolean; operationId?: string; removed?: number; requestHash?: string };
    const head = this.head(id);
    if (this.manifest.schemaVersion < 6 || value.schemaVersion !== 1 || !Number.isSafeInteger(value.firstVersion) || value.firstVersion < 1 || value.firstVersion > head.version || !uuid.test(value.firstRevisionId) || typeof value.pending !== 'boolean' || (value.operationId !== undefined && (!uuid.test(value.operationId) || !/^[a-f0-9]{64}$/.test(value.requestHash ?? '') || !Number.isSafeInteger(value.removed) || value.removed! < 0)) || (value.pending && !value.operationId)) throw new LibraryError('INTEGRITY_CHECK_FAILED');
    return value;
  }
  private recoverHistoryCleanup(): void {
    for (const id of readdirSync(this.safe('notes'))) if (uuid.test(id) && (!this.security.encrypted(id) || this.security.unlocked) && existsSync(this.safe('notes', id, 'head.json')) && this.historyFloor(id)?.pending) this.finishHistoryCleanup(id);
  }
  private finishHistoryCleanup(id: string): void {
    const floor = this.historyFloor(id); if (!floor?.pending) return;
    // Validate the retained chain before removing any old content.
    for (const head of this.revisionHeads(id)) this.readHead(head);
    const trash = this.safe('notes', id, 'history-trash');
    if (existsSync(trash)) { this.plainTree(trash); rmSync(trash, { recursive: true }); }
    mkdirSync(trash);
    for (const revision of readdirSync(this.safe('notes', id, 'revisions'))) {
      this.id(revision);
      const root = this.safe('notes', id, 'revisions', revision);
      const meta = this.json(this.safe('notes', id, 'revisions', revision, 'metadata.json')) as Metadata;
      if (meta.id !== id || meta.revisionId !== revision || !Number.isSafeInteger(meta.version) || meta.version < 1) throw new LibraryError('INTEGRITY_CHECK_FAILED');
      if (meta.version < floor.firstVersion) { this.plainTree(root); const removed = join(trash, revision); renameSync(root, removed); this.fault?.('history-pruned'); rmSync(removed, { recursive: true }); }
    }
    rmSync(trash, { recursive: true });
    this.atomic(this.safe('notes', id, 'history.json'), JSON.stringify({ ...floor, pending: false }));
  }
  cleanHistory(id: string, expectedVersion: number, retain: number, operationId: string): number {
    this.id(id); this.id(operationId);
    if (!Number.isSafeInteger(retain) || retain < 1) throw new LibraryError('INVALID_INPUT');
    if (this.sessions.has(id)) throw new LibraryError('NOTE_IN_USE');
    const floor = this.historyFloor(id);
    const requestHash = digest(JSON.stringify([expectedVersion, retain]));
    if (floor?.operationId === operationId) { if (floor.requestHash !== requestHash) throw new LibraryError('INVALID_INPUT'); this.finishHistoryCleanup(id); return floor.removed!; }
    if (floor?.pending) throw new LibraryError('LIBRARY_IN_USE');
    const current = this.read(id); if (current.version !== expectedVersion) throw new LibraryError('VERSION_CONFLICT');
    const heads = this.revisionHeads(id); if (heads.length <= retain) return 0;
    for (const head of heads) this.readHead(head);
    for (const head of heads.slice(retain)) this.plainTree(this.safe('notes', id, 'revisions', head.revisionId));
    this.enableLifecycle();
    const first = heads[retain - 1], removed = heads.length - retain;
    this.atomic(this.safe('notes', id, 'history.json'), JSON.stringify({ schemaVersion: 1, firstVersion: first.version, firstRevisionId: first.revisionId, pending: true, operationId, removed, requestHash })); this.fault?.('history-floor');
    this.finishHistoryCleanup(id); this.scanRecovery(); return removed;
  }
  private revisionHeads(id: string): Head[] {
    const current = this.head(id), floor = this.historyFloor(id), result: Head[] = [], visited = new Set<string>();
    let revision: string | null = current.revisionId, version = current.version;
    while (revision) {
      this.id(revision);
      if (visited.has(revision)) throw new LibraryError('INTEGRITY_CHECK_FAILED');
      visited.add(revision);
      const file = this.safe('notes', id, 'revisions', revision, 'metadata.json');
      const raw = this.text(file, maxNoteMetadataBytes);
      if (Buffer.byteLength(raw) > maxNoteMetadataBytes) throw new LibraryError('INTEGRITY_CHECK_FAILED');
      const meta = JSON.parse(raw) as Metadata;
      if (meta.id !== id || meta.revisionId !== revision || meta.version !== version || (version === current.version && digest(raw) !== current.metadataHash)) throw new LibraryError('INTEGRITY_CHECK_FAILED');
      result.push({ formatVersion: 1, id, revisionId: revision, version, metadataHash: digest(raw) });
      if (floor && version === floor.firstVersion) { if (revision !== floor.firstRevisionId) throw new LibraryError('INTEGRITY_CHECK_FAILED'); version--; break; }
      revision = meta.parentRevisionId; version--;
    }
    if (version !== (floor ? floor.firstVersion - 1 : 0)) throw new LibraryError('INTEGRITY_CHECK_FAILED');
    return result;
  }
  history(id: string, offset = 0) {
    if (!Number.isSafeInteger(offset) || offset < 0) throw new LibraryError('INVALID_INPUT');
    const heads = this.revisionHeads(id);
    return { total: heads.length, revisions: heads.slice(offset, offset + 20).map(head => {
      const { body, attachments, generatedSummary, generatedTranslation, taskSource, ...note } = this.readHead(head);
      return { ...note, attachmentCount: attachments?.length ?? 0 };
    }) };
  }
  revision(id: string, revision: string): NoteDocument {
    this.id(revision);
    const head = this.revisionHeads(id).find(row => row.revisionId === revision);
    if (!head) throw new LibraryError('NOT_FOUND_OR_UNAVAILABLE');
    return this.readHead(head);
  }
  restore(id: string, expectedVersion: number, operationId: string, revision?: string): SaveResult {
    this.id(id); this.id(operationId);
    if (this.sessions.has(id)) throw new LibraryError('NOTE_IN_USE');
    const hash = digest(JSON.stringify(['restore', id, expectedVersion, revision ?? null]));
    const replay = this.operation(operationId, hash); if (replay) return replay;
    const current = this.read(id);
    if (current.version !== expectedVersion) throw new LibraryError('VERSION_CONFLICT');
    if ((revision && current.deletedAt) || (!revision && !current.deletedAt)) throw new LibraryError('INVALID_INPUT');
    const source = revision ? this.revision(id, revision) : current;
    // Verify resources before committing a restoration; missing files never become a successful restore.
    for (const item of source.attachments ?? []) this.checkedAttachment(id, item).fill(0);
    return this.commit({ ...current, title: source.title, body: source.body, primaryFormat: source.primaryFormat, attachments: source.attachments, generatedSummary: source.generatedSummary, generatedTranslation:source.generatedTranslation, taskSource:source.taskSource, deletedAt: null }, current, operationId, hash);
  }
  deleteOrganization(kind: 'folder' | 'tag', id: string, expectedVersion: number): Organization {
    this.id(id);
    if (!['folder', 'tag'].includes(kind)) throw new LibraryError('INVALID_INPUT');
    if (expectedVersion !== this.structure.version) throw new LibraryError('VERSION_CONFLICT');
    if (!this.security.unlocked && this.security.encryptedIds().length) throw new LibraryError('NOTEBOOK_LOCKED');
    const next = this.organization();
    if (!(kind === 'folder' ? next.folders : next.tags).some(row => row.id === id)) throw new LibraryError('NOT_FOUND_OR_UNAVAILABLE');
    if ((kind === 'folder' && next.folders.some(row => row.parentId === id)) || [...this.catalog.values()].some(note => kind === 'folder' ? note.folderId === id : note.tagIds.includes(id))) throw new LibraryError('NOTE_IN_USE');
    if (kind === 'folder') next.folders = next.folders.filter(row => row.id !== id); else next.tags = next.tags.filter(row => row.id !== id);
    this.enableLifecycle();
    next.version++; this.validateStructure(next); this.fault?.('organization');
    this.atomic(this.safe('organization.json'), JSON.stringify(next)); this.structure = next;
    return this.organization();
  }
  private enableLifecycle(): void {
    if (this.manifest.schemaVersion >= 6) return;
    const backup = join(dirname(this.path), basename(this.path) + '.lifecycle-backups', randomUUID());
    copyTree(this.path, backup);
    this.atomic(this.safe('library.json'), JSON.stringify({ ...this.manifest, schemaVersion: 6 }));
    this.manifest.schemaVersion = 6;
  }
  private plainTree(path: string): void {
    if (lstatSync(path).isSymbolicLink()) throw new LibraryError('INVALID_INPUT');
    if (lstatSync(path).isDirectory()) for (const name of readdirSync(path)) this.plainTree(join(path, name));
  }
  private taskReceipts():TasksLedger|null {
    const path=this.safe('tasks-imports.json');if(!existsSync(path))return null;
    try{const value=JSON.parse(this.text(path,4*1024*1024));validateTasksLedger(value,this.libraryId);return value;}catch{throw new LibraryError('INTEGRITY_CHECK_FAILED');}
  }
  private removeTaskReceipts(noteId:string):void {
    const ledger=this.taskReceipts();if(!ledger)return;const rows=ledger.rows.filter(row=>row.noteId!==noteId);if(rows.length===ledger.rows.length)return;
    this.atomic(this.safe('tasks-imports.json'),JSON.stringify({...ledger,rows}));
  }
  private finishPurge(operationId: string): void {
    this.id(operationId);
    const file = this.safe('purges', operationId + '.json');
    const receipt = this.json(file) as { id: string; version: number; operationId: string; done: boolean };
    this.id(receipt.id);
    if (receipt.operationId !== operationId || !Number.isSafeInteger(receipt.version) || receipt.version < 1 || typeof receipt.done !== 'boolean') throw new LibraryError('INTEGRITY_CHECK_FAILED');
    if(receipt.done)return;
    const source = this.safe('notes', receipt.id), target = this.safe('purges', operationId);
    if (existsSync(source)) {
      const note = this.read(receipt.id);
      if (note.version !== receipt.version || !note.deletedAt || existsSync(target)) throw new LibraryError('VERSION_CONFLICT');
      this.plainTree(source); renameSync(source, target); this.fault?.('purge-moved');
    }
    if (existsSync(target)) { this.plainTree(target); rmSync(target, { recursive: true }); }
    for (const name of readdirSync(this.safe('recovery'))) {
      if (!/^[a-f0-9-]+\.json$/i.test(name)) continue;
      const path = this.safe('recovery', name), journal = this.json(path) as Journal;
      if (journal.head?.id === receipt.id) {
        this.id(journal.head.revisionId);
        const stage = this.safe('recovery', 'stage-' + journal.head.revisionId);
        if (existsSync(stage)) { this.plainTree(stage); rmSync(stage, { recursive: true }); }
        unlinkSync(path);
      }
    }
    const recent = { ...this.recent }; delete recent[receipt.id];
    this.atomic(this.safe('recent.json'), JSON.stringify(recent)); this.recent = recent;
    this.catalog.delete(receipt.id);
    try { this.index?.prepare('DELETE FROM notes WHERE id = ?').run(receipt.id); } catch { this.indexed = false; this.issues.add('INDEX_REBUILD_REQUIRED'); }
    this.removeTaskReceipts(receipt.id);
    this.atomic(file, JSON.stringify({ ...receipt, done: true }));
  }
  private recoverPurges(): void {
    const path = this.safe('purges'); if (!existsSync(path)) return;
    for (const name of readdirSync(path)) if (/^[a-f0-9-]+\.json$/i.test(name)) {
      const receipt = this.json(this.safe('purges', name)) as { id: string };
      this.id(receipt.id);
      if (this.security.encrypted(receipt.id) && !this.security.unlocked) continue;
      this.finishPurge(name.slice(0, -5));
    }
  }
  purge(id: string, expectedVersion: number, operationId: string): void {
    this.taskReceipts();
    this.id(id); this.id(operationId);
    if (this.sessions.has(id)) throw new LibraryError('NOTE_IN_USE');
    mkdirSync(this.safe('purges'), { recursive: true });
    const file = this.safe('purges', operationId + '.json');
    if (existsSync(file)) {
      const receipt = this.json(file) as { id: string; version: number };
      if (receipt.id !== id || receipt.version !== expectedVersion) throw new LibraryError('INVALID_INPUT');
    } else {
      const current = this.read(id);
      if (!current.deletedAt) throw new LibraryError('INVALID_INPUT');
      if (current.version !== expectedVersion) throw new LibraryError('VERSION_CONFLICT');
      this.plainTree(this.safe('notes', id));
      this.atomic(file, JSON.stringify({ id, version: expectedVersion, operationId, done: false })); this.fault?.('purge-journal');
    }
    this.finishPurge(operationId);
  }
  private commit(input: NoteDocument, previous: NoteDocument | null, operationId: string, requestHash: string): SaveResult {
    const note: NoteDocument = { ...input, encrypted: this.security.encrypted(input.id), visibleInThunderbird: input.visibleInThunderbird !== false, revisionId: randomUUID(), version: input.version + 1, contentVersion: previous ? previous.contentVersion + Number(previous.body !== input.body) : 1, updatedAt: new Date().toISOString() };
    const { body, ...fields } = note;
    const meta: Metadata = { ...fields, schemaVersion: 1, parentRevisionId: previous?.revisionId ?? null, bodyHash: digest(body), operationId, requestHash, visibleInThunderbird: input.visibleInThunderbird !== false };
    const text = JSON.stringify(meta);
    if(Buffer.byteLength(text)>maxNoteMetadataBytes)throw new LibraryError('INVALID_INPUT');
    const head: Head = { formatVersion: 1, id: note.id, revisionId: note.revisionId, version: note.version, metadataHash: digest(text) };
    let committed = false;
    try {
      const staging = this.safe('recovery', `stage-${note.revisionId}`); mkdirSync(staging);
      for (const [name, value] of [['metadata.json', text], [`content.${formatExtensions[note.primaryFormat]}`, body]]) {
        const fd = openSync(join(staging, name), 'wx');
        try { writeFileSync(fd, this.security.encode(Buffer.from(value), `notes/${note.id}/revisions/${note.revisionId}/${name}`, this.security.encrypted(note.id))); fsyncSync(fd); } finally { closeSync(fd); }
      }
      this.atomic(this.safe('recovery', `${operationId}.json`), JSON.stringify({ schemaVersion: 1, operationId, ...(!note.encrypted ? { requestHash } : {}), head } satisfies Journal));
      this.fault?.('journal');
      mkdirSync(this.safe('notes', note.id, 'revisions'), { recursive: true });
      renameWithRetry(staging, this.safe('notes', note.id, 'revisions', note.revisionId));
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
    // A scan is synchronous: each validated floor remains unchanged throughout it.
    const floors = new Map<string, ReturnType<NoteLibrary['historyFloor']>>();
    const floorFor = (id: string) => {
      if (!floors.has(id)) floors.set(id, existsSync(this.safe('notes', id, 'head.json')) ? this.historyFloor(id) : null);
      return floors.get(id)!;
    };
    for (const note of this.catalog.values()) {
      const floor = floorFor(note.id);
      let revision: string | null = note.revisionId;
      const visited = new Set<string>();
      try {
        while (revision) {
          this.id(revision);
          if (visited.has(revision)) throw new Error('Revision cycle');
          visited.add(revision); committed.add(`${note.id}/${revision}`);
          const metadata = this.json(this.safe('notes', note.id, 'revisions', revision, 'metadata.json')) as Metadata;
          revision = floor?.firstRevisionId === revision ? null : metadata.parentRevisionId;
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
        const floor = floorFor(journal.head.id);
        if (this.security.encrypted(journal.head.id) && !this.security.unlocked) continue;
        if (!committed.has(`${journal.head.id}/${journal.head.revisionId}`) && !(floor && journal.head.version < floor.firstVersion)) this.pendingRecovery++;
      } catch { this.issues.add('RECOVERY_RECORD_DAMAGED'); }
    }
    for (const id of readdirSync(this.safe('notes'))) if (uuid.test(id) && !existsSync(this.safe('notes', id, 'head.json'))) this.pendingRecovery++;
  }
}
