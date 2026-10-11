import { constants, copyFileSync, existsSync, readFileSync, writeFileSync, renameSync, openSync, closeSync, fsyncSync, unlinkSync, statSync, lstatSync, realpathSync } from 'node:fs';
import { basename, isAbsolute, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { NoteLibrary, LibraryError, type CommitStage } from './library';
import type { LibraryErrorCode } from '../shared/library';
import type { LibraryEntry, RegistryState } from '../shared/registry';

interface Config { schemaVersion: 1; activeId: string | null; entries: LibraryEntry[]; }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pathKey = (path: string) => resolve(path).toLowerCase();
function valid(value: unknown, code: LibraryErrorCode = 'INVALID_INPUT'): asserts value { if (!value) throw new LibraryError(code); }
function readJson(file: string): any { valid(statSync(file).size <= 1024 * 1024, 'INTEGRITY_CHECK_FAILED'); return JSON.parse(readFileSync(file, 'utf8')); }

export function inspectLibrary(directory: string): { path: string; libraryId: string } {
  try {
    valid(typeof directory === 'string' && isAbsolute(directory));
    valid(!lstatSync(directory).isSymbolicLink());
    const path = realpathSync(directory);
    const manifest = join(path, 'library.json');
    valid(!lstatSync(manifest).isSymbolicLink());
    const value = readJson(manifest);
    valid(value && [1, 2, 3].includes(value.schemaVersion), 'UNSUPPORTED_LIBRARY');
    valid(typeof value.libraryId === 'string' && uuid.test(value.libraryId), 'INTEGRITY_CHECK_FAILED');
    return { path, libraryId: value.libraryId };
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
  constructor(private readonly dataPath: string, defaultPath: string, private readonly fault?: (stage: CommitStage | 'registry') => void) {
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
  state(): RegistryState {
    return { activeId: this.currentId, entries: this.config.entries.map(entry => {
      let availability: 'available' | LibraryErrorCode = 'available';
      try {
        const inspected = inspectLibrary(entry.path);
        valid(!entry.libraryId || inspected.libraryId === entry.libraryId, 'LIBRARY_ID_MISMATCH');
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
      return { ...entry, availability, current: entry.id === this.currentId };
    }) };
  }
  activate(id: unknown) {
    const entry = this.entry(id);
    if (entry.id === this.currentId && this.library) return this.library.status();
    const inspected = inspectLibrary(entry.path);
    valid(!entry.libraryId || inspected.libraryId === entry.libraryId, 'LIBRARY_ID_MISMATCH');
    this.checkDuplicate(inspected.path, inspected.libraryId, entry.id);
    const next = new NoteLibrary(inspected.path, this.fault, 'existing');
    try {
      valid(next.libraryId === inspected.libraryId, 'LIBRARY_ID_MISMATCH');
      this.persist({ ...this.config, activeId: entry.id, entries: this.config.entries.map(item => item.id === entry.id ? { ...item, ...inspected, lastOpenedAt: new Date().toISOString() } : item) });
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
    this.persist({ ...this.config, entries: [...this.config.entries, { id: randomUUID(), ...inspected, name: basename(inspected.path).slice(0, 100) || 'NotebookAid', lastOpenedAt: null }] });
    return this.state();
  }
  rename(id: unknown, name: unknown): RegistryState {
    const entry = this.entry(id); valid(typeof name === 'string' && name.trim() && name.trim().length <= 100 && !/[\x00-\x1f]/.test(name));
    this.persist({ ...this.config, entries: this.config.entries.map(item => item.id === entry.id ? { ...item, name: name.trim() } : item) }); return this.state();
  }
  relocate(id: unknown, directory: string): RegistryState {
    const entry = this.entry(id); valid(entry.id !== this.currentId, 'CURRENT_LIBRARY');
    valid(entry.libraryId, 'LIBRARY_ID_MISMATCH');
    const inspected = inspectLibrary(directory); valid(inspected.libraryId === entry.libraryId, 'LIBRARY_ID_MISMATCH');
    this.checkDuplicate(inspected.path, inspected.libraryId, entry.id);
    this.persist({ ...this.config, entries: this.config.entries.map(item => item.id === entry.id ? { ...item, ...inspected } : item) }); return this.state();
  }
  remove(id: unknown): RegistryState {
    const entry = this.entry(id); valid(entry.id !== this.currentId, 'CURRENT_LIBRARY');
    this.persist({ ...this.config, activeId: this.config.activeId === id ? null : this.config.activeId, entries: this.config.entries.filter(item => item.id !== id) }); return this.state();
  }
  release(owner: string): void { this.library?.releaseOwner(owner); }
  has(id: unknown): boolean { return typeof id === 'string' && this.config.entries.some(item => item.id === id); }
  close(): void { this.library?.close(); this.library = null; this.currentId = null; }
}
