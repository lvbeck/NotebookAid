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
  async lifecycleAction(action: 'trash' | 'restore' | 'clean', revision?: string, retain = 50): Promise<boolean> {
    if (this.switching() || !this.session()) return false;
    this.switching.set(true);
    let reopen = '', success = false, endedSession = false;
    try {
      if (!await this.flush()) return false;
      const session = this.session()!; reopen = session.note.id;
      const ended = await this.api.end(session.token, session.generation);
      if (!ended.ok) { this.reportError(ended.code); return false; }
      endedSession = true;
      const result = action === 'trash'
        ? await this.api.trashNote(reopen, session.note.version, crypto.randomUUID())
        : action === 'clean' ? await this.api.cleanHistory(reopen, session.note.version, retain, crypto.randomUUID())
        : await this.api.restoreRevision(reopen, revision!, session.note.version, crypto.randomUUID());
      if (!result.ok) this.reportError(result.code);
      else if (result.value) { success = true; this.notify('lifecycleComplete', 'save'); if (action === 'clean') await this.refreshRegistry(); if (action === 'trash') reopen = ''; }
      await this.refresh();
    } catch { this.reportError('COMMIT_STATUS_UNKNOWN'); }
    finally {
      if (endedSession) { this.session.set(null); this.title.set(''); this.body.set(''); this.opened.update(value => value + 1); }
      this.switching.set(false);
      if (reopen) { const error = this.error(); await this.select(reopen); if (error) this.error.set(error); }
    }
    return success;
  }
  async deleteOrganization(kind: 'folder' | 'tag', id: string): Promise<boolean> {
    if (this.organizationBusy() || this.switching() || !await this.flush()) return false;
    this.organizationBusy.set(true); this.organizationError.set('');
    try {
      const result = await this.api.deleteOrganization(kind, id, this.organization().version);
      if (!result.ok) { this.organizationError.set(result.code); return false; }
      if (!result.value) return false;
      this.organization.set(result.value); this.notify('lifecycleComplete', 'save'); await this.refreshRegistry(); await this.refresh(); return true;
    } finally { this.organizationBusy.set(false); }
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
  readonly exitLocked = signal(false);
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
  private duplicatePending?:{request:import('../../shared/attachments').AttachmentRequest;title:string};
  private createInput?: NoteInput;
  private composing = false;
  private exitFocus: HTMLElement | null = null;
  private viewEpoch = 0;
  private readonly api = window.notebookAid.library;
  clearSensitiveView(): void {
    this.viewEpoch++;
    this.cancelTimer(); this.queryEpoch++; clearTimeout(this.searchTimer);
    this.session.set(null); this.title.set(''); this.body.set(''); this.notes.set([]); this.results.set([]); this.total.set(0);
    this.query.set({ view: 'all', offset: 0, limit: 30 }); this.pending = null; this.pendingPlacement = null;
    this.createInput = undefined; this.createId = null; this.dirty.set(false); this.opened.update(value => value + 1);
    this.duplicatePending=undefined;
  }
  async securityChange<T>(action: () => Promise<Result<T>>, reopen = true): Promise<Result<T> | null> {
    if (this.switching() || this.organizationBusy() || !await this.flush()) return null;
    this.switching.set(true); const session = this.session();
    let result: Result<T>;
    try {
      if (session) { const end = await this.api.end(session.token, session.generation); if (!end.ok) { this.reportError(end.code); return null; } }
      result = await action();
      this.clearSensitiveView();
      const status = await this.api.status(); if (status.ok) this.status.set(status.value);
      await this.refresh(); await this.refreshRegistry();
    } finally { this.switching.set(false); }
    if (reopen && session && this.notes().some(note => note.id === session.note.id)) await this.select(session.note.id);
    return result;
  }
  constructor() {
    window.notebookAid.onAddonChanged(() => { void this.refresh(); });
    this.api.onBackupStatus(value => { void this.notifications.publish(value.ok ? 'lifecycleComplete' : 'operationFailed', 'settings', value.libraryId, value.ok ? null : 'WRITE_FAILED'); });
    this.api.onSecurityLocked(() => { this.clearSensitiveView(); void (async () => { const result = await this.api.status(); if (result.ok) this.status.set(result.value); await this.refresh(); })(); });
    effect(() => {
      this.autosaveContext();
      untracked(() => { this.cancelTimer(); this.schedule(); });
    });
    this.api.onExit(async command => {
      if (command === 'resume') { this.exitLocked.set(false); this.schedule(); requestAnimationFrame(() => this.exitFocus?.focus()); return { dirty: this.dirty(), busy: false, saved: false }; }
      if (this.switching() || this.organizationBusy() || this.composing) return { dirty: true, busy: true, saved: false };
      if (!this.exitLocked()) this.exitFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      this.exitLocked.set(true); this.cancelTimer();
      await this.preferences.idle();
      if (this.inflight) await this.inflight;
      if (this.placementInflight) await this.placementInflight;
      const saved = command === 'save' ? await this.flush() : false;
      await this.notifications.idle();
      return { dirty: this.dirty() || !!this.pending || !!this.pendingPlacement || !!this.createId, busy: false, saved };
    });
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
    if(this.duplicatePending?.request.noteId===this.session()!.note.id){await this.duplicateNote(this.duplicatePending.title);return;}
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
    const epoch = this.viewEpoch;
    const result = await this.api.list();
    if (epoch !== this.viewEpoch) return;
    if (result.ok) this.notes.set(result.value); else this.reportError(result.code, 'open');
    const organization = await this.api.organization();
    if (epoch !== this.viewEpoch) return;
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
    if (this.exitLocked() || this.timer !== undefined || !this.autosaveEnabled() || !this.dirty() || this.composing || this.pending) return;
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
  async refreshSelected():Promise<void>{const session=this.session();if(!session||this.dirty())return;const r=await this.api.begin(session.note.id);if(r.ok&&this.session()?.note.id===session.note.id){this.session.set(r.value);this.title.set(r.value.note.title);this.body.set(r.value.note.body);this.opened.update(value=>value+1);}}
  async releaseSelection():Promise<boolean>{if(!await this.flush())return false;const session=this.session();if(session){const r=await this.api.end(session.token,session.generation);if(!r.ok){this.reportError(r.code);return false;}}this.session.set(null);this.title.set('');this.body.set('');this.dirty.set(false);this.opened.update(value=>value+1);return true;}
  async select(id: string): Promise<void> {
    if (this.switching() || id === this.session()?.note.id) return;
    this.switching.set(true);
    const epoch = this.viewEpoch;
    try {
      if (!await this.flush()) return;
      const result = await this.api.begin(id);
      if (epoch !== this.viewEpoch) return;
      if (!result.ok) { this.reportError(result.code, 'open'); return; }
      const previous = this.session();
      if (previous) await this.api.end(previous.token, previous.generation);
      if (epoch !== this.viewEpoch) return;
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
  async duplicateNote(title:string):Promise<void>{
    if(this.switching()||!this.session())return;
    this.switching.set(true);let id:string|undefined;
    try{
      if(!await this.flush())return;const session=this.session()!;
      if(!this.duplicatePending||this.duplicatePending.request.noteId!==session.note.id||this.duplicatePending.title!==title)this.duplicatePending={title,request:{noteId:session.note.id,token:session.token,generation:session.generation,expectedVersion:session.note.version,operationId:crypto.randomUUID()}};
      const result=await this.api.duplicate(this.duplicatePending.request,title);
      if(!result.ok){if(result.code!=='COMMIT_STATUS_UNKNOWN')this.duplicatePending=undefined;this.reportError(result.code,'create');return;}
      this.duplicatePending=undefined;id=result.value.note.id;await this.refresh();this.notify('noteCreated','create');
    }catch{this.reportError('COMMIT_STATUS_UNKNOWN','create');}
    finally{this.switching.set(false);}
    if(id)await this.select(id);
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
