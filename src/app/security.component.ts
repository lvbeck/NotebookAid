import { Component, Input, OnDestroy, inject, signal } from '@angular/core';
import { TooltipDirective } from './tooltip.directive';
import { FormsModule } from '@angular/forms';
import { Dialog, DialogModule, DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { CdkMenuModule } from '@angular/cdk/menu';
import { IconComponent } from './icon.component';
import { NoteWorkspace } from './note-workspace';
import { Preferences } from './preferences';
import { securityText, type SecurityKey } from './security-i18n';
import { firstValueFrom } from 'rxjs';
import type { SecurityAction, SecurityRequest } from '../../shared/security';
import { RecoveryPrintPreview } from './recovery-print-preview';
import { BatchProgressComponent } from './batch-progress.component';
import type { BatchProgress } from '../../shared/batch';
import type { EncryptedNote, DecryptReport } from '../../shared/security';
import { decryptText } from './decrypt-i18n';
import { errorText } from './ui-i18n';
import { translate } from './i18n';

@Component({ selector: 'app-security-dialog', standalone: true, imports: [FormsModule, IconComponent, BatchProgressComponent], template: `
  <section class="app-confirm-dialog security-dialog" data-testid="security-dialog">
    <header><span class="dialog-symbol"><app-icon name="LockKeyhole" /></span><h2 id="security-title">{{ t(key() ? 'recovery' : data === 'import' ? 'unlock' : data) }}</h2></header>
    @if (key()) {
      <p>{{ t('recoveryHint') }}</p><textarea readonly data-testid="recovery-key" [value]="key()" rows="3" [attr.aria-label]="t('recovery')"></textarea>
      <div class="recovery-print-actions"><button class="secondary" data-testid="recovery-print" [disabled]="busy()" (click)="printKey('print')"><app-icon name="Printer" />{{ t('print') }}</button><button class="secondary" data-testid="recovery-pdf" [disabled]="busy()" (click)="printKey('pdf')"><span class="pdf-file-icon"><app-icon name="FileText" /><small>PDF</small></span>{{ t('printPdf') }}</button></div>
      @if (error()) { <p role="alert" class="warning">{{ error() }}</p> }
      <label class="setting-row"><span>{{ t('savedKey') }}</span><input type="checkbox" [(ngModel)]="acknowledged"></label>
      <footer><button class="primary" [disabled]="!acknowledged || busy()" (click)="close(true)"><app-icon name="Check" />{{ t('continue') }}</button></footer>
    } @else {
      @if (data === 'setup') { <p class="muted">{{ t('boundary') }}</p> }
      @if (data === 'disable') { <p>{{ t('remaining') }}</p> }
      @if (data === 'disable') {
        @if (workspace.status()?.security?.unlocked) {
          <h3>{{ d('list') }} · {{ encrypted().length }}</h3>
          <div class="encrypted-notes-list" data-testid="encrypted-notes-list">@for(note of encrypted();track note.id){<div class="encrypted-note-row" [attr.data-encrypted-note]="note.id"><app-icon name="LockKeyhole" /><div><strong>{{note.title}}</strong><p class="muted">{{note.folder || unfiled()}} @if(note.deleted){ · {{d('trash')}} }</p></div></div>}</div>
          @if (loaded() && !encrypted().length) { <p>{{d('empty')}}</p> }
          @if (encrypted().length) { <p class="warning">{{d('hint')}}</p><button class="secondary" data-testid="decrypt-all" [disabled]="busy() || !credential" (click)="decryptAll()"><app-icon name="LockKeyholeOpen" />{{d('all')}}</button> }
        } @else { <p>{{d('unlock')}}</p> }
        <app-batch-progress [locale]="prefs.locale()" [value]="progress()" />
        @if (report();as r) { <p>{{resultText()}}</p><p class="path">{{d('backup')}}: {{r.backupPath}}</p>@for(row of r.errors;track row.id){<p role="alert" class="warning">{{row.id}} · {{reason(row.code)}}</p>} }
      }
      @if (data !== 'setup') { <label for="security-credential">{{ t(data === 'recover' ? 'recovery' : data === 'import' ? 'sourcePassword' : 'credential') }}<span class="password-field"><input id="security-credential" [type]="shown.credential ? 'text' : 'password'" data-testid="security-credential" autocomplete="off" [(ngModel)]="credential" [disabled]="busy()" maxlength="1024"><button type="button" class="icon-button password-visibility" data-testid="security-credential-visibility" (click)="shown.credential = !shown.credential" [disabled]="busy()" [attr.aria-pressed]="shown.credential" aria-controls="security-credential" [attr.aria-label]="t(shown.credential ? 'hidePassword' : 'showPassword')" [title]="t(shown.credential ? 'hidePassword' : 'showPassword')"><app-icon [name]="shown.credential ? 'EyeOff' : 'Eye'" /></button></span></label> }
      @if (data === 'setup' || data === 'password' || data === 'recover') {
        <label for="security-password">{{ t('newPassword') }}<span class="password-field"><input id="security-password" [type]="shown.password ? 'text' : 'password'" data-testid="security-password" autocomplete="new-password" [(ngModel)]="password" [disabled]="busy()" maxlength="1024"><button type="button" class="icon-button password-visibility" data-testid="security-password-visibility" (click)="shown.password = !shown.password" [disabled]="busy()" [attr.aria-pressed]="shown.password" aria-controls="security-password" [attr.aria-label]="t(shown.password ? 'hidePassword' : 'showPassword')" [title]="t(shown.password ? 'hidePassword' : 'showPassword')"><app-icon [name]="shown.password ? 'EyeOff' : 'Eye'" /></button></span></label>
        <label for="security-repeat">{{ t('repeat') }}<span class="password-field"><input id="security-repeat" [type]="shown.repeat ? 'text' : 'password'" data-testid="security-repeat" autocomplete="new-password" [(ngModel)]="repeat" [disabled]="busy()" maxlength="1024"><button type="button" class="icon-button password-visibility" data-testid="security-repeat-visibility" (click)="shown.repeat = !shown.repeat" [disabled]="busy()" [attr.aria-pressed]="shown.repeat" aria-controls="security-repeat" [attr.aria-label]="t(shown.repeat ? 'hidePassword' : 'showPassword')" [title]="t(shown.repeat ? 'hidePassword' : 'showPassword')"><app-icon [name]="shown.repeat ? 'EyeOff' : 'Eye'" /></button></span></label>
      }
      @if (error()) { <p role="alert" class="warning">{{ error() }}</p> }
      <footer><button class="secondary" [disabled]="busy()" (click)="close()"><app-icon name="X" />{{ t('cancel') }}</button><button class="primary" data-testid="security-submit" [disabled]="busy() || (data === 'disable' && !!workspace.status()?.security?.unlocked && (workspace.status()?.security?.encryptedNotes ?? 0) > 0)" (click)="submit()"><app-icon name="Check" />{{ t('continue') }}</button></footer>
    }
  </section>` })
export class SecurityDialog implements OnDestroy {
  private readonly dialogs = inject(Dialog);
  readonly data = inject<Exclude<SecurityAction, 'lock'> | 'import'>(DIALOG_DATA);
  readonly ref = inject(DialogRef);
  readonly workspace = inject(NoteWorkspace);
  readonly prefs = inject(Preferences);
  readonly key = signal(''); readonly busy = signal(false); readonly error = signal('');
  credential = ''; password = ''; repeat = ''; acknowledged = false;
  shown = { credential: false, password: false, repeat: false };
  readonly encrypted = signal<EncryptedNote[]>([]); readonly loaded = signal(false); readonly progress = signal<BatchProgress|null>(null); readonly report = signal<DecryptReport|null>(null);
  private readonly libraryId = this.workspace.status()?.libraryId;
  private readonly stopProgress = window.notebookAid.library.onDecryptProgress(value => { if (this.busy() && value.libraryId === this.libraryId) this.progress.set({token:value.libraryId,phase:value.processed===0?'backup':'process',processed:value.processed,total:value.total,succeeded:value.processed,failed:0,skipped:0}); });
  constructor() { if (this.data === 'disable' && this.workspace.status()?.security?.unlocked) void this.refreshEncrypted(); }
  d(key: Parameters<typeof decryptText>[1]): string { return decryptText(this.prefs.locale(),key); }
  unfiled():string { return translate(this.prefs.locale(),'rootFolder'); }
  reason(code:string):string { return errorText(this.prefs.locale(),code) + ' · ' + code; }
  resultText():string { return this.d('result').replace('{success}',String(this.report()?.succeeded??0)).replace('{failed}',String(this.report()?.failed??0)); }
  private async refreshEncrypted():Promise<void> { try{const result=await window.notebookAid.library.encryptedNotes();if(this.workspace.status()?.libraryId!==this.libraryId)return;if(result.ok){this.encrypted.set(result.value);this.loaded.set(true);}else this.error.set(this.reason(result.code));}catch{this.error.set(this.t('failed'));} }
  async decryptAll():Promise<void> {
    if(this.busy()||!this.credential||this.workspace.status()?.libraryId!==this.libraryId)return;
    this.busy.set(true);this.error.set('');
    try {
      const {AppConfirmDialog}=await import('./app-dialog');
      const accepted=await firstValueFrom(this.dialogs.open<boolean>(AppConfirmDialog,{data:{kind:'warning',title:this.d('confirm'),message:this.d('hint'),cancelLabel:this.t('cancel'),confirmLabel:this.d('all')},panelClass:'app-dialog-panel',backdropClass:'app-dialog-backdrop',width:'520px',maxWidth:'calc(100vw - 32px)',autoFocus:'[data-testid=dialog-cancel]'}).closed);
      if(!accepted||this.workspace.status()?.libraryId!==this.libraryId)return;
      this.report.set(null);this.progress.set({token:this.libraryId!,phase:'backup',processed:0,total:this.encrypted().length,succeeded:0,failed:0,skipped:0});
      const result=await this.workspace.securityChange(()=>window.notebookAid.library.decryptNotes(this.credential));
      if(!result)this.error.set(this.t('failed'));else if(!result.ok)this.error.set(this.reason(result.code));else {this.report.set(result.value);if(this.progress())this.progress.set({...this.progress()!,phase:'done',succeeded:result.value.succeeded,failed:result.value.failed});}
      if(this.workspace.status()?.security?.unlocked)await this.refreshEncrypted();
    }catch{this.error.set(this.t('failed'));}finally{this.busy.set(false);}
  }
  t(key: SecurityKey): string { return securityText(this.prefs.locale(), key); }
  close(success = false): void { this.credential = this.password = this.repeat = ''; this.shown = { credential: false, password: false, repeat: false }; this.key.set(''); this.ref.close(success); }
  ngOnDestroy(): void { this.stopProgress();this.encrypted.set([]);this.credential = this.password = this.repeat = ''; this.shown = { credential: false, password: false, repeat: false }; this.key.set(''); }
  async printKey(mode: 'print' | 'pdf'): Promise<void> {
    if (this.busy() || !this.key()) return;
    this.busy.set(true); this.error.set('');
    try {
      if (mode === 'print') {
        await firstValueFrom(this.dialogs.open(RecoveryPrintPreview, {
          data: { key: this.key() }, ariaLabelledBy: 'recovery-preview-title', ariaModal: true,
          panelClass: 'app-dialog-panel', backdropClass: 'app-dialog-backdrop',
          width: '860px', maxWidth: 'calc(100vw - 32px)', autoFocus: '[data-testid=recovery-preview-cancel]', restoreFocus: true
        }).closed);
        return;
      }
      const result = await window.notebookAid.library.printRecovery(mode, this.key());
      if (!result.ok) this.error.set(this.t('failed') + ' · ' + result.code);
    } catch { this.error.set(this.t('failed')); }
    finally { this.busy.set(false); }
  }
  async submit(): Promise<void> {
    if (this.busy()) return;
    if (['setup', 'password', 'recover'].includes(this.data) && this.password !== this.repeat) { this.error.set(this.t('mismatch')); return; }
    this.busy.set(true); this.error.set('');
    try {
      if(this.data==='disable' && (this.workspace.status()?.security?.encryptedNotes??0)>0){
        const result=await this.workspace.securityChange(()=>window.notebookAid.library.security({action:'unlock',credential:this.credential}));
        if(!result)this.error.set(this.t('failed'));else if(!result.ok)this.error.set(this.reason(result.code));else await this.refreshEncrypted();return;
      }
      if (this.data === 'import') { const result = await window.notebookAid.library.previewLibraryImport(this.credential); this.credential = ''; if (result.ok) { this.ref.close(result.value); } else this.error.set((result.code === 'NOTEBOOK_LOCKED' ? this.t('sourcePassword') + ' · ' + this.t('setup') + ' / ' + this.t('unlock') : this.t(result.code === 'BAD_CREDENTIAL' || result.code === 'PASSWORD_POLICY' ? 'bad' : 'failed')) + ' · ' + result.code); return; }
      const request: SecurityRequest = { action: this.data, credential: this.credential, password: this.password };
      const result = await this.workspace.securityChange(() => window.notebookAid.library.security(request));
      request.password = request.credential = ''; this.credential = this.password = this.repeat = '';
      if (!result) { this.error.set(this.t('failed')); return; }
      if (!result.ok) { this.error.set(this.t(result.code === 'BAD_CREDENTIAL' ? 'bad' : result.code === 'PASSWORD_POLICY' ? 'policy' : result.code === 'ENCRYPTED_NOTES_REMAIN' ? 'remaining' : 'failed') + ' · ' + result.code); return; }
      if (result.value.recoveryKey) this.key.set(result.value.recoveryKey); else this.close(true);
    } finally { this.busy.set(false); }
  }
}

@Component({ selector: 'app-security', standalone: true, imports: [TooltipDirective, FormsModule, DialogModule, CdkMenuModule, IconComponent], template: `
  @if (mode === 'note') {
    <button class="secondary" data-testid="note-security" [cdkMenuTriggerFor]="menu" [disabled]="workspace.switching() || protecting()" [attr.data-encrypted]="workspace.session()?.note?.encrypted || false"><app-icon name="Shield" />@if (workspace.session()?.note?.encrypted) { <app-icon class="note-encryption-state" [name]="state()?.unlocked ? 'LockKeyholeOpen' : 'LockKeyhole'" [appTooltip]="t(state()?.unlocked ? 'unlocked' : 'locked')" /> }{{ t('security') }}</button>
    <ng-template #menu><div cdkMenu class="folder-browser-menu">
      <button cdkMenuItem data-testid="note-encrypt" (cdkMenuItemTriggered)="protect()"><app-icon name="LockKeyhole" />{{ t(workspace.session()?.note?.encrypted ? 'decrypt' : 'protect') }}</button>
      <button cdkMenuItem data-testid="note-visibility" (cdkMenuItemTriggered)="visibility()"><app-icon name="Eye" />{{ t(workspace.session()?.note?.visibleInThunderbird === false ? 'visible' : 'hidden') }}</button>
    </div></ng-template>
  } @else if (mode === 'quick') {
    @if (state()?.configured) { <button class="nav-item" [disabled]="workspace.switching()" [appTooltip]="t(state()?.unlocked ? 'notebookUnlocked' : 'notebookLocked') + ' · ' + t(state()?.unlocked ? 'lock' : 'unlock')" data-testid="security-quick" [attr.data-unlocked]="state()?.unlocked || false" (click)="state()?.unlocked ? lock() : open('unlock')"><app-icon [name]="state()?.unlocked ? 'LockKeyholeOpen' : 'LockKeyhole'" /><span class="sidebar-text">{{ t(state()?.unlocked ? 'notebookUnlocked' : 'notebookLocked') }}</span></button> }
  } @else {
    <h2>{{ t('master') }}</h2><p class="muted">{{ t('auto') }}</p>
    <label class="setting-row"><span>{{ t('inherit') }}</span><input type="checkbox" [checked]="state()?.preference == null" (change)="preference($event, true)" [disabled]="workspace.switching()"></label>
    <label class="setting-row"><span>{{ t('enabled') }}</span><input type="checkbox" [checked]="state()?.configured || effective()" (change)="preference($event, false)" [disabled]="workspace.switching()"></label>
    <p data-testid="security-state">{{ t(state()?.configured ? state()?.unlocked ? 'unlocked' : 'locked' : 'off') }} · {{ state()?.encryptedNotes ?? 0 }}</p>
    @if (!state()?.configured && effective()) { <p>{{ t('defaultOn') }}</p> }
    <div class="actions">
      @if (!state()?.configured) { <button class="primary" (click)="open('setup')"><app-icon name="LockKeyhole" />{{ t('setup') }}</button> }
      @else {
        <button class="secondary" (click)="state()?.unlocked ? lock() : open('unlock')"><app-icon name="LockKeyhole" />{{ t(state()?.unlocked ? 'lock' : 'unlock') }}</button>
        <button class="secondary" (click)="open('password')"><app-icon name="NotebookPen" />{{ t('password') }}</button><button class="secondary" (click)="open('recover')"><app-icon name="RefreshCw" />{{ t('recover') }}</button><button class="secondary" data-testid="security-disable" (click)="open('disable')"><app-icon name="X" />{{ t('disable') }}</button>
      }
    </div><p class="muted">{{ t('unlockHint') }}</p>
  }
  @if (error()) { <p class="warning" role="alert">{{ error() }}</p> }
` })
export class SecurityComponent {
  @Input() mode: 'note' | 'settings' | 'quick' = 'settings';
  readonly workspace = inject(NoteWorkspace); readonly prefs = inject(Preferences); readonly dialog = inject(Dialog);
  readonly error = signal(''); readonly protecting = signal(false);
  state() { return this.workspace.status()?.security; }
  effective(): boolean { return this.state()?.preference ?? this.prefs.state().global.masterPasswordDefault ?? false; }
  t(key: SecurityKey): string { return securityText(this.prefs.locale(), key); }
  open(action: Exclude<SecurityAction, 'lock'>) {
    return this.dialog.open<boolean>(SecurityDialog, { data: action, disableClose: true, ariaLabelledBy: 'security-title', panelClass: 'app-dialog-panel', backdropClass: 'app-dialog-backdrop', width: '520px', maxWidth: 'calc(100vw - 32px)', autoFocus: 'first-tabbable', restoreFocus: true });
  }
  async preference(event: Event, inherit: boolean): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!inherit && !input.checked && this.state()?.configured) { input.checked = true; this.open('disable'); return; }
    const result = await window.notebookAid.library.securityPreference(inherit && input.checked ? null : inherit ? this.effective() : input.checked);
    if (!result.ok) this.error.set(this.t('failed') + ' · ' + result.code);
    const status = await window.notebookAid.library.status(); if (status.ok) this.workspace.status.set(status.value);
    if (!inherit && input.checked && !this.state()?.configured) this.open('setup');
  }
  async lock(): Promise<void> { const result = await this.workspace.securityChange(() => window.notebookAid.library.security({ action: 'lock' }), false); if (result && !result.ok) this.error.set(this.t('failed')); }
  async protect(): Promise<void> {
    const selected = this.workspace.session()?.note, libraryId = this.workspace.status()?.libraryId;
    if (!selected || this.protecting()) return;
    this.protecting.set(true); this.error.set('');
    try {
      if (!this.state()?.configured || !this.state()?.unlocked) {
        const success = await firstValueFrom(this.open(this.state()?.configured ? 'unlock' : 'setup').closed);
        if (!success || !this.state()?.unlocked) return;
      }
      if (this.workspace.status()?.libraryId !== libraryId || this.workspace.session()?.note.id !== selected.id) return;
      const { AppConfirmDialog } = await import('./app-dialog');
      const ref = this.dialog.open<boolean>(AppConfirmDialog, { data: { kind: 'warning', title: this.t(this.workspace.session()?.note.encrypted ? 'decrypt' : 'protect'), message: this.t('boundary'), cancelLabel: this.t('cancel'), confirmLabel: this.t('confirm') }, panelClass: 'app-dialog-panel', backdropClass: 'app-dialog-backdrop', width: '520px', maxWidth: 'calc(100vw - 32px)', autoFocus: '[data-testid=dialog-cancel]' });
      const accepted = await firstValueFrom(ref.closed);
      if (!accepted) return;
      if (this.workspace.status()?.libraryId !== libraryId || this.workspace.session()?.note.id !== selected.id) return;
      const result = await this.workspace.securityChange(() => { const note = this.workspace.session()!.note; return window.notebookAid.library.protectNote(note.id, note.version, !selected.encrypted); });
      if (result && !result.ok) this.error.set(this.t('failed') + ' · ' + result.code);
    } catch { this.error.set(this.t('failed')); }
    finally { this.protecting.set(false); }
  }
  async visibility(): Promise<void> {
    const result = await this.workspace.securityChange(() => { const note = this.workspace.session()!.note; return window.notebookAid.library.noteVisibility(note.id, note.version, note.visibleInThunderbird === false); });
    if (result && !result.ok) this.error.set(this.t('failed') + ' · ' + result.code);
  }
}
