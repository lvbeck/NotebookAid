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
import Quill from 'quill';
import Delta from 'quill-delta';
import hljs from 'highlight.js/lib/common';
import type Table from 'quill/modules/table';
import { codeLanguages, registerNoteFormats } from './editor-formats';
import { NoteLink } from './note-link';
import { cleanHtml, convertBody, markdownFromHtml, previewHtml, semanticHtml } from './note-codec';
import { BodyHistory } from '../../shared/body-history';
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
  selector: 'app-root', standalone: true, imports: [AttachmentsComponent, TooltipDirective, A11yModule, OverlayModule, CdkMenuModule, OrganizationComponent, SelectDirective, FormsModule, IconComponent, NotificationsComponent, LibrariesComponent, SettingsComponent],
  templateUrl: './app.component.html', host: { '[attr.data-ready]': 'ready()' }
})
export class AppComponent implements AfterViewInit, OnDestroy {
  readonly workspace = inject(NoteWorkspace);
  readonly notifications = inject(NotificationService);
  @ViewChild('editorHost', { static: true }) host!: ElementRef<HTMLElement>;
  @ViewChild('toolbarHost', { static: true }) toolbar!: ElementRef<HTMLElement>;
  @ViewChild(AttachmentsComponent) attachmentsPanel?: AttachmentsComponent;
  @ViewChild('folderTrigger') folderTrigger?: CdkMenuTrigger;
  readonly sidebarCollapsed = computed(() => this.prefs.state().global.sidebarCollapsed ?? false);
  readonly editorFullscreen = signal(false);
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
  readonly tab = signal<'editor' | 'diagnostics' | 'settings' | 'libraries' | 'organization'>('editor');
  readonly runtime = signal<RuntimeInfo | null>(null);
  readonly sqliteResult = signal('');
  readonly roundtripResult = signal('');
  readonly roundtripStatus = signal('');
  readonly busy = signal(false);
  readonly warning = signal(false);
  readonly issues = signal<SourceIssue[]>([]);
  readonly sourceMode = signal(false);
  readonly historyVersion = signal(0);
  readonly history = new BodyHistory();
  readonly newNoteMenuOpen = signal(false);
  readonly collapsedFolders = signal<Set<string>>(new Set());
  hasChildren(id: string): boolean { return this.workspace.organization().folders.some(folder => folder.parentId === id); }
  folderVisible(id: string): boolean {
    let parent = this.workspace.organization().folders.find(folder => folder.id === id)?.parentId;
    while (parent) { if (this.collapsedFolders().has(parent)) return false; parent = this.workspace.organization().folders.find(folder => folder.id === parent)?.parentId; }
    return true;
  }
  toggleFolder(id: string): void { this.collapsedFolders.update(value => { const next = new Set(value); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
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
    if (!event.isComposing && event.ctrlKey && event.shiftKey && event.code === 'KeyF') { event.preventDefault(); if (!event.repeat) this.toggleEditorFullscreen(); return; }
    if (event.key === 'Escape' && this.selectedImage()) { this.selectedImage.set(null); event.preventDefault(); return; }
    if (event.key === 'Escape' && this.editorFullscreen() && !event.defaultPrevented && !document.querySelector('.cdk-overlay-pane:not(.notification-overlay):not(.sidebar-tooltip-overlay)')) { this.editorFullscreen.set(false); event.preventDefault(); return; }
    if (event.key === 'Escape' && this.newNoteMenuOpen()) { this.newNoteMenuOpen.set(false); document.querySelector<HTMLButtonElement>('[data-testid=create-note]')?.focus(); }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void this.workspace.manualSave(); }
    const target = event.target as HTMLElement;
    if ((event.ctrlKey || event.metaKey) && target.closest('.editor-area,.body-source,[data-testid=markdown-source]') && ['z', 'y'].includes(event.key.toLowerCase())) {
      event.preventDefault(); event.stopImmediatePropagation(); this.undo(event.shiftKey || event.key.toLowerCase() === 'y');
    }
  };
  constructor() {
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
    effect(() => { this.theme(); this.locale(); this.applyTheme(); });
    effect(() => { if (this.workspace.libraryUnavailable()) this.tab.set('libraries'); });
    effect(() => {
      const ready = this.ready(); this.workspace.opened();
      if (ready) untracked(() => { this.inTable.set(false); this.inCodeBlock.set(false); this.history.reset(this.source()); this.historyVersion.update(value => value + 1); this.sourceMode.set(false); this.exportPreview.set(null); this.fileMessage.set(''); this.loadSource(); });
    });
  }

  ngAfterViewInit(): void {
    this.applyTheme();
    this.media.addEventListener('change', this.themeListener);
    Quill.register('formats/link', NoteLink, true);
    registerNoteFormats();
    this.editor = new Quill(this.host.nativeElement, {
      theme: 'snow',
      formats: ['header', 'bold', 'italic', 'blockquote', 'code', 'code-block', 'code-token', 'list', 'indent', 'link', 'image', 'table', 'cell-header', 'cell-align'],
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
    this.loadSource();
    this.editor.on('text-change', this.onEditorChange);
    this.editor.on('editor-change', () => this.updateEditorContext());
    this.localizeEditor();
    this.ready.set(true);
    void this.workspace.init();
    window.notebookAid.runtime().then(value => this.runtime.set(value)).catch(() => this.sqliteResult.set(this.t('failed')));
  }
  ngOnDestroy(): void {
    this.editor?.off('text-change', this.onEditorChange);
    this.media.removeEventListener('change', this.themeListener);
    this.host.nativeElement.removeEventListener('click', this.preventNavigation);
    this.host.nativeElement.removeEventListener('click', this.selectImage);
    this.host.nativeElement.removeEventListener('compositionstart', this.compositionStart);
    this.host.nativeElement.removeEventListener('compositionend', this.compositionEnd);
    window.removeEventListener('keydown', this.keyboard, true);
  }
  t(key: MessageKey): string { return translate(this.locale(), key); }
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
    if (action === 'insertTable') table.insertTable(3, 3); else table[action]();
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
    for (const key of ['visitLink', 'enterLink', 'editLink', 'removeLink', 'save'] as const) document.documentElement.style.setProperty('--quill-' + key, JSON.stringify(this.t(key)));
  }
  private applyTheme(): void {
    document.documentElement.dataset['theme'] = this.theme() === 'system' ? (this.media.matches ? 'dark' : 'light') : this.theme();
    document.documentElement.lang = regionalLocale(this.locale());
    this.localizeEditor();
  }
}
