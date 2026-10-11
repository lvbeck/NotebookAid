import { Component, Input, Output, EventEmitter, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NoteWorkspace } from './note-workspace';
import { IconComponent } from './icon.component';
import { type Locale, type MessageKey, translate } from './i18n';
import type { AttachmentRequest, AttachmentView, AttachmentPreview } from '../../shared/attachments';
import { OverlayModule } from '@angular/cdk/overlay';
import { A11yModule } from '@angular/cdk/a11y';
import { NotificationService } from './notification-service';

@Component({ selector: 'app-attachments', standalone: true, imports: [OverlayModule, A11yModule, FormsModule, IconComponent], template: `
  <button cdkOverlayOrigin #origin="cdkOverlayOrigin" class="secondary" data-testid="attachments-toggle" [attr.aria-expanded]="open()" (click)="toggle()" [disabled]="!workspace.session()"><app-icon name="Paperclip" />{{ t('attachments') }} · {{ workspace.session()?.note?.attachments?.length || 0 }}<app-icon [name]="open() ? 'ChevronUp' : 'ChevronDown'" /></button>
  <ng-template cdkConnectedOverlay [cdkConnectedOverlayOrigin]="origin" [cdkConnectedOverlayOpen]="open()" [cdkConnectedOverlayHasBackdrop]="true" cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop" (backdropClick)="open.set(false)" (overlayKeydown)="$event.key === 'Escape' && open.set(false)">
    <section cdkTrapFocus [cdkTrapFocusAutoCapture]="true" class="attachment-panel" [attr.aria-label]="t('attachments')">
      <div class="attachment-heading"><strong>{{ t('attachments') }}</strong><button class="secondary" data-testid="attachment-add" (click)="change()" [disabled]="workspace.switching() || busy()"><app-icon name="Plus" />{{ t('addAttachment') }}</button><button class="icon-button" [attr.aria-label]="t('noticeClose')" (click)="open.set(false)"><app-icon name="X" /></button></div>
      <p>{{ t('attachmentHint') }}</p>
      @if (message()) { <p role="status">{{ message() }}</p> }
      @for (item of items(); track item.id) {
        <div class="attachment-row" [attr.data-attachment]="item.id">
          <app-icon [name]="item.mediaType.startsWith('image/') ? 'Image' : 'FileText'" />
          <span class="attachment-label">{{ item.name }}<small>{{ size(item.size) }} @if (!item.available) { · {{ t('attachmentMissing') }} }</small></span>
          @if (item.mediaType.startsWith('image/')) { <button class="icon-button" [title]="t('insertImage')" [attr.aria-label]="t('insertImage')" (click)="insert(item.id)" [disabled]="!item.available || busy() || workspace.switching()"><app-icon name="ImagePlus" /></button> }
          <button class="icon-button" [title]="t('viewAttachment')" [attr.aria-label]="t('viewAttachment')" (click)="view(item)" [disabled]="!item.available || busy()"><app-icon name="Eye" /></button>
          <button class="icon-button" [title]="t('exportCopy')" [attr.aria-label]="t('exportCopy')" (click)="export(item)" [disabled]="!item.available || busy()"><app-icon name="FileOutput" /></button>
          <button class="icon-button" [title]="t('renameAttachment')" [attr.aria-label]="t('renameAttachment')" (click)="renaming.set(item.id); name=item.name" [disabled]="busy()"><app-icon name="NotebookPen" /></button>
          <button class="icon-button" [title]="t('unlinkAttachment')" [attr.aria-label]="t('unlinkAttachment')" (click)="unlinking.set(item.id); renaming.set('')" [disabled]="busy() || workspace.switching()"><app-icon name="X" /></button>
        </div>
        @if (unlinking() === item.id) { <div class="attachment-unlink"><p>{{ t('unlinkAttachmentHint') }}</p><div class="actions"><button class="secondary" data-testid="attachment-unlink-confirm" (click)="change(item.id, false, true)" [disabled]="busy()"><app-icon name="X" />{{ t('unlinkAttachment') }}</button><button class="secondary" data-testid="attachment-unlink-cancel" (click)="unlinking.set(''); message.set('')" [disabled]="busy()"><app-icon name="ChevronLeft" />{{ t('cancelOperation') }}</button></div></div> }
        @if (renaming() === item.id) { <div class="attachment-rename"><input data-testid="attachment-name" [(ngModel)]="name" [attr.aria-label]="t('attachmentName')" maxlength="180"><button class="primary" (click)="change(item.id)" [disabled]="busy()"><app-icon name="Save" />{{ t('save') }}</button><button class="secondary" (click)="renaming.set(''); message.set('')"><app-icon name="X" />{{ t('cancelOperation') }}</button></div> }
      }
      @if (preview(); as value) { <div class="attachment-preview">@if (value.removedUnsafeSvg) { <p>{{ t('svgSanitized') }}</p> } @if (value.dataUrl) { <img [src]="value.dataUrl" [alt]="previewName()"> } @else if (value.text !== undefined) { <pre>{{ value.text }}</pre> } @else { <p>{{ t('attachmentUnsupported') }}</p> }</div> }
    </section>
  </ng-template>
` })
export class AttachmentsComponent {
  @Input() locale: Locale = 'zh-CN';
  @Output() unlinked = new EventEmitter<void>();
  @Output() insertImage = new EventEmitter<string>();
  readonly workspace = inject(NoteWorkspace);
  private readonly notifications = inject(NotificationService);
  readonly open = signal(false); readonly busy = signal(false); readonly items = signal<AttachmentView[]>([]);
  readonly unlinking = signal('');
  readonly message = signal(''); readonly renaming = signal(''); name = '';
  readonly preview = signal<AttachmentPreview | null>(null); readonly previewName = signal('');
  private pending: { request: AttachmentRequest; id?: string; name: string; unlink: boolean } | null = null;
  constructor() { effect(() => { this.workspace.opened(); untracked(() => { this.open.set(false); this.items.set([]); this.preview.set(null); this.message.set(''); this.renaming.set(''); this.unlinking.set(''); this.pending=null; }); }); }
  t(key: MessageKey): string { return translate(this.locale, key); }
  size(bytes: number): string { return bytes < 1024 ? `${bytes} B` : bytes < 1024*1024 ? `${(bytes/1024).toFixed(1)} KB` : `${(bytes/1024/1024).toFixed(1)} MB`; }
  toggle(): void { this.open.update(value => !value); if(this.open()) void this.refresh(); }
  insert(id: string): void { this.open.set(false); this.insertImage.emit(id); }
  async chooseImage(): Promise<void> { this.open.set(true); await this.change(undefined, true); }
  async refresh(): Promise<void> { const session=this.workspace.session(); if(!session)return; try { const result=await window.notebookAid.library.attachments(session.note.id); if(this.workspace.session()?.generation!==session.generation)return; if(result.ok)this.items.set(result.value); else this.message.set(this.t('attachmentFailed')); } catch { this.message.set(this.t('attachmentFailed')); } }
  async change(id?: string, insert = false, unlink = false): Promise<void> {
    if(this.busy() || this.workspace.switching())return;
    this.busy.set(true);this.workspace.switching.set(true);this.message.set('');
    try {
      if(!await this.workspace.flush())return;
      const session=this.workspace.session();if(!session)return;
      const pending=this.pending ?? {request:{noteId:session.note.id,token:session.token,generation:session.generation,expectedVersion:session.note.version,operationId:crypto.randomUUID()},id,name:this.name,unlink};
      this.pending=pending;
      const result=pending.unlink && pending.id ? await window.notebookAid.library.unlinkAttachment(pending.request,pending.id) : pending.id ? await window.notebookAid.library.renameAttachment(pending.request,pending.id,pending.name) : await window.notebookAid.library.addAttachment(pending.request);
      if(!result.ok) { if(result.code!=='COMMIT_STATUS_UNKNOWN')this.pending=null;this.message.set(this.t('attachmentFailed')+' · '+result.code);void this.notifications.publish('attachmentFailed','save',this.workspace.status()?.libraryId);return; }
      this.pending=null;
      if(result.value) { this.workspace.session.set({...session,note:result.value.note});this.renaming.set('');this.unlinking.set('');if(pending.unlink){this.preview.set(null);this.unlinked.emit();}this.message.set(this.t('attachmentSaved'));void this.notifications.publish('attachmentSaved','save',this.workspace.status()?.libraryId);await this.workspace.refresh(); }
      if(result.value?.removedUnsafeSvg)void this.notifications.publish('svgSanitized','save',this.workspace.status()?.libraryId);
      await this.refresh();
      if(insert && result.value) { const added=result.value.note.attachments?.at(-1); const item=this.items().find(item=>item.id===added?.id); if(item?.mediaType.startsWith('image/')) { this.workspace.switching.set(false);this.insert(item.id); } }
    } catch { this.message.set(this.t('attachmentFailed')); }
    finally { this.busy.set(false);this.workspace.switching.set(false); }
  }
  async view(item: AttachmentView): Promise<void> {
    const session=this.workspace.session();if(!session)return;this.busy.set(true);
    try { const result=await window.notebookAid.library.previewAttachment(session.note.id,item.id);if(this.workspace.session()?.generation!==session.generation)return;this.preview.set(result.ok?result.value:null);this.previewName.set(item.name);if(!result.ok)this.message.set(this.t('attachmentMissing')); }
    catch { this.message.set(this.t('attachmentFailed')); }
    finally {this.busy.set(false);}
  }
  async export(item: AttachmentView): Promise<void> {
    const session=this.workspace.session();if(!session)return;this.busy.set(true);
    try { const result=await window.notebookAid.library.exportAttachment(session.note.id,item.id);this.message.set(result.ok ? (result.value?this.t('exportSuccess'):'') : this.t('attachmentFailed')); }
    catch { this.message.set(this.t('attachmentFailed')); }
    finally {this.busy.set(false);}
  }
}
