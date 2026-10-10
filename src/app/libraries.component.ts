import { Component, Input, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NoteWorkspace } from './note-workspace';
import { IconComponent } from './icon.component';
import { translate, type Locale, type MessageKey } from './i18n';

@Component({ selector: 'app-libraries', standalone: true, imports: [FormsModule, IconComponent], templateUrl: './libraries.component.html' })
export class LibrariesComponent {
  @Input() locale: Locale = 'zh-CN';
  readonly workspace = inject(NoteWorkspace);
  readonly editing = signal('');
  readonly removing = signal('');
  name = '';
  t(key: MessageKey): string { return translate(this.locale, key); }
  error(code: string): string { return this.t(({ DUPLICATE_LIBRARY: 'libDuplicate', LIBRARY_ID_MISMATCH: 'libMismatch', REGISTRY_INVALID: 'libConfigInvalid', UNSUPPORTED_LIBRARY: 'libUnsupported', CURRENT_LIBRARY: 'libCurrentProtected', LIBRARY_IN_USE: 'libInUse', NOT_FOUND_OR_UNAVAILABLE: 'libUnavailable', INVALID_INPUT: 'libInvalid', INTEGRITY_CHECK_FAILED: 'libInvalid', WRITE_FAILED: 'libWriteFailed' } as Record<string, MessageKey>)[code] ?? 'operationFailed'); }
  time(value: string | null): string { return value ? new Date(value).toLocaleString(this.locale, { dateStyle: 'short', timeStyle: 'short' }) : this.t('libNeverOpened'); }
  edit(id: string, name: string): void { this.editing.set(id); this.name = name; }
  async rename(id: string): Promise<void> { await this.workspace.manage('rename', id, this.name); if (!this.workspace.registryError()) this.editing.set(''); }
  async remove(id: string): Promise<void> { await this.workspace.manage('remove', id); if (!this.workspace.registryError()) this.removing.set(''); }
}
