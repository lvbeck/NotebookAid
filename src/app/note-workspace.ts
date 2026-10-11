import { Injectable, signal, inject, computed, effect, untracked } from '@angular/core';
import type { EditSession, LibraryErrorCode, LibraryStatus, NoteInput, NoteSummary, Result, SaveRequest } from '../../shared/library';
import { Preferences } from './preferences';
import { effectiveAutosave } from '../../shared/settings';
import { NotificationService } from './notification-service';
import { notificationErrorCodes, type NotificationCode, type NotificationOperation } from '../../shared/notifications';
import type { RegistryState } from '../../shared/registry';
import type { Organization, OrganizationEditInput, NotePlacement, NoteQuery, PlacementRequest } from '../../shared/organization';

@Injectable({ providedIn: 'root' })
export class NoteWorkspace {
  readonly organization = signal<Organization>({ schemaVersion: 1, version: 0, folders: [], tags: [] });
  readonly query = signal<NoteQuery>({ view: 'all', offset: 0, limit: 30 });
  readonly results = signal<NoteSummary[]>([]);
  readonly total = signal(0);
  readonly searching = signal(false);
  readonly organizationBusy = signal(false);
  readonly organizationError = signal('');
  readonly sortedTags = computed(() => [...this.organization().tags].sort((a, b) => a.name.localeCompare(b.name, this.preferences.locale(), { sensitivity: 'base', numeric: true }) || a.id.localeCompare(b.id)));
  private queryEpoch = 0;
  private searchTimer?: ReturnType<typeof setTimeout>;
  private pendingPlacement: PlacementRequest | null = null;
  private placementInflight: Promise<boolean> | null = null;
  readonly folderRows = computed(() => {
    const rows: { id: string; name: string; depth: number; path: string }[] = [];
    const visit = (parent: string | null, depth: number, path: string) => {
      for (const folder of this.organization().folders.filter(item => item.parentId === parent).sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name))) {
        const full = path ? `${path} / ${folder.name}` : folder.name;
        rows.push({ ...folder, depth, path: full }); visit(folder.id, depth + 1, full);
      }
    };
    visit(null, 0, ''); return rows;
  });
  folderPath(id: string | null): string { return this.folderRows().find(item => item.id === id)?.path ?? ''; }
  filter(patch: NoteQuery, debounce = false): void {
    this.query.update(value => ({ ...value, ...patch, offset: patch.offset ?? 0 }));
    this.queryEpoch++; clearTimeout(this.searchTimer);
    if (debounce) this.searchTimer = setTimeout(() => void this.search(), 200); else void this.search();
  }
  async search(): Promise<void> {
    const epoch = ++this.queryEpoch; this.searching.set(true);
    try {
      const result = await this.api.query(this.query());
      if (epoch !== this.queryEpoch) return;
      if (result.ok) {
        if ((this.query().offset ?? 0) >= result.value.total && this.query().offset) { this.query.update(value => ({ ...value, offset: 0 })); await this.search(); return; }
        this.results.set(result.value.notes); this.total.set(result.value.total);
      }
      else { this.results.set([]); this.total.set(0); this.reportError(result.code, 'open'); }
    } catch { if (epoch === this.queryEpoch) this.reportError('NOT_FOUND_OR_UNAVAILABLE', 'open'); }
    finally { if (epoch === this.queryEpoch) this.searching.set(false); }
  }
  async editOrganization(input: OrganizationEditInput): Promise<boolean> {
    if (this.organizationBusy() || this.switching()) return false;
    this.organizationBusy.set(true); this.organizationError.set('');
    try {
      const result = await this.api.editOrganization({ ...input, expectedVersion: this.organization().version });
      if (!result.ok) { this.organizationError.set(result.code); return false; }
      this.organization.set(result.value); this.notify('saveSuccess', 'save'); await this.search(); return true;
    } catch { this.organizationError.set('WRITE_FAILED'); return false; }
    finally { this.organizationBusy.set(false); }
  }
  cancelOrganizationError(): void {
    if (this.organizationBusy()) return;
    this.organizationError.set('');
  }
  async place(patch: Partial<NotePlacement>): Promise<void> {
    if (this.switching() || this.organizationBusy() || !this.session()) return;
    this.switching.set(true);
    try {
      if (!await this.flush()) return;
      const session = this.session()!;
      this.pendingPlacement = { noteId: session.note.id, token: session.token, generation: session.generation, expectedVersion: session.note.version, operationId: crypto.randomUUID(), folderId: session.note.folderId, tagIds: session.note.tagIds, pinned: session.note.pinned, ...patch };
      await this.savePlacement();
    } catch { this.reportError('COMMIT_STATUS_UNKNOWN'); }
    finally { this.switching.set(false); }
  }
  private async savePlacement(): Promise<boolean> {
    if (this.placementInflight) return this.placementInflight;
    const request = this.pendingPlacement, session = this.session();
    if (!request || !session) return !request;
    this.placementInflight = (async () => {
      let result: Result<import('../../shared/library').SaveResult>;
      try { result = await this.api.place(request); }
      catch { this.reportError('COMMIT_STATUS_UNKNOWN'); return false; }
      if (!result.ok) {
        if (result.code !== 'COMMIT_STATUS_UNKNOWN') this.pendingPlacement = null;
        this.reportError(result.code); return false;
      }
      this.pendingPlacement = null; this.error.set(''); this.session.set({ ...session, note: result.value.note });
      const status = this.status(); if (status) this.status.set({ ...status, indexed: result.value.indexed });
      this.notify(result.value.indexed ? 'saveSuccess' : 'savedIndexPending', 'save'); await this.refresh(); return true;
    })();
    try { return await this.placementInflight; } finally { this.placementInflight = null; }
  }
  toggleTag(id: string): void {
    const tags = this.session()?.note.tagIds ?? [];
    void this.place({ tagIds: tags.includes(id) ? tags.filter(tag => tag !== id) : [...tags, id] });
  }
  readonly notes = signal<NoteSummary[]>([]);
  readonly title = signal('');
  readonly body = signal('');
  readonly session = signal<EditSession | null>(null);
  readonly status = signal<LibraryStatus | null>(null);
  readonly dirty = signal(false);
  readonly saving = signal(false);
  readonly switching = signal(false);
  readonly error = signal<LibraryErrorCode | ''>('');
  readonly opened = signal(0);
  readonly rebuilding = signal(false);
  readonly registry = signal<RegistryState>({ entries: [], activeId: null });
  readonly registryError = signal<LibraryErrorCode | ''>('');
  readonly libraryUnavailable = signal(false);
  private readonly notifications = inject(NotificationService);
  readonly preferences = inject(Preferences);
  readonly effectiveAutosave = computed(() => effectiveAutosave(this.preferences.state(), this.registry().activeId));
  readonly autosaveEnabled = computed(() => this.preferences.ready() && this.effectiveAutosave().enabled);
  readonly autosaveMinutes = computed(() => this.effectiveAutosave().minutes);
  private readonly autosaveContext = computed(() => `${this.registry().activeId}:${this.autosaveEnabled()}:${this.autosaveMinutes()}`);
  private timerEpoch = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private inflight: Promise<boolean> | null = null;
  private pending: SaveRequest | null = null;
  private createId: string | null = null;
  private createInput?: NoteInput;
  private composing = false;
  private readonly api = window.notebookAid.library;
  constructor() {
    effect(() => {
      this.autosaveContext();
      untracked(() => { this.cancelTimer(); this.schedule(); });
    });
    this.api.onExit(async () => { await this.preferences.idle(); const saved = await this.flush(); await this.notifications.idle(); return saved; });
  }
  private notify(message: NotificationCode, operation: NotificationOperation = 'settings'): void {
    void this.notifications.publish(message, operation, operation === 'settings' ? null : this.status()?.libraryId ?? null);
  }
  private noticeError(code: LibraryErrorCode): typeof notificationErrorCodes[number] {
    return notificationErrorCodes.includes(code as typeof notificationErrorCodes[number]) ? code as typeof notificationErrorCodes[number] : 'INVALID_INPUT';
  }
  private reportError(code: LibraryErrorCode, operation: NotificationOperation = 'save'): void {
    this.error.set(code); void this.notifications.publish('operationFailed', operation, this.status()?.libraryId ?? null, this.noticeError(code));
  }
  async manualSave(): Promise<void> {
    if (!this.session()) return;
    const libraryId = this.status()?.libraryId ?? null;
    const hadChanges = this.dirty();
    if (await this.flush()) {
      if (this.status()?.indexed !== false) void this.notifications.publish('saveSuccess', 'save', libraryId);
      else if (!hadChanges) this.notify('savedIndexPending', 'save');
    }
  }
  private cancelTimer(): void { this.timerEpoch++; clearTimeout(this.timer); this.timer = undefined; }
  async init(): Promise<void> {
    await this.preferences.initialized;
    const result = await this.api.status();
    await this.refreshRegistry();
    if (!result.ok) { this.registryError.set(result.code); this.libraryUnavailable.set(true); return; }
    this.status.set(result.value);
    await this.refresh();
    const first = this.notes()[0]; if (first) await this.select(first.id);
  }
  async refresh(): Promise<void> {
    const result = await this.api.list();
    if (result.ok) this.notes.set(result.value); else this.reportError(result.code, 'open');
    const organization = await this.api.organization();
    if (organization.ok) this.organization.set(organization.value); else this.reportError(organization.code, 'open');
    await this.search();
  }
  updateTitle(value: string): void { this.title.set(value); this.change(); }
  updateBody(value: string): void { this.body.set(value); this.change(); }
  setComposing(value: boolean): void { this.composing = value; if (!value) this.schedule(); }
  private change(): void {
    if (!this.session()) return;
    const note = this.session()!.note;
    this.dirty.set(!!this.pending || this.title() !== note.title || this.body() !== note.body);
    this.error.set('');
    if (!this.dirty()) this.cancelTimer(); else this.schedule();
  }
  private schedule(): void {
    if (this.timer !== undefined || !this.autosaveEnabled() || !this.dirty() || this.composing || this.pending) return;
    const generation = this.session()?.generation; const libraryId = this.status()?.libraryId; const epoch = this.timerEpoch;
    this.timer = setTimeout(() => { if (epoch !== this.timerEpoch) return; this.timer = undefined; if (!this.composing && generation === this.session()?.generation && libraryId === this.status()?.libraryId && this.autosaveEnabled()) void this.flush(); }, this.autosaveMinutes() * 60000);
  }
  async flush(): Promise<boolean> {
    this.cancelTimer();
    if (this.composing) return false;
    if (this.pendingPlacement && !await this.savePlacement()) return false;
    if (this.inflight) { await this.inflight; if (this.error()) return false; return this.flush(); }
    if (!this.dirty()) return true;
    const session = this.session(); if (!session) return false;
    const request = this.pending ?? { noteId: session.note.id, token: session.token, generation: session.generation, expectedVersion: session.note.version, operationId: crypto.randomUUID(), title: this.title(), body: this.body() };
    this.pending = request; this.saving.set(true); this.error.set('');
    this.inflight = (async () => {
      let result: Result<import('../../shared/library').SaveResult>;
      try { result = await this.api.save(request); }
      catch { this.reportError('COMMIT_STATUS_UNKNOWN'); return false; }
      if (!result.ok) {
        this.reportError(result.code);
        if (result.code !== 'COMMIT_STATUS_UNKNOWN') this.pending = null;
        return false;
      }
      this.pending = null;
      this.session.set({ ...session, note: result.value.note });
      this.dirty.set(this.title() !== request.title || this.body() !== request.body);
      if (!result.value.indexed) this.notify('savedIndexPending', 'save');
      const status = this.status(); if (status) this.status.set({ ...status, indexed: result.value.indexed });
      await this.refresh();
      return true;
    })();
    let success: boolean;
    try { success = await this.inflight; }
    finally { this.inflight = null; this.saving.set(false); }
    if (success && this.dirty()) return this.flush();
    return success;
  }
  async select(id: string): Promise<void> {
    if (this.switching() || id === this.session()?.note.id) return;
    this.switching.set(true);
    try {
      if (!await this.flush()) return;
      const result = await this.api.begin(id);
      if (!result.ok) { this.reportError(result.code, 'open'); return; }
      const previous = this.session();
      if (previous) await this.api.end(previous.token, previous.generation);
      this.session.set(result.value); this.title.set(result.value.note.title); this.body.set(result.value.note.body);
      this.dirty.set(false); this.pending = null; this.error.set(''); this.opened.update(value => value + 1);
      await this.search();
    } finally { this.switching.set(false); }
  }
  async importFile(): Promise<void> {
    if (this.switching()) return;
    this.switching.set(true);
    let input: NoteInput | null = null;
    try {
      if (!await this.flush()) return;
      const result = await this.api.importFile();
      if (!result.ok) { this.reportError(result.code, 'open'); return; }
      if (result.value) {
        const { removed, ...note } = result.value;
        input = note;
        if (removed) this.notify('htmlCleaned', 'open');
      }
    } catch { this.reportError('WRITE_FAILED', 'open'); }
    finally { this.switching.set(false); }
    if (input) await this.create({ ...input, folderId: this.query().folderId ?? null });
  }
  async create(input?: NoteInput): Promise<void> {
    if (this.switching()) return;
    this.switching.set(true);
    let id: string | null = null;
    try {
      if (!await this.flush()) return;
      if (!this.createId || JSON.stringify(input) !== JSON.stringify(this.createInput)) { this.createId = crypto.randomUUID(); this.createInput = input; }
      const result = await this.api.create(this.createId, this.createInput);
      if (!result.ok) { if (result.code !== 'CANCELLED') this.reportError(result.code, 'create'); return; }
      this.createId = null; id = result.value.note.id; await this.refresh(); this.notify('noteCreated', 'create');
    } finally { this.switching.set(false); }
    if (id) await this.select(id);
  }
  async refreshRegistry(): Promise<void> {
    const result = await this.api.registry();
    if (result.ok) this.registry.set(result.value); else this.registryError.set(result.code);
  }
  async manage(action: 'existing' | 'create' | 'rename' | 'remove' | 'relocate', id = '', name = ''): Promise<void> {
    if (this.switching() || this.rebuilding()) return;
    this.switching.set(true); this.registryError.set('');
    try {
      const result = action === 'existing' || action === 'create' ? await this.api.register(action) : action === 'rename' ? await this.api.rename(id, name) : action === 'remove' ? await this.api.remove(id) : await this.api.relocate(id);
      if (!result.ok) { this.registryError.set(result.code); void this.notifications.publish('operationFailed', 'open', null, this.noticeError(result.code)); return; }
      if (result.value) { this.registry.set(result.value); this.notify('settingsSaved'); }
    } catch { this.registryError.set('WRITE_FAILED'); }
    finally { this.switching.set(false); }
  }
  async activate(id: string): Promise<void> {
    if (this.switching() || this.rebuilding() || this.organizationBusy() || id === this.registry().activeId) return;
    this.switching.set(true);
    this.registryError.set('');
    try {
      if (!await this.flush()) return;
      const result = await this.api.activate(id);
      if (!result.ok) { this.registryError.set(result.code); void this.notifications.publish('operationFailed', 'open', this.registry().entries.find(item => item.id === id)?.libraryId ?? null, this.noticeError(result.code)); await this.refreshRegistry(); return; }
      this.status.set(result.value); this.notify('libraryOpened', 'open'); this.session.set(null); this.title.set(''); this.body.set('');
      clearTimeout(this.searchTimer); this.queryEpoch++; this.query.set({ view: 'all', offset: 0, limit: 30 }); this.results.set([]); this.total.set(0); this.organizationError.set('');
      this.pending = null; this.createId = null; this.error.set(''); this.dirty.set(false); this.libraryUnavailable.set(false); this.opened.update(value => value + 1);
      await this.refreshRegistry();
      await this.refresh();
    } catch { this.registryError.set('WRITE_FAILED'); }
    finally { this.switching.set(false); }
    const first = this.notes()[0]; if (first) await this.select(first.id);
  }
  async rebuild(): Promise<void> {
    if (this.rebuilding() || this.switching() || !this.status()) return;
    this.rebuilding.set(true);
    try {
      const result = await this.api.rebuild();
      if (result.ok) {
        this.status.set(result.value); this.error.set('');
        await this.refresh();
        this.notify(result.value.indexed && !result.value.issues.length && !result.value.pendingRecovery ? 'rebuildSuccess' : 'rebuildPartial', 'rebuild');
      } else { this.error.set(result.code); void this.notifications.publish('rebuildFailed', 'rebuild', this.status()?.libraryId ?? null, this.noticeError(result.code)); }
    } catch { this.notify('rebuildFailed', 'rebuild'); }
    finally { this.rebuilding.set(false); }
  }
}
