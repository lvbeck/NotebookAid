import { FormsModule } from '@angular/forms';
import { NotificationService } from './notification-service';
import { Component, Input, Output, EventEmitter, OnChanges, inject, signal } from '@angular/core';
import { NoteWorkspace } from './note-workspace';
import { IconComponent } from './icon.component';
import { translate, type Locale } from './i18n';
import { lifecycleText, type LifecycleKey } from './lifecycle-i18n';
import type { NoteDocument, NoteSummary } from '../../shared/library';
@Component({
  selector: 'app-lifecycle', standalone: true, imports: [IconComponent, FormsModule],
  template: `
  <section class="lifecycle-pane">
    <header><h1>{{ noteId ? l('history') : trashTitle() }}</h1><button class="secondary" (click)="closed.emit()" [disabled]="busy()"><app-icon name="X" />{{ l('close') }}</button></header>
    <p class="muted">{{ l(noteId ? 'historyHint' : 'trashHint') }}</p>
    @if (noteId) {
      <button class="secondary" data-testid="history-cleanup-toggle" [disabled]="busy() || total() <= 1" (click)="cleanupOpen = !cleanupOpen"><app-icon name="Trash2" />{{ l('cleanup') }}</button>
      @if (cleanupOpen) { <div class="panel"><p>{{ l('retentionHint') }}</p><label>{{ l('retain') }} <input type="number" min="1" step="1" data-testid="history-retain" [(ngModel)]="retain" [disabled]="busy()"></label><p class="warning">{{ cleanupWarning() }}</p><button class="primary" data-testid="history-cleanup-confirm" [disabled]="busy() || !validRetain() || total() <= retain" (click)="clean()"><app-icon name="Trash2" />{{ l('clean') }}</button><button class="secondary" [disabled]="busy()" (click)="cleanupOpen = false"><app-icon name="X" />{{ l('close') }}</button></div> }
    }
    @if (error()) { <p role="alert" class="warning">{{ error() }}</p> }
    @if (message()) { <p role="status">{{ message() }}</p> }
    <div class="panel">
      @for (row of rows(); track row.revisionId || row.id) {
        <div class="lifecycle-row">
          <app-icon [name]="noteId ? 'History' : 'FileText'" />
          <div class="lifecycle-label"><strong>{{ row.title }}</strong><small>{{ row.primaryFormat.toUpperCase() }} · v{{ row.version }} · {{ date(row.deletedAt || row.updatedAt) }}@if (noteId) { · {{ row.attachmentCount }} {{ attachmentsTitle() }} }</small></div>
          <button class="secondary" [disabled]="busy()" (click)="preview(row)"><app-icon name="Eye" />{{ l('preview') }}</button>
          <button class="secondary" data-testid="lifecycle-restore" [disabled]="busy()" (click)="restore(row)"><app-icon name="Undo2" />{{ l('restore') }}</button>
          @if (!noteId) { <button class="secondary" data-testid="lifecycle-purge" [disabled]="busy()" (click)="purge(row)"><app-icon name="Trash2" />{{ l('purge') }}</button> }
        </div>
      } @empty { <p>{{ l('empty') }}</p> }
      <footer><button class="secondary" [disabled]="busy() || offset === 0" (click)="page(-1)"><app-icon name="ChevronLeft" />{{ l('previous') }}</button><span>{{ offset + (rows().length ? 1 : 0) }}–{{ offset + rows().length }} / {{ total() }}</span><button class="secondary" [disabled]="busy() || offset + rows().length >= total()" (click)="page(1)"><app-icon name="ChevronRight" />{{ l('next') }}</button></footer>
    </div>
    @if (source()) { <section class="panel lifecycle-preview"><header><h2>{{ l('preview') }} · v{{ source()!.version }}</h2><button class="icon-button" [attr.aria-label]="l('close')" (click)="source.set(null)"><app-icon name="X" /></button></header><pre>{{ source()!.body }}</pre></section> }
  </section>`,
  styles: [`:host { display:block; width:100%; overflow:auto; } .lifecycle-pane { max-width:1200px; margin:auto; padding:32px; } header,footer,.lifecycle-row { display:flex; align-items:center; gap:12px; } header { justify-content:space-between; } .lifecycle-row { padding:16px 0; border-bottom:1px solid var(--line); flex-wrap:wrap; } .lifecycle-label { flex:1; min-width:160px; overflow-wrap:anywhere; } small { display:block; opacity:.7; margin-top:6px; } footer { margin-top:20px; justify-content:flex-end; } .lifecycle-preview { margin-top:20px; } pre { white-space:pre-wrap; overflow-wrap:anywhere; max-height:55vh; overflow:auto; }`]
})
export class LifecycleComponent implements OnChanges {
  @Input() locale: Locale = 'zh-CN';
  @Input() noteId = '';
  @Output() closed = new EventEmitter<void>();
  private readonly notifications = inject(NotificationService);
  readonly workspace = inject(NoteWorkspace);
  readonly rows = signal<(NoteSummary & { revisionId?: string; attachmentCount?: number })[]>([]);
  readonly total = signal(0); readonly busy = signal(false); readonly error = signal(''); readonly message = signal('');
  readonly source = signal<NoteDocument | null>(null);
  offset = 0; retain = 50; cleanupOpen = false;
  validRetain(): boolean { return Number.isSafeInteger(this.retain) && this.retain >= 1; }
  cleanupWarning(): string { return this.l('cleanupWarning').replace('{count}', String(this.validRetain() ? Math.max(0, this.total() - this.retain) : 0)); }
  async clean(): Promise<void> {
    if (!this.validRetain() || this.busy()) return;
    this.busy.set(true); this.error.set(''); this.message.set('');
    try { if (await this.workspace.lifecycleAction('clean', undefined, this.retain)) { this.offset = 0; this.source.set(null); this.cleanupOpen = false; this.message.set(this.l('success')); await this.load(); } else this.error.set(this.workspace.error()); }
    finally { this.busy.set(false); }
  }
  private readonly api = window.notebookAid.library;
  private readonly purgeOperations = new Map<string, string>();
  l(key: LifecycleKey): string { return lifecycleText(this.locale, key); }
  trashTitle(): string { return translate(this.locale, 'trash'); }
  attachmentsTitle(): string { return translate(this.locale, 'attachments'); }
  date(value: string): string { return new Date(value).toLocaleString(this.locale); }
  ngOnChanges(): void { this.offset = 0; this.source.set(null); void this.load(); }
  async load(): Promise<void> {
    this.busy.set(true); this.error.set('');
    try {
      if (this.noteId) { const result = await this.api.history(this.noteId, this.offset); if (!result.ok) { this.error.set(result.code); return; } this.rows.set(result.value.revisions); this.total.set(result.value.total); }
      else { const result = await this.api.query({ view: 'trash', offset: this.offset, limit: 20 }); if (!result.ok) { this.error.set(result.code); return; } this.rows.set(result.value.notes); this.total.set(result.value.total); }
    } catch { this.error.set('NOT_FOUND_OR_UNAVAILABLE'); } finally { this.busy.set(false); }
  }
  page(direction: number): void { this.offset = Math.max(0, this.offset + direction * 20); this.source.set(null); void this.load(); }
  async preview(row: NoteSummary & { revisionId?: string }): Promise<void> {
    this.busy.set(true); this.error.set('');
    try {
      let revision = row.revisionId;
      if (!revision) { const history = await this.api.history(row.id); if (!history.ok) { this.error.set(history.code); return; } revision = history.value.revisions[0]?.revisionId; }
      if (!revision) return;
      const result = await this.api.revision(row.id, revision); if (result.ok) this.source.set(result.value); else this.error.set(result.code);
    } catch { this.error.set('COMMIT_STATUS_UNKNOWN'); } finally { this.busy.set(false); }
  }
  async restore(row: NoteSummary & { revisionId?: string }): Promise<void> {
    this.busy.set(true); this.error.set(''); this.message.set('');
    try {
      if (this.noteId) { if (await this.workspace.lifecycleAction('restore', row.revisionId)) this.message.set(this.l('success')); else { this.error.set(this.workspace.error()); return; } }
      else { const result = await this.api.restoreNote(row.id, row.version, crypto.randomUUID()); if (!result.ok) { this.error.set(result.code); return; } this.message.set(this.l('success')); void this.notifications.publish('lifecycleComplete', 'save', this.workspace.status()?.libraryId); await this.workspace.refresh(); }
      this.source.set(null); await this.load();
    } catch { this.error.set('COMMIT_STATUS_UNKNOWN'); } finally { this.busy.set(false); }
  }
  async purge(row: NoteSummary): Promise<void> {
    this.busy.set(true); this.error.set(''); this.message.set('');
    try {
      const key = row.id + ':' + row.version; let op = this.purgeOperations.get(key); if (!op) { op = crypto.randomUUID(); this.purgeOperations.set(key, op); }
      const result = await this.api.purgeNote(row.id, row.version, op);
      if (!result.ok) { this.error.set(result.code); return; }
      if (result.value) { this.source.set(null); this.message.set(this.l('success')); void this.notifications.publish('lifecycleComplete', 'save', this.workspace.status()?.libraryId); await this.load(); await this.workspace.refresh(); }
    } catch { this.error.set('COMMIT_STATUS_UNKNOWN'); } finally { this.busy.set(false); }
  }
}
