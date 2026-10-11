import { NgTemplateOutlet } from '@angular/common';
import { DragDropModule, type CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, Input, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NoteWorkspace } from './note-workspace';
import { IconComponent } from './icon.component';
import { SelectDirective } from './select.directive';
import { translate, type Locale, type MessageKey } from './i18n';

@Component({
  selector: 'app-organization', standalone: true, imports: [NgTemplateOutlet, DragDropModule, FormsModule, IconComponent, SelectDirective],
  template: `
    <section class="organization-pane">
      <h1>{{ t('organize') }}</h1><p class="muted">{{ t('organizationHint') }}</p>
      <div class="organization-grid">
        <article class="panel"><h2>{{ t('folders') }}</h2>
          <button class="secondary" data-testid="folder-new" (click)="newFolder()"><app-icon name="Plus" />{{ t('newFolder') }}</button>
          <div class="organization-items"><ng-container *ngTemplateOutlet="folderLevel; context: {$implicit: null}" /></div>
          <ng-template #folderLevel let-parentId>
            <div cdkDropList [cdkDropListData]="children(parentId)" (cdkDropListDropped)="drop($event)" [cdkDropListDisabled]="workspace.organizationBusy() || workspace.switching()">
              @for (folder of children(parentId); track folder.id) {
                <div cdkDrag [cdkDragData]="folder.id" class="folder-sort-item">
                  <div class="folder-sort-row">
                    <button cdkDragHandle class="icon-button folder-drag-handle" [attr.data-folder-drag]="folder.id" [attr.aria-label]="t('dragSort') + ': ' + folder.name" [title]="t('dragSort')" [disabled]="workspace.organizationBusy() || workspace.switching()"><app-icon name="GripVertical" /></button>
                    <button class="nav-item" [class.active]="folderId === folder.id" [attr.data-folder-edit]="folder.id" (click)="editFolder(folder.id)"><app-icon name="Folder" /><span>{{ folder.name }}</span></button>
                    <button class="icon-button" [attr.data-folder-up]="folder.id" [attr.aria-label]="t('moveUp') + ': ' + folder.name" [disabled]="!canMove(folder.id, -1) || workspace.organizationBusy()" (click)="move(folder.id, -1)"><app-icon name="ChevronUp" /></button>
                    <button class="icon-button" [attr.data-folder-down]="folder.id" [attr.aria-label]="t('moveDown') + ': ' + folder.name" [disabled]="!canMove(folder.id, 1) || workspace.organizationBusy()" (click)="move(folder.id, 1)"><app-icon name="ChevronDown" /></button>
                  </div>
                  @if (children(folder.id).length) { <div class="folder-sort-children"><ng-container *ngTemplateOutlet="folderLevel; context: {$implicit: folder.id}" /></div> }
                </div>
              }
            </div>
          </ng-template>
          @if (orderDraft()) { <button class="secondary" data-testid="folder-order-save" (click)="saveOrder()" [disabled]="workspace.organizationBusy()"><app-icon name="Save" />{{ t('saveOrder') }}</button> }
          <label>{{ t('folderName') }}<input data-testid="folder-name" [(ngModel)]="folderName" maxlength="80"></label>
          <label>{{ t('parentFolder') }}<select appSelect data-testid="folder-parent" [(ngModel)]="parentId"><option value="">{{ t('topLevelFolder') }}</option>@for (folder of workspace.folderRows(); track folder.id) { <option [value]="folder.id">{{ folder.path }}</option> }</select></label>
          <button class="primary" data-testid="folder-save" (click)="saveFolder()" [disabled]="!folderName.trim() || workspace.organizationBusy() || workspace.switching()"><app-icon name="Save" />{{ t('save') }}</button>
        </article>
        <article class="panel"><h2>{{ t('tags') }}</h2>
          <button class="secondary" data-testid="tag-new" (click)="newTag()"><app-icon name="Plus" />{{ t('newTag') }}</button>
          <div class="organization-items">
            @for (tag of workspace.sortedTags(); track tag.id) {
              <button class="nav-item" [class.active]="tagId === tag.id" [attr.data-tag-edit]="tag.id" (click)="editTag(tag.id)"><app-icon name="Tag" [style.color]="tag.color" />{{ tag.name }}</button>
            }
          </div>
          <label>{{ t('tagName') }}<input data-testid="tag-name" [(ngModel)]="tagName" maxlength="80"></label>
          <label>{{ t('tagColor') }}<span class="tag-color-control"><input type="color" data-testid="tag-color" [(ngModel)]="tagColor" [attr.aria-label]="t('tagColor')"><span class="tag-color-preview" [style.background-color]="tagColor" aria-hidden="true"></span><output data-testid="tag-color-value">{{ tagColor }}</output></span></label>
          <button class="primary" data-testid="tag-save" (click)="saveTag()" [disabled]="!tagName.trim() || workspace.organizationBusy() || workspace.switching()"><app-icon name="Save" />{{ t('save') }}</button>
        </article>
      </div>
      @if (workspace.organizationError()) { <div role="alert" class="warning organization-failure" data-testid="organization-error"><p>{{ t('organizationInvalid') }} · {{ workspace.organizationError() }}</p><button class="secondary" data-testid="organization-retry" (click)="retry()" [disabled]="workspace.organizationBusy()"><app-icon name="RefreshCw" />{{ t('retryOperation') }}</button><button class="secondary" data-testid="organization-cancel" (click)="workspace.cancelOrganizationError()" [disabled]="workspace.organizationBusy()"><app-icon name="X" />{{ t('cancelOperation') }}</button></div> }
    </section>`
})
export class OrganizationComponent {
  @Input() locale: Locale = 'zh-CN';
  readonly workspace = inject(NoteWorkspace);
  readonly orderDraft = signal<string[] | null>(null);
  private orderVersion = 0;
  private lastAction: 'folder' | 'tag' | 'order' = 'folder';
  retry(): void { if (this.lastAction === 'order') void this.saveOrder(); else if (this.lastAction === 'tag') void this.saveTag(); else void this.saveFolder(); }
  readonly orderedRows = computed(() => {
    const rows = this.workspace.folderRows(), draft = this.orderDraft();
    if (!draft || this.orderVersion !== this.workspace.organization().version) return rows;
    const result: typeof rows = [];
    const folders = new Map(this.workspace.organization().folders.map(item => [item.id, item]));
    const byId = new Map(rows.map(row => [row.id, row]));
    const visit = (parentId: string | null) => {
      for (const id of draft) {
        const folder = folders.get(id);
        if (folder?.parentId === parentId) { result.push(byId.get(id)!); visit(id); }
      }
    };
    visit(null); return result;
  });
  children(parentId: string | null) {
    const parents = new Map(this.workspace.organization().folders.map(item => [item.id, item.parentId]));
    return this.orderedRows().filter(row => parents.get(row.id) === parentId);
  }
  drop(event: CdkDragDrop<ReturnType<OrganizationComponent['children']>>): void {
    if (event.previousContainer !== event.container || !event.isPointerOverContainer || event.previousIndex === event.currentIndex) return;
    const siblings = event.container.data.map(row => row.id);
    const [id] = siblings.splice(event.previousIndex, 1); siblings.splice(event.currentIndex, 0, id);
    if (!this.orderDraft() || this.orderVersion !== this.workspace.organization().version) { this.orderDraft.set(null); this.orderVersion = this.workspace.organization().version; }
    const members = new Set(siblings); let index = 0;
    this.orderDraft.set((this.orderDraft() ?? this.workspace.folderRows().map(row => row.id)).map(id => members.has(id) ? siblings[index++] : id));
  }
  private siblings(id: string): string[] {
    const parents = new Map(this.workspace.organization().folders.map(item => [item.id, item.parentId])), parent = parents.get(id);
    return this.orderedRows().filter(row => parents.get(row.id) === parent).map(row => row.id);
  }
  canMove(id: string, delta: number): boolean { const siblings = this.siblings(id); const target = siblings.indexOf(id) + delta; return target >= 0 && target < siblings.length; }
  move(id: string, delta: number): void {
    if (!this.canMove(id, delta)) return;
    if (this.orderDraft() && this.orderVersion !== this.workspace.organization().version) this.orderDraft.set(null);
    if (!this.orderDraft()) this.orderVersion = this.workspace.organization().version;
    const ids = this.orderDraft() ?? this.workspace.folderRows().map(row => row.id), next = [...ids];
    const siblings = this.siblings(id), other = siblings[siblings.indexOf(id) + delta];
    const a = next.indexOf(id), b = next.indexOf(other); [next[a], next[b]] = [next[b], next[a]]; this.orderDraft.set(next);
  }
  async saveOrder(): Promise<void> {
    this.lastAction = 'order';
    if (!this.orderDraft()) { this.workspace.cancelOrganizationError(); return; }
    if (this.orderVersion !== this.workspace.organization().version) { this.orderDraft.set(null); this.workspace.organizationError.set('VERSION_CONFLICT'); return; }
    if (await this.workspace.editOrganization({ kind: 'folder-order', ids: this.orderDraft()! })) this.orderDraft.set(null);
  }
  folderId = ''; folderName = ''; parentId = '';
  tagId = ''; tagName = ''; tagColor = '#7460c9';
  t(key: MessageKey): string { return translate(this.locale, key); }
  newFolder(): void { this.folderId = ''; this.folderName = ''; this.parentId = ''; this.workspace.organizationError.set(''); }
  editFolder(id: string): void { const item = this.workspace.organization().folders.find(folder => folder.id === id)!; this.folderId = id; this.folderName = item.name; this.parentId = item.parentId ?? ''; }
  async saveFolder(): Promise<void> { this.lastAction = 'folder'; this.folderId ||= crypto.randomUUID(); if (await this.workspace.editOrganization({ kind: 'folder', id: this.folderId || crypto.randomUUID(), name: this.folderName, parentId: this.parentId || null })) this.newFolder(); }
  newTag(): void { this.tagId = ''; this.tagName = ''; this.tagColor = '#7460c9'; this.workspace.organizationError.set(''); }
  editTag(id: string): void { const item = this.workspace.sortedTags().find(tag => tag.id === id)!; this.tagId = id; this.tagName = item.name; this.tagColor = item.color; }
  async saveTag(): Promise<void> { this.lastAction = 'tag'; this.tagId ||= crypto.randomUUID(); if (await this.workspace.editOrganization({ kind: 'tag', id: this.tagId || crypto.randomUUID(), name: this.tagName, color: this.tagColor })) this.newTag(); }
}
