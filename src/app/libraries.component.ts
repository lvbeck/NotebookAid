import { Dialog } from '@angular/cdk/dialog';
import { SecurityDialog } from './security.component';
import { securityText } from './security-i18n';
import { Component, Input, Injector, afterNextRender, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NoteWorkspace } from './note-workspace';
import { IconComponent } from './icon.component';
import { regionalLocale, translate, type Locale, type MessageKey } from './i18n';
import type { LibraryImportPreview, LibraryImportResult } from '../../shared/library-import';
import { NotificationService } from './notification-service';

@Component({ selector: 'app-libraries', standalone: true, imports: [FormsModule, IconComponent], templateUrl: './libraries.component.html' })
export class LibrariesComponent {
  @Input() locale: Locale = 'zh-CN';
  readonly workspace = inject(NoteWorkspace);
  private readonly notifications = inject(NotificationService);
  private readonly injector = inject(Injector);
  private readonly dialog = inject(Dialog);
  readonly editing = signal('');
  readonly removing = signal('');
  name = '';
  readonly importing = signal(false);
  readonly importPreview = signal<LibraryImportPreview | null>(null);
  readonly importResult = signal<LibraryImportResult | null>(null);
  readonly importError = signal('');
  async previewImport(id: string): Promise<void> {
    if (this.importing() || this.workspace.switching()) return;
    this.importing.set(true); this.importError.set(''); this.importPreview.set(null); this.importResult.set(null);
    try {
      await this.workspace.activate(id);
      if (this.workspace.registry().activeId !== id || !await this.workspace.flush()) return;
      this.workspace.switching.set(true);
      const result = await window.notebookAid.library.previewLibraryImport();
      if (result.ok) { this.importPreview.set(result.value); this.showImport(); } else if (result.code === 'BAD_CREDENTIAL') { const ref = this.dialog.open<LibraryImportPreview>(SecurityDialog, { data: 'import', disableClose: true, panelClass: 'app-dialog-panel', backdropClass: 'app-dialog-backdrop', width: '520px', maxWidth: 'calc(100vw - 32px)' }); ref.closed.subscribe(value => { if (value) { this.importPreview.set(value); this.showImport(); } else this.cancelImport(); }); } else this.importError.set(result.code);
    } catch { this.importError.set('WRITE_FAILED'); }
    finally { this.importing.set(false); this.workspace.switching.set(false); }
  }
  cancelImport(): void { this.importPreview.set(null); void window.notebookAid.library.cancelLibraryImport(); }
  async confirmImport(): Promise<void> {
    const preview = this.importPreview(); if (!preview || this.importing()) return;
    this.importing.set(true); this.workspace.switching.set(true); this.importError.set('');
    try {
      if (!await this.workspace.flush()) return;
      const result = await window.notebookAid.library.confirmLibraryImport(preview.token);
      this.importPreview.set(null);
      if (result.ok) { this.importResult.set(result.value); await this.workspace.refresh(); await this.workspace.refreshRegistry(); await this.notifications.publish('importComplete', 'create', this.workspace.status()?.libraryId); this.showImport(); }
      else this.importError.set(result.code);
    } catch { this.importError.set('COMMIT_STATUS_UNKNOWN'); this.importPreview.set(null); }
    finally { this.importing.set(false); this.workspace.switching.set(false); }
  }
  private showImport(): void { afterNextRender(() => document.querySelector('[data-testid=library-import-preview], [data-testid=library-import-result]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), { injector: this.injector }); }
  t(key: MessageKey): string { return translate(this.locale, key); }
  error(code: string): string { if (code === 'NOTEBOOK_LOCKED') return securityText(this.locale, 'master') + ' · ' + securityText(this.locale, 'setup') + ' / ' + securityText(this.locale, 'unlock'); return this.t(({ DUPLICATE_LIBRARY: 'libDuplicate', LIBRARY_ID_MISMATCH: 'libMismatch', REGISTRY_INVALID: 'libConfigInvalid', UNSUPPORTED_LIBRARY: 'libUnsupported', CURRENT_LIBRARY: 'libCurrentProtected', LIBRARY_IN_USE: 'libInUse', NOT_FOUND_OR_UNAVAILABLE: 'libUnavailable', INVALID_INPUT: 'libInvalid', INTEGRITY_CHECK_FAILED: 'libInvalid', WRITE_FAILED: 'libWriteFailed' } as Record<string, MessageKey>)[code] ?? 'operationFailed'); }
  time(value: string | null): string { return value ? new Date(value).toLocaleString(regionalLocale(this.locale), { dateStyle: 'short', timeStyle: 'short' }) : this.t('libNeverOpened'); }
  edit(id: string, name: string): void { this.editing.set(id); this.name = name; }
  async rename(id: string): Promise<void> { await this.workspace.manage('rename', id, this.name); if (!this.workspace.registryError()) this.editing.set(''); }
  async remove(id: string): Promise<void> { await this.workspace.manage('remove', id); if (!this.workspace.registryError()) this.removing.set(''); }
}
