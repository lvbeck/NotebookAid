import { Onboarding } from './onboarding';
import { firstValueFrom } from 'rxjs';
import { NoteContextDialog } from './note-context-dialog';
import { contextText,type ContextKey } from './context-i18n';
import type { NoteSummary } from '../../shared/library';
import { InformationDialog, type InformationPage } from './information-dialog';
import { informationText, type InformationKey } from './information-i18n';
import { UiFailure } from './ui-failure';
import { errorText, uiText, type UiKey } from './ui-i18n';
import { nextZoom } from '../../shared/ui';
import { TaskSourceComponent } from './task-source.component';
import { FolderBulkDialog } from './folder-bulk-dialog';
import { batchText } from './batch-i18n';
import { PasskeyComponent } from './passkey.component';
import { TasksDialog } from './tasks-dialog';
import { tasksText } from './tasks-i18n';
import { Dialog } from '@angular/cdk/dialog';
import { WritingDialog, type WritingDialogData } from './writing-dialog';
import { writingText } from './writing-i18n';
import { SecurityComponent } from './security.component';
import { backupText } from './backup-i18n';
import { securityText, type SecurityKey } from './security-i18n';
import { LifecycleComponent } from './lifecycle.component';
import { lifecycleText, type LifecycleKey } from './lifecycle-i18n';
import { emptyDelta, parseDelta, deltaSnapshot, type DeltaOp } from '../../shared/delta-document';
import { AttachmentsComponent } from './attachments.component';
import { TooltipDirective } from './tooltip.directive';
import { OrganizationComponent } from './organization.component';
import { A11yModule } from '@angular/cdk/a11y';
import { OverlayModule } from '@angular/cdk/overlay';
import { CdkMenuModule, CdkMenuTrigger } from '@angular/cdk/menu';
import { sourceIssues, type SourceIssue } from './source-issues';
import { DomSanitizer } from '@angular/platform-browser';
import { isolatedHtmlDocument } from './html-preview';
import { SelectDirective } from './select.directive';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, signal, inject, effect, untracked, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgTemplateOutlet } from '@angular/common';
import Quill from 'quill';
import Delta from 'quill-delta';
import hljs from 'highlight.js/lib/common';
import type Table from 'quill/modules/table';
import { codeLanguages, registerNoteFormats } from './editor-formats';
import { NoteLink } from './note-link';
import { cleanHtml, convertBody, markdownFromHtml, previewHtml, semanticHtml } from './note-codec';
import { BodyHistory } from '../../shared/body-history';
import { AppDialogs } from './app-dialog';
import { formatSource } from '../../shared/source-format';
import type { NoteFormat, NoteInput } from '../../shared/library';
import { IconComponent } from './icon.component';
import { languages, Locale, MessageKey, regionalLocale, translate } from './i18n';
import type { RuntimeInfo } from '../../shared/contracts';
import { NoteWorkspace } from './note-workspace';
import { NotificationService } from './notification-service';
import { SettingsComponent } from './settings.component';
import { Preferences } from './preferences';
import { LibrariesComponent } from './libraries.component';
import { NotificationsComponent } from './notifications.component';

type Theme = 'light' | 'dark' | 'system';

