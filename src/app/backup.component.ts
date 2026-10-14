import { BackupProgressService } from './backup-progress';
import { Component, Input, OnChanges, OnDestroy, type SimpleChanges, inject, signal } from '@angular/core';
import { IconComponent } from './icon.component';
import { NoteWorkspace } from './note-workspace';
import { backupText, type BackupKey } from './backup-i18n';
import type { Locale } from './i18n';
import type { BackupPolicy, MaintenanceAction } from '../../shared/backup';
@Component({ selector: 'app-backup', standalone: true, imports: [IconComponent], template: `
  <article class="panel settings-panel" data-testid="backup-settings"><h2>{{ t('title') }}</h2><p class="muted">{{ t('hint') }}</p>
    <p class="path">{{ t('directory') }}: {{ policy()?.directory || t('none') }}</p>
    <button class="secondary" data-testid="backup-directory" [disabled]="progress.active() || busy() || workspace.switching()" (click)="configure(true)"><app-icon name="FolderOpen" />{{ t('choose') }}</button>
    <label class="setting-row"><span>{{ t('daily') }}</span><input type="checkbox" data-testid="backup-daily" [checked]="policy()?.enabled || false" [disabled]="progress.active() || busy() || workspace.switching() || !policy()?.directory" (change)="configure(false, $event)"></label>
    <p class="muted">{{ t('last') }}: {{ policy()?.lastAt ? date(policy()!.lastAt!) : t('none') }}</p>
    <p class="muted">{{ t('targetHint') }}</p>
    <div class="actions"><button class="secondary" data-testid="backup-now" [disabled]="progress.active() || busy() || workspace.switching() || !available || !policy()?.directory" (click)="run('backup')"><app-icon name="Save" />{{ t('backup') }}</button><button class="secondary" data-testid="backup-verify" [disabled]="progress.active() || busy() || workspace.switching() || !available" (click)="run('verify')"><app-icon name="Shield" />{{ t('verify') }}</button><button class="secondary" data-testid="backup-restore" [disabled]="progress.active() || busy() || workspace.switching() || !canRestore" (click)="run('restore')"><app-icon name="History" />{{ t('restore') }}</button><button class="secondary" data-testid="backup-migrate" [disabled]="progress.active() || busy() || workspace.switching() || !available" (click)="run('migrate')"><app-icon name="ArrowLeftRight" />{{ t('migrate') }}</button></div>
    @if (error()) { <p class="warning path" role="alert" data-testid="backup-error">{{ t('failed') }} · {{ reason(error()) }}{{ errorDetails() }}</p> }
    @if (message()) { <p class="path" role="status" data-testid="backup-result">{{ message() }}</p> }
  </article>` })
export class BackupComponent implements OnChanges, OnDestroy {
  @Input() id = ''; @Input() locale: Locale = 'zh-CN'; @Input() available = false; @Input() canRestore = false;
  readonly progress = inject(BackupProgressService);
  readonly workspace = inject(NoteWorkspace); readonly busy = signal(false); readonly error = signal(''); readonly message = signal('');
  readonly errorDetails = signal('');
  private lastAction: MaintenanceAction | undefined;
  reason(code: string): string { if (code === 'INTEGRITY_CHECK_FAILED' && this.lastAction === 'verify') return this.t('verifyFailed'); return this.t(({ TARGET_NOT_EMPTY:'targetNotEmpty',PATH_OVERLAP:'pathOverlap',PATH_LINKED:'pathLinked',RESTORE_TARGET_INVALID:'invalidTarget',LIBRARY_ID_MISMATCH:'identityMismatch',LIBRARY_IN_USE:'busy',NOTE_IN_USE:'noteBusy',RESTORE_FAILED_ROLLED_BACK:'rolledBack',RESTORE_ROLLBACK_FAILED:'rollbackFailed',RESTORE_INTERRUPTED:'interrupted',DISK_FULL:'diskFull',ACCESS_DENIED:'accessDenied',WRITE_FAILED:'writeFailed',INVALID_INPUT:'invalidInput',NOT_FOUND_OR_UNAVAILABLE:'backupUnavailable',INTEGRITY_CHECK_FAILED:'invalidBackup' } as Record<string, BackupKey>)[code] ?? 'writeFailed'); }
  readonly policy = signal<BackupPolicy | null>(null);
  private readonly stopStatus = window.notebookAid.library.onBackupStatus(() => { void this.load(); });
  ngOnDestroy(): void { this.stopStatus(); }
  t(key: BackupKey): string { return backupText(this.locale, key); }
  date(value: number): string { return new Date(value).toLocaleString(this.locale); }
  ngOnChanges(changes: SimpleChanges): void { if (changes['id'] || changes['locale']) { this.policy.set(null); this.message.set(''); this.error.set(''); this.errorDetails.set(''); } void this.load(); }
  async load(): Promise<void> { const id = this.id; try { const result = await window.notebookAid.library.backups(); if (id !== this.id) return; if (result.ok) this.policy.set(result.value.policies[id] ?? null); else this.error.set(result.code); } catch { this.error.set('WRITE_FAILED'); } }
  async configure(choose: boolean, event?: Event): Promise<void> {
    if (this.busy() || this.progress.active()) return; const id = this.id, input = event?.target as HTMLInputElement | undefined;
    this.busy.set(true); this.error.set(''); this.errorDetails.set(''); this.lastAction = undefined;
    try { const result = await window.notebookAid.library.configureBackup(id, input?.checked ?? this.policy()?.enabled ?? false, choose); if (id !== this.id) return; if (!result.ok) this.error.set(result.code); else if (result.value) this.policy.set(result.value.policies[id] ?? null); }
    catch { this.error.set('WRITE_FAILED'); }
    finally { if (input) input.checked = this.policy()?.enabled ?? false; this.busy.set(false); }
  }
  async run(action: MaintenanceAction): Promise<void> {
    if (this.busy() || this.progress.active()) return; const id = this.id; this.busy.set(true); this.error.set(''); this.errorDetails.set(''); this.message.set('');
    this.lastAction = action;
    try {
      const result = await this.workspace.securityChange(() => window.notebookAid.library.maintenance(id, action)); if (id !== this.id || !result) return;
      if (!result.ok) { this.error.set(result.code); if (result.details) this.errorDetails.set([result.details.targetPath ? '\n' + this.t('targetPath') + ': ' + result.details.targetPath : '', result.details.rollbackPath ? '\n' + this.t('rollbackPath') + ': ' + result.details.rollbackPath : '', result.details.stagingPath ? '\n' + this.t('stagingPath') + ': ' + result.details.stagingPath : ''].join('')); }
      else if (result.value) {
        const value = result.value as Record<string, unknown>; let text = this.t('success');
        if (typeof value['path'] === 'string') text += ' · ' + value['path'];
        if (typeof value['previousPath'] === 'string') text += '\n' + this.t('previous') + ': ' + value['previousPath'];
        if (typeof value['notes'] === 'number') text += '\n' + this.t('counts') + ': ' + value['notes'] + ' / ' + value['revisions'] + ' / ' + value['attachments'];
        if (Number(value['encryptedSkipped']) > 0) text += '\n' + this.t('encryptedSkipped') + ' ' + value['encryptedSkipped'];
        this.message.set(text); await this.load();
      }
    } catch { this.error.set('WRITE_FAILED'); } finally { this.busy.set(false); }
  }
}
