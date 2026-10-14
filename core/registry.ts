import { constants, copyFileSync, existsSync, readFileSync, writeFileSync, renameSync, openSync, closeSync, fsyncSync, unlinkSync, statSync, lstatSync, realpathSync } from 'node:fs';
import { basename, isAbsolute, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { NoteLibrary, LibraryError, type CommitStage } from './library';
import type { LibraryErrorCode } from '../shared/library';
import type { LibraryEntry, RegistryState } from '../shared/registry';
import { copyNotebook, createBackup, restoreBackup, pathsOverlap as pathsOverlapLocal } from './backups';
import type { MaintenanceAction } from '../shared/backup';
import { readAppearance } from './notebook-appearance';
import { defaultNotebookAppearance } from '../shared/notebook-appearance';
import { restoreGuardPath } from './restore-guard';
import { plainPath } from './library-import';
import type { StartupProgress } from '../shared/startup';

interface Config { schemaVersion: 1; activeId: string | null; entries: LibraryEntry[]; }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pathKey = (path: string) => resolve(path).toLowerCase();
function valid(value: unknown, code: LibraryErrorCode = 'INVALID_INPUT'): asserts value { if (!value) throw new LibraryError(code); }
function readJson(file: string): any { valid(statSync(file).size <= 1024 * 1024, 'INTEGRITY_CHECK_FAILED'); return JSON.parse(readFileSync(file, 'utf8')); }

export function inspectLibrary(directory: string): { path: string; libraryId: string; schemaVersion: number } {
  try {
    valid(typeof directory === 'string' && isAbsolute(directory));
    valid(!lstatSync(directory).isSymbolicLink());
    const path = realpathSync(directory);
    const manifest = join(path, 'library.json');
    valid(!lstatSync(manifest).isSymbolicLink());
    const value = readJson(manifest);
    valid(value && [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].includes(value.schemaVersion), 'UNSUPPORTED_LIBRARY');
    valid(typeof value.libraryId === 'string' && uuid.test(value.libraryId), 'INTEGRITY_CHECK_FAILED');
    return { path, libraryId: value.libraryId, schemaVersion: value.schemaVersion };
  } catch (error) {
    if (error instanceof LibraryError) throw error;
    throw new LibraryError(error instanceof SyntaxError ? 'INTEGRITY_CHECK_FAILED' : 'NOT_FOUND_OR_UNAVAILABLE');
  }
}

export class LibraryRegistry {
  private config!: Config;
  private library: NoteLibrary | null = null;
  private currentId: string | null = null;
  private readonly file: string;
  constructor(private readonly dataPath: string, defaultPath: string, private readonly fault?: (stage: CommitStage | 'registry') => void, private readonly startupObserver?: (progress: StartupProgress) => void) {
    this.file = join(dataPath, 'libraries.json');
    if (existsSync(this.file)) {
      try {
        const value = readJson(this.file);
        valid(value?.schemaVersion === 1 && Array.isArray(value.entries) && value.entries.length <= 1000);
        const ids = new Set<string>(); const paths = new Set<string>(); const libraryIds = new Set<string>();
        for (const item of value.entries) {
          valid(item && typeof item.id === 'string' && uuid.test(item.id) && !ids.has(item.id));
          valid(typeof item.name === 'string' && item.name.trim() && item.name.length <= 100 && !/[\x00-\x1f]/.test(item.name));
          valid(typeof item.path === 'string' && isAbsolute(item.path) && !paths.has(pathKey(item.path)));
          valid(item.libraryId === null || (typeof item.libraryId === 'string' && uuid.test(item.libraryId) && !libraryIds.has(item.libraryId)));
          valid(item.lastOpenedAt === null || (typeof item.lastOpenedAt === 'string' && Number.isFinite(Date.parse(item.lastOpenedAt))));
          ids.add(item.id); paths.add(pathKey(item.path)); if (item.libraryId) libraryIds.add(item.libraryId);
        }
        valid(value.activeId === null || ids.has(value.activeId)); this.config = value;
      } catch { throw new LibraryError('REGISTRY_INVALID'); }
    } else {
      const legacy = join(dataPath, 'library-location.json'); let directory = defaultPath;
      if (existsSync(legacy)) {
        try {
          const value = readJson(legacy); valid(typeof value?.path === 'string' && isAbsolute(value.path)); directory = value.path;
          if (!existsSync(legacy + '.t03b-backup')) copyFileSync(legacy, legacy + '.t03b-backup', constants.COPYFILE_EXCL);
        } catch { throw new LibraryError('REGISTRY_INVALID'); }
      } else if (!existsSync(defaultPath)) {
        const initial = new NoteLibrary(defaultPath, undefined, 'create'); initial.close();
      }
      let libraryId: string | null = null;
      try { const inspected = inspectLibrary(directory); directory = inspected.path; libraryId = inspected.libraryId; } catch { /* Preserve an unavailable legacy path for recovery. */ }
      const entry = { id: randomUUID(), libraryId, name: basename(directory).slice(0, 100) || 'NotebookAid', path: resolve(directory), lastOpenedAt: null };
      this.persist({ schemaVersion: 1, activeId: entry.id, entries: [entry] });
    }
  }
  private persist(next: Config): void {
    const temporary = this.file + '.' + randomUUID() + '.tmp';
    try {
      this.fault?.('registry');
      const fd = openSync(temporary, 'wx');
      try { writeFileSync(fd, JSON.stringify(next)); fsyncSync(fd); } finally { closeSync(fd); }
      renameSync(temporary, this.file); this.config = next;
    } catch { throw new LibraryError('WRITE_FAILED'); }
    finally { if (existsSync(temporary)) { try { unlinkSync(temporary); } catch { /* Preserve failure evidence if cleanup is unavailable. */ } } }
  }
  private entry(id: unknown): LibraryEntry { valid(typeof id === 'string'); const item = this.config.entries.find(entry => entry.id === id); valid(item, 'NOT_FOUND_OR_UNAVAILABLE'); return item; }
  private checkDuplicate(path: string, libraryId: string, except?: string): void {
    valid(!this.config.entries.some(item => item.id !== except && (pathKey(item.path) === pathKey(path) || item.libraryId === libraryId)), 'DUPLICATE_LIBRARY');
  }
  get(): NoteLibrary {
    if (!this.library) { valid(this.config.activeId, 'NOT_FOUND_OR_UNAVAILABLE'); this.activate(this.config.activeId); }
    return this.library!;
  }
  currentName(): string { return this.config.entries.find(entry => entry.id === this.currentId)?.name ?? 'NotebookAid'; }
  upgrade(id: string, expected: number): import('../shared/library').LibraryUpgradeResult {
    const entry = this.entry(id), inspected = inspectLibrary(entry.path);
    valid(!entry.libraryId || entry.libraryId === inspected.libraryId, 'LIBRARY_ID_MISMATCH');
    if (id === this.currentId) return this.get().upgradeSchema(expected);
    const library = new NoteLibrary(entry.path, this.fault, 'existing');
    try { return library.upgradeSchema(expected); } finally { library.close(); }
  }
  maintenance(id: string, action: MaintenanceAction, target?: string, backup?: string): unknown {
    if (action === 'restore') {
      const entry = this.entry(id); valid(target && backup && entry.libraryId);
      if (id === this.currentId) this.library?.assertMaintenance(true);
      if (pathKey(target) === pathKey(entry.path)) return this.restoreOriginal(entry, backup);
      valid(!this.config.entries.some(item => pathsOverlapLocal(target, item.path)), 'PATH_OVERLAP');
      restoreBackup(backup, target, entry.libraryId);
      const next = new NoteLibrary(target, this.fault, 'existing');
      try { next.verifyIntegrity(); this.checkDuplicate(next.path, next.libraryId, id); this.persist({ ...this.config, entries: this.config.entries.map(item => item.id === id ? { ...item, path: next.path } : item) }); }
      catch (error) { next.close(); throw error; }
      if (id === this.currentId) { this.library?.close(); this.library = next; } else next.close();
      return { path: target, previousPath: existsSync(entry.path) ? entry.path : undefined };
    }
    const entry = this.entry(id), inspected = inspectLibrary(entry.path);
    valid(entry.libraryId === inspected.libraryId, 'LIBRARY_ID_MISMATCH');
    const current = id === this.currentId, source = current ? this.get() : new NoteLibrary(entry.path, this.fault, 'existing');
    try {
      if (action === 'verify') return source.verifyIntegrity();
      if (action === 'backup') { valid(target); source.verifyIntegrity(); return createBackup(source.path, target); }
      valid(action === 'migrate'); valid(target); source.assertMaintenance();
      source.verifyIntegrity(); copyNotebook(source.path, target);
      const next = new NoteLibrary(target, this.fault, 'existing');
      try {
        next.verifyIntegrity(); this.checkDuplicate(next.path, next.libraryId, entry.id);
        this.persist({ ...this.config, entries: this.config.entries.map(item => item.id === id ? { ...item, path: next.path } : item) });
      } catch (error) { next.close(); throw error; }
      if (current) { source.close(); this.library = next; } else next.close();
      return { path: target, previousPath: entry.path };
    } finally { if (!current) source.close(); }
  }
  private restoreOriginal(entry: LibraryEntry, backup: string): unknown {
    const target = resolve(entry.path), token = randomUUID(), staging = target + '.restore-staging-' + token, rollback = target + '.restore-rollback-' + token;
    const guard = restoreGuardPath(target);
    const retained = () => ({ targetPath: target, ...(existsSync(rollback) ? { rollbackPath: rollback } : {}), ...(existsSync(staging) ? { stagingPath: staging } : {}) });
    plainPath(target); plainPath(backup); plainPath(staging); plainPath(rollback); plainPath(guard); plainPath(guard + '.sqlite');
    valid(!pathsOverlapLocal(target, backup) && !this.config.entries.some(item => item.id !== entry.id && pathsOverlapLocal(target, item.path)), 'PATH_OVERLAP');
    valid(existsSync(target) && lstatSync(target).isDirectory(), 'RESTORE_TARGET_INVALID');
    valid(!existsSync(guard), 'RESTORE_INTERRUPTED');
    const gate = new DatabaseSync(guard + '.sqlite'); let writer: DatabaseSync | null = null, moved = false, installed = false, closed = false, ownedGuard = false, replacement: NoteLibrary | null = null;
    const current = entry.id === this.currentId;
    const saveGuard = (phase: string) => {
      const temporary = guard + '.' + randomUUID() + '.pending', fd = openSync(temporary, 'wx');
      try {
        try { writeFileSync(fd, JSON.stringify({ format: 'NotebookAidRestore', version: 1, token, target, staging, rollback, libraryId: entry.libraryId, phase })); fsyncSync(fd); } finally { closeSync(fd); }
        if (phase === 'preparing') valid(!existsSync(guard), 'RESTORE_INTERRUPTED');
        renameSync(temporary, guard); ownedGuard = true;
      } finally { if (existsSync(temporary)) unlinkSync(temporary); }
    };
    try {
      try { gate.exec('PRAGMA busy_timeout=0; BEGIN EXCLUSIVE'); } catch { throw new LibraryError('LIBRARY_IN_USE'); }
      if (!current) {
        plainPath(join(target, '.writer.sqlite')); writer = new DatabaseSync(join(target, '.writer.sqlite'));
        try { writer.exec('PRAGMA busy_timeout=0; BEGIN EXCLUSIVE'); } catch { throw new LibraryError('LIBRARY_IN_USE'); }
      }
      saveGuard('preparing');
      restoreBackup(backup, staging, entry.libraryId!);
      const probe = new NoteLibrary(staging, this.fault, 'existing');
      try { probe.verifyIntegrity(); } finally { probe.close(); }
      this.fault?.('restore-prepared'); saveGuard('prepared');
      if (current) { this.library!.close(); this.library = null; closed = true; } else { writer!.close(); writer = null; }
      renameSync(target, rollback); moved = true; saveGuard('original-moved'); this.fault?.('restore-original-moved');
      renameSync(staging, target); installed = true; saveGuard('replacement-moved'); this.fault?.('restore-replacement-moved');
      replacement = new NoteLibrary(target, this.fault, 'existing', token); replacement.verifyIntegrity(); this.fault?.('restore-verified');
      saveGuard('verified'); unlinkSync(guard);
      if (current) { this.library = replacement; replacement = null; } else { replacement.close(); replacement = null; }
      return { path: target, previousPath: rollback };
    } catch (error) {
      replacement?.close(); replacement = null;
      if (moved) {
        try {
          this.fault?.('restore-rollback');
          if (installed) { plainPath(target); plainPath(staging); valid(!existsSync(staging)); renameSync(target, staging); }
          plainPath(rollback); plainPath(target); valid(!existsSync(target)); renameSync(rollback, target);
          if (existsSync(guard)) unlinkSync(guard);
          if (current && closed) { try { this.library = new NoteLibrary(target, this.fault, 'existing'); } catch { this.library = null; } }
        } catch { throw new LibraryError('RESTORE_ROLLBACK_FAILED', retained()); }
        throw new LibraryError('RESTORE_FAILED_ROLLED_BACK', retained());
      }
      if (ownedGuard && existsSync(guard)) unlinkSync(guard);
      if (current && closed) this.library = new NoteLibrary(target, this.fault, 'existing');
      if (error instanceof LibraryError) throw error;
      const native = (error as NodeJS.ErrnoException)?.code;
      throw new LibraryError(native === 'ENOSPC' ? 'DISK_FULL' : ['EACCES','EPERM'].includes(native ?? '') ? 'ACCESS_DENIED' : 'WRITE_FAILED', retained());
    } finally { writer?.close(); gate.close(); }
  }
  private recoverRestore(entry: LibraryEntry): void {
    const target = resolve(entry.path), guard = restoreGuardPath(target);
    if (!existsSync(guard)) return;
    plainPath(guard); plainPath(guard + '.sqlite');
    const gate = new DatabaseSync(guard + '.sqlite');
    try {
      try { gate.exec('PRAGMA busy_timeout=0; BEGIN EXCLUSIVE'); } catch { throw new LibraryError('LIBRARY_IN_USE'); }
      valid(lstatSync(guard).isFile() && statSync(guard).size <= 8192, 'RESTORE_INTERRUPTED');
      let value: any; try { value = JSON.parse(readFileSync(guard, 'utf8')); } catch { throw new LibraryError('RESTORE_INTERRUPTED'); }
      valid(value?.format === 'NotebookAidRestore' && value.version === 1 && typeof value.token === 'string' && uuid.test(value.token) && value.libraryId === entry.libraryId && value.target === target && value.staging === target + '.restore-staging-' + value.token && value.rollback === target + '.restore-rollback-' + value.token && ['preparing','prepared','original-moved','replacement-moved','verified'].includes(value.phase), 'RESTORE_INTERRUPTED');
      const details = { targetPath: target, stagingPath: value.staging, rollbackPath: value.rollback };
      plainPath(target); plainPath(value.staging); plainPath(value.rollback);
      try {
        if (value.phase === 'verified') {
          const restored = new NoteLibrary(target, this.fault, 'existing', value.token);
          try { valid(restored.libraryId === entry.libraryId); restored.verifyIntegrity(); } finally { restored.close(); }
        } else if (existsSync(value.rollback)) {
          if (existsSync(target)) { valid(!existsSync(value.staging)); renameSync(target, value.staging); }
          renameSync(value.rollback, target);
        } else { valid(existsSync(target) && inspectLibrary(target).libraryId === entry.libraryId); }
        unlinkSync(guard);
      } catch { throw new LibraryError('RESTORE_ROLLBACK_FAILED', details); }
    } finally { gate.close(); }
  }
  state(): RegistryState {
    return { activeId: this.currentId, entries: this.config.entries.map(entry => {
      let availability: 'available' | LibraryErrorCode = 'available';
      let schemaVersion: number | null = null;
      let appearance = defaultNotebookAppearance(), appearanceIssue = false;
      try {
        const inspected = inspectLibrary(entry.path);
        valid(!entry.libraryId || inspected.libraryId === entry.libraryId, 'LIBRARY_ID_MISMATCH');
        schemaVersion = inspected.schemaVersion;
        try { appearance = readAppearance(inspected.path); } catch { appearanceIssue = true; }
        if (entry.id !== this.currentId) {
          const lockPath = join(inspected.path, '.writer.sqlite');
          if (existsSync(lockPath)) {
            valid(!lstatSync(lockPath).isSymbolicLink());
            const probe = new DatabaseSync(lockPath);
            try { probe.exec('PRAGMA busy_timeout=0; BEGIN EXCLUSIVE; ROLLBACK'); }
            catch { throw new LibraryError('LIBRARY_IN_USE'); }
            finally { probe.close(); }
          }
        }
      } catch (error) { availability = error instanceof LibraryError ? error.code : 'NOT_FOUND_OR_UNAVAILABLE'; }
      return { ...entry, appearance, appearanceIssue, schemaVersion, availability, current: entry.id === this.currentId };
    }) };
  }
  activate(id: unknown) {
    const entry = this.entry(id);
    if (entry.id === this.currentId && this.library) return this.library.status();
    this.recoverRestore(entry);
    const inspected = inspectLibrary(entry.path);
    valid(!entry.libraryId || inspected.libraryId === entry.libraryId, 'LIBRARY_ID_MISMATCH');
    this.checkDuplicate(inspected.path, inspected.libraryId, entry.id);
    const next = new NoteLibrary(inspected.path, this.fault, 'existing', undefined, this.startupObserver);
    try {
      valid(next.libraryId === inspected.libraryId, 'LIBRARY_ID_MISMATCH');
      this.persist({ ...this.config, activeId: entry.id, entries: this.config.entries.map(item => item.id === entry.id ? { ...item, path: inspected.path, libraryId: inspected.libraryId, lastOpenedAt: new Date().toISOString() } : item) });
    } catch (error) { next.close(); throw error; }
    this.library?.close(); this.library = next; this.currentId = entry.id;
    return next.status();
  }
  add(directory: string, mode: 'existing' | 'create'): RegistryState {
    valid(mode === 'existing' || mode === 'create'); valid(typeof directory === 'string' && isAbsolute(directory));
    valid(this.config.entries.length < 1000);
    valid(!this.config.entries.some(item => pathKey(item.path) === pathKey(directory)), 'DUPLICATE_LIBRARY');
    if (existsSync(directory)) valid(!lstatSync(directory).isSymbolicLink());
    let inspected: { path: string; libraryId: string };
    if (mode === 'create') {
      const created = new NoteLibrary(directory, undefined, 'create');
      inspected = { path: created.path, libraryId: created.libraryId }; created.close();
    } else inspected = inspectLibrary(directory);
    this.checkDuplicate(inspected.path, inspected.libraryId);
    this.persist({ ...this.config, entries: [...this.config.entries, { id: randomUUID(), path: inspected.path, libraryId: inspected.libraryId, name: basename(inspected.path).slice(0, 100) || 'NotebookAid', lastOpenedAt: null }] });
    return this.state();
  }
  rename(id: unknown, name: unknown): RegistryState {
    const entry = this.entry(id); valid(typeof name === 'string' && name.trim() && name.trim().length <= 100 && !/[\x00-\x1f]/.test(name));
    this.persist({ ...this.config, entries: this.config.entries.map(item => item.id === entry.id ? { ...item, name: name.trim() } : item) }); return this.state();
  }
  setAppearance(id: unknown, value: unknown): RegistryState {
    const entry = this.entry(id), inspected = inspectLibrary(entry.path);
    valid(entry.libraryId === inspected.libraryId, 'LIBRARY_ID_MISMATCH');
    const current = entry.id === this.currentId, library = current ? this.get() : new NoteLibrary(inspected.path, this.fault, 'existing');
    try { library.setAppearance(value); } finally { if (!current) library.close(); }
    return this.state();
  }
  relocate(id: unknown, directory: string): RegistryState {
    const entry = this.entry(id); valid(entry.id !== this.currentId, 'CURRENT_LIBRARY');
    valid(entry.libraryId, 'LIBRARY_ID_MISMATCH');
    const inspected = inspectLibrary(directory); valid(inspected.libraryId === entry.libraryId, 'LIBRARY_ID_MISMATCH');
    this.checkDuplicate(inspected.path, inspected.libraryId, entry.id);
    this.persist({ ...this.config, entries: this.config.entries.map(item => item.id === entry.id ? { ...item, path: inspected.path, libraryId: inspected.libraryId } : item) }); return this.state();
  }
  remove(id: unknown): RegistryState {
    const entry = this.entry(id); valid(entry.id !== this.currentId, 'CURRENT_LIBRARY');
    this.persist({ ...this.config, activeId: this.config.activeId === id ? null : this.config.activeId, entries: this.config.entries.filter(item => item.id !== id) }); return this.state();
  }
  release(owner: string): void { this.library?.releaseOwner(owner); }
  has(id: unknown): boolean { return typeof id === 'string' && this.config.entries.some(item => item.id === id); }
  close(): void { this.library?.close(); this.library = null; this.currentId = null; }
}