@Component({
  selector: 'app-root', standalone: true, imports: [TaskSourceComponent,PasskeyComponent, SecurityComponent, NgTemplateOutlet, LifecycleComponent, AttachmentsComponent, TooltipDirective, A11yModule, OverlayModule, CdkMenuModule, OrganizationComponent, SelectDirective, FormsModule, IconComponent, NotificationsComponent, LibrariesComponent, SettingsComponent],
  templateUrl: './app.component.html', host: { '[attr.data-ready]': 'ready()' }
})
export class AppComponent implements AfterViewInit, OnDestroy {
  tasksLabel():string{return tasksText(this.locale(),'menu');}
  async importTasks():Promise<void>{
    this.newNoteMenuOpen.set(false);
    if(this.workspace.switching()||!this.workspace.status()||!await this.workspace.flush())return;
    const libraryId=this.workspace.status()!.libraryId;
    await this.workspace.refresh();
    if(this.workspace.status()?.libraryId!==libraryId)return;
    this.writingDialogs.open(TasksDialog,{data:{locale:this.locale(),folders:()=>this.workspace.folderRows(),current:()=>this.workspace.status()?.libraryId===libraryId&&(!this.workspace.status()?.security?.configured||!!this.workspace.status()?.security?.unlocked),refresh:async()=>{await this.workspace.refresh();await this.workspace.refreshSelected();}},panelClass:'app-dialog-panel',backdropClass:'app-dialog-backdrop',width:'860px',maxWidth:'calc(100vw - 32px)',ariaLabel:this.tasksLabel(),restoreFocus:true,disableClose:true});
  }
  bulkLabel():string{return batchText(this.locale(),'bulkTitle');}
  async openFolderBulk():Promise<void>{if(this.workspace.switching()||!this.workspace.status()||!await this.workspace.flush())return;await this.workspace.refresh();const libraryId=this.workspace.status()!.libraryId;
    this.writingDialogs.open(FolderBulkDialog,{data:{locale:this.locale(),folderId:this.workspace.query().folderId??null,folders:()=>this.workspace.folderRows(),current:()=>this.workspace.status()?.libraryId===libraryId&&(!this.workspace.status()?.security?.configured||!!this.workspace.status()?.security?.unlocked),prepare:()=>this.workspace.releaseSelection(),refresh:async()=>{await this.workspace.refresh();}},panelClass:'app-dialog-panel',backdropClass:'app-dialog-backdrop',width:'760px',maxWidth:'calc(100vw - 32px)',ariaLabel:this.bulkLabel(),restoreFocus:true,disableClose:true});
  }
  private readonly writingDialogs = inject(Dialog);
  contextLabel(key:ContextKey):string{return contextText(this.locale(),key);}
  contextBusy():boolean{return this.composing||this.workspace.switching()||this.workspace.exitLocked();}
  async noteContextAction(action:'rename'|'duplicate'|'delete'|'move'|'tags',note:NoteSummary,libraryId:string):Promise<void>{
    if(this.contextBusy()||this.workspace.status()?.libraryId!==libraryId)return;
    await this.workspace.select(note.id);if(this.workspace.session()?.note.id!==note.id)return;
    if(action==='delete'){await this.workspace.lifecycleAction('trash');return;}
    if(action==='duplicate'){await this.workspace.duplicateNote((this.workspace.title().slice(0,260)+this.contextLabel('copySuffix')).slice(0,300));return;}
    const current=this.workspace.session()!.note;
    const answer=await firstValueFrom(this.writingDialogs.open<string|string[]>(NoteContextDialog,{data:{action,locale:this.locale(),title:this.workspace.title(),folderId:current.folderId,tagIds:current.tagIds,folders:this.workspace.folderRows(),tags:this.workspace.sortedTags()},panelClass:'app-dialog-panel',backdropClass:'app-dialog-backdrop',width:'480px',maxWidth:'calc(100vw - 32px)',ariaLabelledBy:'note-context-title',restoreFocus:false}).closed);
    if(answer===undefined||this.workspace.status()?.libraryId!==libraryId||this.workspace.session()?.note.id!==note.id)return;
    if(action==='rename'&&typeof answer==='string'){this.workspace.updateTitle(answer);await this.workspace.manualSave();}
    else if(action==='move'&&typeof answer==='string')await this.workspace.place({folderId:answer||null});
    else if(action==='tags'&&Array.isArray(answer))await this.workspace.place({tagIds:[...new Set([...this.workspace.session()!.note.tagIds,...answer])]});
  }
  private editContext?:{element:HTMLElement;range:Range|null;start:number;end:number;noteId:string;libraryId:string;source:boolean;selected:boolean};
  readonly editContextSelection=signal(false);
  private readonly captureEditContext=(event:Event)=>{
    const target=event.target;if(!(target instanceof HTMLElement))return;
    const element=target.closest<HTMLElement>('[data-testid=body-source],.ql-editor');if(!element||!this.workspace.session()||this.workspace.switching()||this.composing)return;
    const source=element instanceof HTMLTextAreaElement,start=source?element.selectionStart:0,end=source?element.selectionEnd:0,selection=window.getSelection();
    const range=!source&&selection?.rangeCount&&element.contains(selection.anchorNode)&&element.contains(selection.focusNode)?selection.getRangeAt(0).cloneRange():null;
    const selected=source?end>start:!!range&&!range.collapsed;this.editContextSelection.set(selected);
    this.editContext={element,range,start,end,source,selected,noteId:this.workspace.session()!.note.id,libraryId:this.workspace.status()!.libraryId};
  };
  async editContextAction(action:'cut'|'copy'|'paste'|'selectAll'):Promise<void>{
    const context=this.editContext;if(!context||!context.element.isConnected||this.workspace.switching()||this.composing||this.workspace.exitLocked()||context.noteId!==this.workspace.session()?.note.id||context.libraryId!==this.workspace.status()?.libraryId)return;
    context.element.focus({preventScroll:true});
    if(context.source)(context.element as HTMLTextAreaElement).setSelectionRange(context.start,context.end);
    else if(context.range){const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(context.range);}
    try{await window.notebookAid.editCommand(action);}catch{this.fileMessage.set(this.t('failed'));}
  }
  informationLabel(key:InformationKey):string{return informationText(this.locale(),key);}
  showInformation(page:InformationPage):void{
    const ref=this.writingDialogs.open(InformationDialog,{data:{page,locale:this.locale(),version:this.runtime()?.version??'—'},panelClass:'app-dialog-panel',backdropClass:'app-dialog-backdrop',width:'720px',maxWidth:'calc(100vw - 32px)',ariaLabelledBy:'information-title',autoFocus:'[data-testid=information-close]',restoreFocus:false});
    ref.closed.subscribe(()=>requestAnimationFrame(()=>{if(!this.writingDialogs.openDialogs.length&&!this.onboarding.active())document.querySelector<HTMLElement>('[data-testid=application-menu]')?.focus({preventScroll:true});}));
  }
  writingLabel(): string { return writingText(this.locale(), 'title'); }
  formatLabel(key:'underline'|'strike'|'color'|'background'):string{return writingText(this.locale(),key);}
  async openWriting(): Promise<void> {
    const session = this.workspace.session(), libraryId = this.workspace.status()?.libraryId;
    if (!session || !libraryId || this.composing || this.workspace.switching() || this.prefs.state().global.aiEnabled===false) return;
    const raw = this.sourceMode() || this.warning() || this.format() === 'text';
    if (raw && this.format() === 'delta') return;
    const textarea = document.querySelector<HTMLTextAreaElement>('[data-testid=body-source]');
    const range = raw ? { index: textarea?.selectionStart ?? 0, length: (textarea?.selectionEnd ?? 0) - (textarea?.selectionStart ?? 0) } : (this.editor.getSelection() ?? { index: 0, length: 0 });
    const selection = raw ? this.source().slice(range.index, range.index + range.length) : this.editor.getText(range.index, range.length);
    if (!await this.workspace.flush()) return;
    const original = this.source(), noteId = session.note.id;
    const current = () => this.workspace.session()?.note.id === noteId && this.workspace.status()?.libraryId === libraryId && this.source() === original;
    const data: WritingDialogData = { locale: this.locale(), translationLocale:this.prefs.state().global.translationLocale??this.locale(), selection, note: this.workspace.session()!.note, stale: !!session.note.generatedSummary && (session.note.generatedSummary.sourceContentVersion !== session.note.contentVersion || original !== session.note.body), libraryId, sourceMode: raw, current,
      context: async summary => {
        if (!current()) throw Error('RESULT_EXPIRED');
        if (summary) { const entry = this.workspace.registry().entries.find(item => item.current); if (entry && (entry.schemaVersion ?? 0) < 9) { const upgraded = await this.workspace.securityChange(() => window.notebookAid.library.upgradeLibrary(entry.id, entry.schemaVersion!)); if (!upgraded?.ok || !upgraded.value) return null; } }
        if (!current() || !await this.workspace.flush()) throw Error('RESULT_EXPIRED');
        const active = this.workspace.session()!; return { noteId, token: active.token, generation: active.generation, expectedVersion: active.note.version, operationId: crypto.randomUUID() };
      },
      apply: async (text, mode, scope) => {
        if (!current()) throw Error('RESULT_EXPIRED');
        if (raw) { const index=scope==='selection'?range.index:0,length=scope==='selection'?range.length:original.length; this.workspace.updateBody(mode==='replace'?original.slice(0,index)+text+original.slice(index+length):original.slice(0,index+length)+'\n'+text+original.slice(index+length)); this.record(); this.loadSource(); }
        else { const index=scope==='selection'?range.index:0,length=scope==='selection'?range.length:this.editor.getLength()-1;
          this.editor.history.cutoff(); this.editor.updateContents(new Delta().retain(mode==='replace'?index:index+length).delete(mode==='replace'?length:0).insert(mode==='replace'?text:'\n'+text),'user'); this.editor.history.cutoff();
        }
      },
      saved: note => { const active=this.workspace.session(); if(active&&active.note.id===note.id){this.workspace.session.set({...active,note});void this.workspace.refresh();} }
    };
    this.writingDialogs.open(WritingDialog,{data,panelClass:'app-dialog-panel',backdropClass:'app-dialog-backdrop',width:'760px',maxWidth:'calc(100vw - 32px)',ariaLabel:this.writingLabel(),restoreFocus:true});
  }
  readonly missedBackup = signal(false);
  showMissedBackupSettings():void{const status=this.workspace.status();if(status)this.showLibrarySettings(status.libraryId);else this.tab.set('settings');this.missedBackup.set(false);}
  backupLabel(key: 'missed' | 'settings'): string { return backupText(this.locale(), key); }
  private readonly dialogs = inject(AppDialogs);
  readonly workspace = inject(NoteWorkspace);
  @ViewChild(SettingsComponent) settingsPanel?: SettingsComponent;
  readonly activeLibrary = computed(() => this.workspace.registry().entries.find(item => item.current));
  showLibrarySettings(id: string): void { this.editorFullscreen.set(false); this.tab.set('settings'); this.settingsPanel?.select(id); this.settingsPanel?.section.set('library'); }
  readonly notifications = inject(NotificationService);
  @ViewChild('editorHost', { static: true }) host!: ElementRef<HTMLElement>;
  @ViewChild('toolbarHost', { static: true }) toolbar!: ElementRef<HTMLElement>;
  @ViewChild(AttachmentsComponent) attachmentsPanel?: AttachmentsComponent;
  @ViewChild('folderTrigger') folderTrigger?: CdkMenuTrigger;
  readonly sidebarCollapsed = computed(() => this.prefs.state().global.sidebarCollapsed ?? false);
  readonly editorFullscreen = signal(false);
  readonly editorToolsOpen = signal(false);
  readonly exportMenuOpen = signal(false);
  toggleSidebar(): void { this.folderTrigger?.close(); this.newNoteMenuOpen.set(false); void this.prefs.update({ sidebarCollapsed: !this.sidebarCollapsed() }); }
  toggleEditorFullscreen(): void {
    if (this.tab() !== 'editor' || !this.workspace.session()) return;
    this.folderTrigger?.close(); this.tagMenuOpen.set(false); this.newNoteMenuOpen.set(false);
    this.editorFullscreen.update(value => !value);
  }
  readonly tagFilterOpen = signal(false);
  readonly tagMenuOpen = signal(false);
  readonly tagMenuNote = computed(() => this.workspace.session()?.note.id);
  readonly selectedImage = signal<HTMLImageElement | null>(null);
  @ViewChild('imageSizePanel') imageSizePanel?: ElementRef<HTMLElement>;
  readonly imagePanelPosition = signal({ left: 0, top: 0, width: 760, visible: false });
  private imagePositionFrame = 0;
  private readonly positionImagePanel = () => {
    if (this.imagePositionFrame) return;
    this.imagePositionFrame = requestAnimationFrame(() => {
      this.imagePositionFrame = 0;
      const image = this.selectedImage(), panel = this.imageSizePanel?.nativeElement;
      const pane = this.host.nativeElement.closest('.editor-pane');
      if (!image?.isConnected || !panel || !pane) return;
      const bounds = pane.getBoundingClientRect(), rect = image.getBoundingClientRect();
      const heading = pane.querySelector('.editor-heading')?.getBoundingClientRect();
      const left = Math.max(8, bounds.left + 12), right = Math.min(innerWidth - 8, bounds.right - 12);
      const top = Math.max(8, bounds.top, heading?.bottom ?? 0) + 8, bottom = Math.min(innerHeight - 8, bounds.bottom - 8);
      const visible = rect.bottom > top && rect.top < bottom && rect.right > left && rect.left < right;
      const width = Math.max(1, Math.min(760, right - left));
      const height = panel.getBoundingClientRect().height;
      const x = Math.max(left, Math.min((Math.max(left, rect.left) + Math.min(right, rect.right) - width) / 2, right - width));
      const y = rect.bottom + 10 + height <= bottom ? rect.bottom + 10 : Math.max(top, Math.min((Math.max(top, rect.top) + Math.min(bottom, rect.bottom) - height) / 2, bottom - height));
      this.imagePanelPosition.set({ left: x, top: y, width, visible });
    });
  };
  imageWidth = 1; imageHeight = 1; imageScale = 100; imageScaleMax = 200; imageKeepRatio = true;
  private imageOriginalWidth = 1; private imageOriginalHeight = 1;
  private readonly selectImage = (event: Event) => {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || !image.naturalWidth || !image.naturalHeight || image.hasAttribute('aria-label')) { this.selectedImage.set(null); return; }
    this.imageOriginalWidth = image.naturalWidth; this.imageOriginalHeight = image.naturalHeight;
    this.imageWidth = Number(image.getAttribute('width')) || image.naturalWidth;
    this.imageHeight = Number(image.getAttribute('height')) || image.naturalHeight;
    this.imageScale = Math.round(this.imageWidth / image.naturalWidth * 100);
    this.imageScaleMax = Math.max(200, this.imageScale);
    this.imageKeepRatio = Math.abs(this.imageWidth / this.imageHeight - image.naturalWidth / image.naturalHeight) < 0.01;
    this.selectedImage.set(image);
  };
  resizeImage(axis: 'width' | 'height' | 'scale', value: number): void {
    const image = this.selectedImage();
    if (!image?.isConnected || this.workspace.switching() || this.warning() || this.sourceMode() || !Number.isFinite(value) || value <= 0) return;
    let width = this.imageWidth, height = this.imageHeight;
    const ratio = this.imageOriginalWidth / this.imageOriginalHeight;
    if (axis === 'scale') { width = this.imageOriginalWidth * Math.min(this.imageScaleMax, value) / 100; height = this.imageKeepRatio ? width / ratio : height * width / this.imageWidth; }
    else if (axis === 'width') { width = value; if (this.imageKeepRatio) height = width / ratio; }
    else { height = value; if (this.imageKeepRatio) width = height * ratio; }
    const limit = Math.min(1, 8192 / Math.max(width, height));
    this.imageWidth = Math.max(1, Math.round(width * limit)); this.imageHeight = Math.max(1, Math.round(height * limit));
    this.imageScale = Math.round(this.imageWidth / this.imageOriginalWidth * 100);
    if (axis !== 'scale') this.imageScaleMax = Math.max(200, this.imageScale);
    const blot = Quill.find(image);
    if (blot && 'offset' in blot) this.editor.formatText(blot.offset(this.editor.scroll), 1, { width: String(this.imageWidth), height: String(this.imageHeight) }, 'user');
  }
  lockImageRatio(value: boolean): void { this.imageKeepRatio = value; if (value) this.resizeImage('width', this.imageWidth); }
  readonly inTable = signal(false);
  readonly inCodeBlock = signal(false);
  readonly languages = languages;
  readonly prefs = inject(Preferences);
  readonly locale = this.prefs.locale;
  readonly theme = this.prefs.theme;
  readonly ready = signal(false);
  l(key: LifecycleKey): string { return lifecycleText(this.locale(), key); }
  readonly historyNoteId = signal('');
  async openHistory(): Promise<void> { if (await this.workspace.flush()) { this.historyNoteId.set(this.workspace.session()?.note.id || ''); this.editorFullscreen.set(false); this.tab.set('history'); } }
  async trashCurrent(): Promise<void> { if (await this.workspace.lifecycleAction('trash')) { this.editorFullscreen.set(false); this.tab.set('trash'); } else { requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('[data-testid=note-trash]')?.focus()); } }
  readonly tab = signal<'editor' | 'diagnostics' | 'settings' | 'libraries' | 'organization' | 'trash' | 'history'>('editor');
  readonly runtime = signal<RuntimeInfo | null>(null);
  readonly sqliteResult = signal('');
  readonly roundtripResult = signal('');
  readonly roundtripStatus = signal('');
  readonly busy = signal(false);
  readonly warning = signal(false);
  readonly issues = signal<SourceIssue[]>([]);
  readonly sourceMode = signal(false);
  readonly sourceFormatError = signal(false);
  readonly sourcePretty = computed(() => {
    const format = this.format(), source = this.workspace.body();
    if (format !== 'html' && format !== 'delta') return false;
    try { return formatSource(source, format, false) !== source; } catch { return false; }
  });
  toggleSourceFormatting(): void {
    const format = this.format();
    if (this.composing || this.workspace.switching() || !this.workspace.session() || (format !== 'html' && format !== 'delta')) return;
    try { this.editSource(formatSource(this.source(), format, !this.sourcePretty())); }
    catch { this.sourceFormatError.set(true); }
  }
  readonly historyVersion = signal(0);
  readonly history = new BodyHistory();
  readonly newNoteMenuOpen = signal(false);
  readonly expandedFolders = signal<Set<string>>(new Set());
  hasChildren(id: string): boolean { return this.workspace.organization().folders.some(folder => folder.parentId === id); }
  folderVisible(id: string): boolean {
    let parent = this.workspace.organization().folders.find(folder => folder.id === id)?.parentId;
    while (parent) { if (!this.expandedFolders().has(parent)) return false; parent = this.workspace.organization().folders.find(folder => folder.id === parent)?.parentId; }
    return true;
  }
  toggleFolder(id: string): void { this.expandedFolders.update(value => { const next = new Set(value); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  readonly noteFormats: NoteFormat[] = ['markdown', 'html', 'text', 'delta'];
  readonly exportFormat = signal<NoteFormat>('markdown');
  readonly exportPreview = signal<NoteInput | null>(null);
  readonly fileMessage = signal('');
  readonly fileBusy = signal(false);
  private composing = false;
  filterTag(id: string): void { const tags = this.workspace.query().tagIds ?? []; this.workspace.filter({ tagIds: tags.includes(id) ? tags.filter(tag => tag !== id) : [...tags, id] }); }
  format(): NoteFormat { return this.workspace.session()?.note.primaryFormat ?? 'markdown'; }
  createNote(format: NoteFormat): void { this.newNoteMenuOpen.set(false); this.tab.set('editor'); void this.workspace.create({ primaryFormat: format, title: this.t('untitled'), body: format === 'delta' ? emptyDelta : '', folderId: this.workspace.query().folderId ?? null }); }
  importNote(): void { this.newNoteMenuOpen.set(false); this.tab.set('editor'); void this.workspace.importFile(); }
  canUndo(): boolean { this.historyVersion(); return this.history.canUndo; }
  canRedo(): boolean { this.historyVersion(); return this.history.canRedo; }
  private record(): void { if (!this.composing) { this.history.push(this.source()); this.historyVersion.update(value => value + 1); } }
  undo(redo = false): void {
    if (this.composing || this.workspace.switching() || !this.workspace.session()) return;
    this.workspace.updateBody(redo ? this.history.redo() : this.history.undo());
    this.historyVersion.update(value => value + 1); this.loadSource();
  }
  closeTagMenu(event: KeyboardEvent): void {
    if (event.key === 'Escape') { this.tagMenuOpen.set(false); event.preventDefault(); }
  }
  selectEditorMode(value: boolean, event: Event): void {
    this.toggleSource(value);
    // Restore the actual mode when conversion protection or composition prevents switching.
    const group = (event.target as HTMLInputElement).closest('.segmented-radio');
    group?.querySelectorAll<HTMLInputElement>('input').forEach(input => {
      input.checked = (input.dataset['testid'] === 'source-mode') === (this.sourceMode() || this.warning());
    });
  }
  toggleSource(value: boolean): void { if (this.composing) return; this.sourceMode.set(value); if (!value) this.loadSource(); }
  prepareExport(): void {
    if (!this.workspace.session() || this.composing) return;
    if (this.format() === 'delta') {
      this.loadSource(); if (this.warning()) return;
      const body = this.exportFormat() === 'delta' ? this.source() : convertBody(semanticHtml(this.editor.getSemanticHTML()), 'html', this.exportFormat());
      this.exportPreview.set({ primaryFormat: this.exportFormat(), title: this.title, body, attachmentNoteId: this.workspace.session()!.note.id });
    } else this.exportPreview.set({ primaryFormat: this.exportFormat() === 'delta' ? 'markdown' : this.exportFormat(), title: this.title, body: convertBody(this.source(), this.format(), this.exportFormat() === 'delta' ? 'markdown' : this.exportFormat()) });
    this.fileMessage.set('');
  }
  async saveExport(): Promise<void> {
    const input = this.exportPreview(); if (!input || this.fileBusy()) return;
    this.fileBusy.set(true);
    try { const result = await window.notebookAid.library.exportFile(input); this.fileMessage.set(!result.ok ? `${this.t('exportFailed')} · ${result.code}` : result.value ? this.t('exportSuccess') : this.t('exportCancelled')); }
    catch { this.fileMessage.set(this.t('exportFailed')); }
    finally { this.fileBusy.set(false); }
  }
  get title(): string { return this.workspace.title(); }
  set title(value: string) { this.workspace.updateTitle(value); }
  readonly source = this.workspace.body;
  private readonly sanitizer = inject(DomSanitizer);
  readonly htmlPreview = computed(() => this.sanitizer.bypassSecurityTrustHtml(this.format() === 'html' ? isolatedHtmlDocument(this.source()) : ''));
  readonly loadedSource = signal('');
  readonly sourcePending = signal(false);
  private readonly onEditorChange = (_delta: unknown, _previous: unknown, origin: string) => {
    if (origin !== 'user') return;
    if (this.warning() || this.sourcePending() || this.format() === 'text') return;
    this.workspace.updateBody(this.format() === 'delta' ? deltaSnapshot(this.editor.getContents().ops as DeltaOp[]) : this.format() === 'html' ? cleanHtml(semanticHtml(this.editor.getSemanticHTML())) : this.toMarkdown());
    this.record();
    this.roundtripResult.set('');
    this.roundtripStatus.set('');
  };
  private editor!: Quill;
  private readonly media = matchMedia('(prefers-color-scheme: dark)');
  private readonly themeListener = () => this.applyTheme();
  private readonly preventNavigation = (event: Event) => {
    if ((event.target as Element).closest('a')) event.preventDefault();
  };
  readonly compositionStart = () => { this.composing = true; this.workspace.setComposing(true); };
  readonly compositionEnd = () => { this.composing = false; this.record(); this.workspace.setComposing(false); };
  private readonly keyboard = (event: KeyboardEvent) => {
    if (this.onboarding.active() || event.isComposing || event.defaultPrevented || this.dialogs.opened || this.writingDialogs.openDialogs.length || this.workspace.exitLocked()) return;
    const overlay = !!document.querySelector('.cdk-overlay-pane:not(.notification-overlay):not(.sidebar-tooltip-overlay)');
    if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.repeat && !overlay && !this.notifications.drawerOpen() && !this.workspace.switching()) {
      const key = event.key.toLowerCase();
      if (['+', '=', '-', '0'].includes(key)) { event.preventDefault(); void this.prefs.update({ zoomPercent: nextZoom(this.prefs.state().global.zoomPercent ?? 100, key === '0' ? 0 : key === '-' ? -1 : 1) }); return; }
      if (!event.shiftKey && key === 'n' && this.workspace.status()) { event.preventDefault(); this.editorFullscreen.set(false); this.newNoteMenuOpen.set(true); setTimeout(() => document.querySelector<HTMLButtonElement>('[data-testid=create-markdown]')?.focus()); return; }
      if (!event.shiftKey && key === 'f') { event.preventDefault(); this.editorFullscreen.set(false); this.tab.set('editor'); setTimeout(() => document.querySelector<HTMLInputElement>('[data-testid=note-search]')?.focus()); return; }
      if (key === ',') { event.preventDefault(); this.tab.set('settings'); return; }
    }
    if (overlay && event.key !== 'Escape') return;
    if (event.key === 'Escape' && (this.editorToolsOpen() || this.exportMenuOpen())) { this.editorToolsOpen.set(false); this.exportMenuOpen.set(false); event.preventDefault(); return; }
    if (!event.isComposing && event.ctrlKey && event.shiftKey && event.code === 'KeyF') { event.preventDefault(); if (!event.repeat) this.toggleEditorFullscreen(); return; }
    if (event.key === 'Escape' && this.selectedImage()) { this.selectedImage.set(null); event.preventDefault(); return; }
    if (event.key === 'Escape' && this.editorFullscreen() && !event.defaultPrevented && !document.querySelector('.cdk-overlay-pane:not(.notification-overlay):not(.sidebar-tooltip-overlay)')) { this.editorFullscreen.set(false); event.preventDefault(); return; }
    if (event.key === 'Escape' && this.newNoteMenuOpen()) { this.newNoteMenuOpen.set(false); document.querySelector<HTMLButtonElement>('[data-testid=create-note]')?.focus(); }
    if (this.tab() === 'editor' && this.workspace.session() && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void this.workspace.manualSave(); }
    const target = event.target as HTMLElement;
    if ((event.ctrlKey || event.metaKey) && target.closest('.editor-area,.body-source,[data-testid=markdown-source]') && ['z', 'y'].includes(event.key.toLowerCase())) {
      event.preventDefault(); event.stopImmediatePropagation(); this.undo(event.shiftKey || event.key.toLowerCase() === 'y');
    }
  };
  private readonly closeEditorMenus = (event: PointerEvent) => {
    if (!(event.target instanceof Element) || !event.target.closest('.editor-actions,.cdk-overlay-pane')) {
      this.editorToolsOpen.set(false); this.exportMenuOpen.set(false);
    }
  };
  private readonly stopDesktopTarget = window.notebookAid.openDesktopTarget(async target => {
    for (let n = 0; n < 150 && (!this.ready() || !this.workspace.status()); n++) await new Promise(resolve => setTimeout(resolve, 100));
    if (this.workspace.status()?.libraryId !== target.libraryId) return false;
    this.tab.set('editor'); await this.workspace.refresh(); await this.workspace.select(target.noteId);
    return this.workspace.session()?.note.id === target.noteId;
  });
  constructor() {
    effect(() => {
      const enabled = this.editorFullscreen();
      this.editorToolsOpen.set(false); this.exportMenuOpen.set(false);
      void window.notebookAid.editorFullscreen(enabled).catch(() => { this.editorFullscreen.set(false); });
    });
    effect(onCleanup => {
      const image = this.selectedImage();
      if (!image) return;
      if (this.tab() !== 'editor' || this.sourceMode() || this.warning()) { this.selectedImage.set(null); return; }
      this.imagePanelPosition.update(value => ({ ...value, visible: false }));
      const observer = new ResizeObserver(this.positionImagePanel);
      observer.observe(image);
      const pane = this.host.nativeElement.closest('.editor-pane');
      if (pane) observer.observe(pane);
      const frame = requestAnimationFrame(() => { if (this.imageSizePanel) observer.observe(this.imageSizePanel.nativeElement); this.positionImagePanel(); });
      document.addEventListener('scroll', this.positionImagePanel, true);
      window.addEventListener('resize', this.positionImagePanel);
      this.positionImagePanel();
      onCleanup(() => { observer.disconnect(); cancelAnimationFrame(frame); cancelAnimationFrame(this.imagePositionFrame); this.imagePositionFrame = 0; document.removeEventListener('scroll', this.positionImagePanel, true); window.removeEventListener('resize', this.positionImagePanel); });
    });
    effect(() => { if (this.tab() !== 'editor' || !this.workspace.session()) this.editorFullscreen.set(false); });
    effect(() => { this.tab(); this.tagMenuNote(); this.tagMenuOpen.set(false); });
    effect(() => { this.tab(); this.sourceMode(); this.workspace.opened();this.editContext=undefined;this.editContextSelection.set(false);this.editorToolsOpen.set(false); this.exportMenuOpen.set(false); });
    effect(() => { this.theme(); this.locale(); this.applyTheme(); });
    effect(() => { if (this.prefs.ready()) void window.notebookAid.uiZoom(this.prefs.state().global.zoomPercent ?? 100).catch(() => this.uiFailure.visible.set(true)); });
    effect(() => { if (this.ready() && this.prefs.ready() && this.runtime()?.onboardingAutoStart && (this.workspace.status() || this.workspace.libraryUnavailable()) && !this.workspace.switching() && !this.workspace.exitLocked() && !this.notifications.drawerOpen()) untracked(()=>this.onboarding.offer()); });
    effect(() => { if(this.workspace.exitLocked() && this.onboarding.active()) untracked(()=>this.onboarding.stop()); });
    effect(() => { if (this.workspace.libraryUnavailable()) this.tab.set('libraries'); });
    effect(() => {
      const ready = this.ready(); this.workspace.opened();
      if (ready) untracked(() => { if (!this.workspace.session()) { this.historyNoteId.set(''); if (this.tab() === 'history' || this.tab() === 'trash') this.tab.set('editor'); } this.sourceFormatError.set(false); this.inTable.set(false); this.inCodeBlock.set(false); this.history.reset(this.source()); this.historyVersion.update(value => value + 1); this.sourceMode.set(false); this.exportPreview.set(null); this.fileMessage.set(''); this.loadSource(); });
    });
  }

  ngAfterViewInit(): void {
    this.applyTheme();
    this.media.addEventListener('change', this.themeListener);
    Quill.register('formats/link', NoteLink, true);
    registerNoteFormats();
    this.editor = new Quill(this.host.nativeElement, {
      theme: 'snow',
      formats: ['header', 'bold', 'italic', 'underline', 'strike', 'color', 'background', 'blockquote', 'code', 'code-block', 'code-token', 'list', 'indent', 'link', 'image', 'table', 'cell-header', 'cell-align'],
      modules: { table: true, syntax: { hljs, languages: codeLanguages.map(key => ({ key, label: key })) }, toolbar: { container: this.toolbar.nativeElement, handlers: { image: () => void this.attachmentsPanel?.chooseImage() } } }
    });
    this.editor.clipboard.addMatcher('PRE', (input: Node) => {
      const node = input as HTMLElement;
      const language = node.getAttribute('data-language') ?? node.querySelector('code')?.className.replace(/^language-/, '') ?? 'plain';
      const text = node.querySelector('code')?.textContent ?? (node.textContent ?? '').replace(/\n$/, '');
      return text.split('\n').reduce((delta, line) => delta.insert(line).insert('\n', { 'code-block': codeLanguages.includes(language) ? language : 'plain' }), new Delta());
    });
    this.editor.clipboard.addMatcher('TH, TD', (input: Node, delta: Delta) => {
      const node = input as HTMLElement;
      const attributes: Record<string, string> = {};
      if (node.tagName === 'TH' || node.getAttribute('data-cell-header') === 'true') attributes['cell-header'] = 'true';
      const align = node.getAttribute('align') ?? node.getAttribute('data-cell-align');
      if (align && ['left', 'center', 'right'].includes(align)) attributes['cell-align'] = align;
      return new Delta(delta.ops.map(op => typeof op.insert === 'string' && op.insert.includes('\n') ? { ...op, attributes: { ...op.attributes, ...attributes } } : op));
    });
    this.host.nativeElement.addEventListener('click', this.preventNavigation);
    this.host.nativeElement.addEventListener('click', this.selectImage);
    this.host.nativeElement.addEventListener('compositionstart', this.compositionStart);
    this.host.nativeElement.addEventListener('compositionend', this.compositionEnd);
    window.addEventListener('keydown', this.keyboard, true);
    document.addEventListener('pointerdown', this.closeEditorMenus);
    this.loadSource();
    this.editor.on('text-change', this.onEditorChange);
    this.editor.on('editor-change', () => this.updateEditorContext());
    this.localizeEditor();
    this.onboarding.attach({prepare:()=>{this.editorFullscreen.set(false);this.newNoteMenuOpen.set(false);this.folderTrigger?.close();this.tagMenuOpen.set(false);this.editorToolsOpen.set(false);this.exportMenuOpen.set(false);this.tab.set('editor');},settings:()=>{this.tab.set('settings');this.settingsPanel?.section.set('global');requestAnimationFrame(()=>document.querySelector('[data-testid=onboarding-settings]')?.scrollIntoView({block:'center'}));},available:()=>this.ready()&&!this.workspace.switching()&&!this.workspace.exitLocked()&&!this.notifications.drawerOpen()&&!this.composing});
    document.addEventListener('contextmenu',this.captureEditContext,true);
    this.ready.set(true);
    void this.workspace.init();
    void window.notebookAid.library.backups().then(result => { if (result.ok) this.missedBackup.set(result.value.missed.length > 0); }).catch(() => {});
    window.notebookAid.runtime().then(value => this.runtime.set(value)).catch(() => this.sqliteResult.set(this.t('failed')));
  }
  ngOnDestroy(): void {
    document.removeEventListener('contextmenu',this.captureEditContext,true);
    this.onboarding.stop();
    this.stopDesktopTarget();
    document.removeEventListener('pointerdown', this.closeEditorMenus);
    this.editor?.off('text-change', this.onEditorChange);
    this.media.removeEventListener('change', this.themeListener);
    this.host.nativeElement.removeEventListener('click', this.preventNavigation);
    this.host.nativeElement.removeEventListener('click', this.selectImage);
    this.host.nativeElement.removeEventListener('compositionstart', this.compositionStart);
    this.host.nativeElement.removeEventListener('compositionend', this.compositionEnd);
    window.removeEventListener('keydown', this.keyboard, true);
  }
  focusMain(): void { document.getElementById('main-content')?.focus(); }
  readonly onboarding = inject(Onboarding);
  readonly uiFailure = inject(UiFailure);
  ui(key: UiKey): string { return uiText(this.locale(), key); }
  errorText(code: string): string { return errorText(this.locale(), code); }
  t(key: MessageKey): string { return translate(this.locale(), key); }
  securityLabel(key: SecurityKey): string { return securityText(this.locale(), key); }
  async setLocale(event: Event): Promise<void> {
    const input = event.target as HTMLSelectElement;
    await this.prefs.update({ locale: input.value as Locale }); input.value = this.locale();
  }
  async setTheme(event: Event): Promise<void> {
    const input = event.target as HTMLSelectElement;
    await this.prefs.update({ theme: input.value as Theme }); input.value = this.theme();
  }
  loadSource(): void {
    this.selectedImage.set(null);
    this.sourcePending.set(false);
    this.loadedSource.set(this.source());
    this.issues.set(sourceIssues(this.source(), this.format()));
    this.warning.set(this.issues().length > 0);
    if (this.format() === 'delta') {
      if (!this.warning()) {
        const input = new Delta(parseDelta(this.source()).ops);
        this.editor.setContents(input, 'api');
        if (this.normalizedDelta(input) !== this.normalizedDelta(this.editor.getContents())) { this.issues.set([{ kind: 'issueRoundtrip', detail: 'Delta', count: 1 }]); this.warning.set(true); }
      }
      this.editor.enable(!!this.workspace.session() && !this.warning());
      (this.editor.getModule('history') as { clear(): void }).clear();
      void this.hydrateImages(); return;
    }
    const delta = this.editor.clipboard.convert({ html: previewHtml(this.source(), this.format()) });
    this.editor.setContents(delta, 'api');
    if (this.format() !== 'text' && !this.warning()) {
      const output = this.format() === 'markdown' ? this.toMarkdown() : cleanHtml(semanticHtml(this.editor.getSemanticHTML()));
      const back = this.editor.clipboard.convert({ html: previewHtml(output, this.format()) });
      if (this.normalizedDelta(delta) !== this.normalizedDelta(back)) {
        const formats = [...new Set([...delta.ops, ...back.ops].flatMap(op => Object.keys(op.attributes ?? {})))].join(', ');
        this.issues.set([{ kind: 'issueRoundtrip', detail: formats, count: 1 }]); this.warning.set(true);
      }
    }
    this.editor.enable(!!this.workspace.session() && !this.warning() && this.format() !== 'text');
    (this.editor.getModule('history') as { clear(): void }).clear();
    this.roundtripResult.set('');
    this.roundtripStatus.set('');
    void this.hydrateImages();
  }
  insertAttachmentImage(id: string): void {
    if (this.workspace.switching() || !this.workspace.session()?.note.attachments?.some(item => item.id === id)) return;
    const reference = 'attachments/' + id;
    if (this.format() === 'delta' && (this.sourceMode() || this.warning())) {
      try { const document = parseDelta(this.source()); document.ops.splice(document.ops.length - 1, 0, { insert: { image: reference } }, { insert: '\n' }); this.editSource(deltaSnapshot(document.ops)); } catch { this.loadSource(); }
      return;
    }
    if (this.sourceMode() || this.warning() || this.format() === 'text') {
      this.editSource(this.source() + '\n' + (this.format() === 'html' ? '<img src="' + reference + '">' : this.format() === 'markdown' ? '![](' + reference + ')' : reference));
    } else {
      const index = this.editor.getSelection(true)?.index ?? this.editor.getLength() - 1;
      this.editor.insertEmbed(index, 'image', reference, 'user'); this.editor.setSelection(index + 1);
      void this.hydrateImages();
    }
  }
  private async hydrateImages(): Promise<void> {
    const session = this.workspace.session(); if (!session) return;
    let reportedCleaning = false;
    const requests = new Map<string, ReturnType<typeof window.notebookAid.library.previewAttachment>>();
    for (const node of this.host.nativeElement.querySelectorAll<HTMLImageElement>('img[data-note-src]')) {
      const reference = node.getAttribute('data-note-src') ?? '';
      const match = /^attachments\/([a-f0-9-]{36})$/i.exec(reference); if (!match) continue;
      if (!session.note.attachments?.some(item => item.id === match[1])) { node.setAttribute('aria-label', this.t('attachmentMissing')); continue; }
      try {
        if (!requests.has(match[1])) requests.set(match[1], window.notebookAid.library.previewAttachment(session.note.id, match[1]));
        const result = await requests.get(match[1])!;
        if (this.workspace.session()?.generation !== session.generation || !node.isConnected) return;
        if (result.ok && result.value.dataUrl) {
          node.src = result.value.dataUrl; node.removeAttribute('aria-label');
          if (result.value.removedUnsafeSvg && !reportedCleaning) { reportedCleaning = true; void this.notifications.publish('svgSanitized', 'open', this.workspace.status()?.libraryId); }
        }
        else node.setAttribute('aria-label', this.t('attachmentMissing'));
      } catch { node.setAttribute('aria-label', this.t('attachmentMissing')); }
    }
  }
  private normalizedDelta(delta: Delta): string {
    const rows = new Map<unknown, number>();
    return JSON.stringify(delta.ops.reduce((result, op) => result.insert(op.insert!, op.attributes), new Delta()).ops.map(op => {
      const attributes = { ...op.attributes }; delete attributes['code-token'];
      if (attributes['table'] != null) { const row = attributes['table']; if (!rows.has(row)) rows.set(row, rows.size + 1); attributes['table'] = rows.get(row); }
      return { ...op, attributes: Object.fromEntries(Object.entries(attributes).sort(([a], [b]) => a.localeCompare(b))) };
    }));
  }
  tableAction(action: 'insertTable' | 'insertRowAbove' | 'insertRowBelow' | 'insertColumnLeft' | 'insertColumnRight' | 'deleteRow' | 'deleteColumn' | 'deleteTable'): void {
    if (this.warning() || this.sourcePending() || this.workspace.switching() || !this.workspace.session()) return;
    this.editor.focus();
    const table = this.editor.getModule('table') as Table;
    const headerRows = action === 'insertColumnLeft' || action === 'insertColumnRight'
      ? Array.from(table.getTable()[1]?.domNode.closest('table')?.querySelectorAll('tr') ?? []).filter(row => row.children.length && Array.from(row.children).every(cell => cell.getAttribute('data-cell-header') === 'true')) : [];
    if (action === 'insertTable') {
      table.insertTable(3, 3);
      const [, row] = table.getTable();
      if (row) this.editor.formatLine(row.offset(this.editor.scroll), row.length(), 'cell-header', 'true', 'user');
    } else table[action]();
    headerRows.forEach(row => {
      const blot = Quill.find(row);
      if (blot && 'offset' in blot) this.editor.formatLine(blot.offset(this.editor.scroll), blot.length(), 'cell-header', 'true', 'user');
    });
    if (this.format() === 'markdown') this.host.nativeElement.querySelectorAll('table').forEach(element => {
      const rows = Array.from(element.rows);
      rows.forEach((row, index) => Array.from(row.cells).forEach((cell, column) => {
        const blot = Quill.find(cell);
        if (blot && 'offset' in blot) this.editor.formatLine(blot.offset(this.editor.scroll), 1, { 'cell-header': index === 0 ? 'true' : false, 'cell-align': rows[0]?.cells[column]?.getAttribute('data-cell-align') || false }, 'user');
      }));
    });
    this.updateEditorContext();
  }
  private updateEditorContext(): void {
    const range = this.editor.getSelection();
    if (!range) return;
    const language = this.editor.getFormat(range)['code-block'];
    this.inCodeBlock.set(!!language);
    this.selectedCodeLanguage.set(typeof language === 'string' ? language : 'plain');
    this.inTable.set(!!(this.editor.getModule('table') as Table).getTable(range)[0]);
  }
  setTableHeader(header: boolean): void {
    if (this.format() === 'markdown' || this.warning() || this.sourcePending() || this.workspace.switching()) return;
    this.editor.focus();
    const [, row] = (this.editor.getModule('table') as Table).getTable();
    if (!row) return;
    this.editor.formatLine(row.offset(this.editor.scroll), row.length(), 'cell-header', header ? 'true' : false, 'user');
    this.updateEditorContext();
  }
  readonly codeLanguages = codeLanguages;
  readonly selectedCodeLanguage = signal('plain');
  setCodeLanguage(value: string): void {
    if (!codeLanguages.includes(value) || this.warning() || this.sourcePending()) return;
    this.selectedCodeLanguage.set(value);
    const range = this.editor.getSelection(true);
    if (range) {
      const [line] = this.editor.getLine(range.index);
      const parent = line?.parent;
      if (parent?.domNode instanceof HTMLElement && parent.domNode.classList.contains('ql-code-block-container')) this.editor.formatLine(parent.offset(this.editor.scroll), parent.length(), 'code-block', value, 'user');
      else this.editor.formatLine(range.index, range.length, 'code-block', value, 'user');
    }
  }
  editSource(value: string): void {
    this.sourceFormatError.set(false);
    this.workspace.updateBody(value); this.record(); this.sourcePending.set(true); this.editor.enable(false);
    this.roundtripResult.set(''); this.roundtripStatus.set('');
  }
  saveLabel(): string { return this.t(this.workspace.saving() ? 'saving' : this.workspace.error() ? 'saveFailed' : this.workspace.dirty() ? 'unsaved' : 'saved'); }
  displayTime(value: string): string { return new Date(value).toLocaleString(regionalLocale(this.locale()), { dateStyle: 'short', timeStyle: 'short' }); }
  roundtrip(): void {
    if (this.format() === 'delta') { this.loadSource(); this.roundtripResult.set(this.source()); this.roundtripStatus.set(this.t(this.warning() ? 'changed' : 'passed')); return; }
    this.loadSource();
    if (this.format() === 'text' || this.warning()) { this.roundtripResult.set(this.source()); this.roundtripStatus.set(this.t('formatPreserved')); return; }
    const output = this.format() === 'html' ? cleanHtml(semanticHtml(this.editor.getSemanticHTML())) : this.toMarkdown();
    const before = this.editor.clipboard.convert({ html: previewHtml(this.source(), this.format()) });
    const after = this.editor.clipboard.convert({ html: previewHtml(output, this.format()) });
    this.roundtripResult.set(output);
    this.roundtripStatus.set(this.t(this.normalizedDelta(before) === this.normalizedDelta(after) ? 'passed' : 'changed'));
  }
  private toMarkdown(): string {
    return markdownFromHtml(semanticHtml(this.editor.getSemanticHTML()));
  }
  async probe(): Promise<void> {
    this.busy.set(true);
    try { this.sqliteResult.set(JSON.stringify(await window.notebookAid.probe(), null, 2)); void this.notifications.publish('sqliteSuccess', 'diagnostic'); }
    catch { this.sqliteResult.set(this.t('failed')); void this.notifications.publish('sqliteFailed', 'diagnostic'); }
    finally { this.busy.set(false); }
  }
  showLibraries(): void { this.tab.set('libraries'); void this.workspace.refreshRegistry(); }
  activeLibraryName(): string { return this.workspace.registry().entries.find(item => item.current)?.name ?? this.t('library'); }
  hide(): void { void window.notebookAid.hide(); }
  quit(): void { void window.notebookAid.quit(); }
  private localizeEditor(): void {
    if (!this.editor) return;
    const label = (value: string | null) => value ? this.t('heading') + ' ' + value : this.t('normalText');
    this.toolbar.nativeElement.querySelectorAll<HTMLOptionElement>('select.ql-header option').forEach(option => { option.textContent = label(option.value); });
    this.toolbar.nativeElement.querySelectorAll<HTMLElement>('.ql-header .ql-picker-item, .ql-header .ql-picker-label').forEach(item => { item.dataset['label'] = label(item.getAttribute('data-value')); });
    for (const key of ['color','background'] as const) this.toolbar.nativeElement.querySelectorAll<HTMLElement>('.ql-'+key+' .ql-picker-label').forEach(item=>{item.setAttribute('aria-label',this.formatLabel(key));item.title=this.formatLabel(key);});
    for (const key of ['visitLink', 'enterLink', 'editLink', 'removeLink', 'save'] as const) document.documentElement.style.setProperty('--quill-' + key, JSON.stringify(this.t(key)));
  }
  private applyTheme(): void {
    document.documentElement.dataset['theme'] = this.theme() === 'system' ? (this.media.matches ? 'dark' : 'light') : this.theme();
    document.documentElement.lang = regionalLocale(this.locale());
    this.localizeEditor();
  }
}
