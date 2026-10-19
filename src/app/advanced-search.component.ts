import { Component, EventEmitter, Output, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { NoteSummary } from '../../shared/library';
import type { NoteQuery } from '../../shared/organization';
import { highlightTitle } from '../../shared/search';
import { IconComponent } from './icon.component';
import { SelectDirective } from './select.directive';
import { NoteWorkspace } from './note-workspace';
import { translate, regionalLocale, type Locale, type MessageKey } from './i18n';
import { searchText, type SearchKey } from './search-i18n';
import { errorText } from './ui-i18n';

@Component({
  selector: 'app-advanced-search', standalone: true, imports: [FormsModule, IconComponent, SelectDirective],
  template: `
    <form class="advanced-filters" data-testid="advanced-filters" (ngSubmit)="submit()">
      <h2>{{ s('title') }}</h2>
      <fieldset><legend>{{ s('keywords') }}</legend>
        @for (word of words; track $index; let index = $index) {
          <div class="advanced-keyword"><input [name]="'keyword-' + index" [ngModel]="word" (ngModelChange)="words[index] = $event" [attr.aria-label]="s('keywords') + ' ' + (index + 1)" data-testid="advanced-keyword" [attr.data-keyword-index]="index" maxlength="300"><button type="button" class="icon-button" (click)="removeKeyword(index)" [attr.aria-label]="s('remove') + ' ' + (index + 1)"><app-icon name="X" /></button></div>
        }
        <button type="button" class="secondary advanced-add-keyword" data-testid="advanced-add-keyword" (click)="words.push('')" [disabled]="words.length >= 8"><app-icon name="Plus" />{{ s('add') }}</button>
        <div class="segmented-radio advanced-match" role="radiogroup" [attr.aria-label]="s('keywords')">
          <label [class.selected]="mode === 'AND'"><input type="radio" name="matchMode" value="AND" [(ngModel)]="mode"><span>{{ s('all') }}</span></label>
          <label [class.selected]="mode === 'OR'"><input type="radio" name="matchMode" value="OR" [(ngModel)]="mode"><span>{{ s('any') }}</span></label>
        </div>
      </fieldset>
      <label class="advanced-label">{{ t('folders') }}<select appSelect name="folder" data-testid="advanced-folder" [(ngModel)]="folder"><option value="*">{{ s('folders') }}</option><option value="">{{ t('rootFolder') }}</option>@for (row of workspace.folderRows(); track row.id) { <option [value]="row.id">{{ row.path }}</option> }</select></label>
      <label class="advanced-descendants"><input type="checkbox" name="includeDescendants" data-testid="advanced-descendants" [(ngModel)]="includeDescendants">{{ s('folderHint') }}</label>
      <fieldset><legend>{{ t('tags') }}</legend><div class="advanced-tag-options">@for (tag of workspace.sortedTags(); track tag.id) { <label><input type="checkbox" [name]="'tag-' + tag.id" [ngModel]="tags.includes(tag.id)" (ngModelChange)="toggleTag(tag.id)" [attr.data-search-tag]="tag.id"><span class="tag-dot" [style.background]="tag.color"></span>{{ tag.name }}</label> }</div><p class="muted">{{ s('tagsHint') }}</p></fieldset>
      <label class="advanced-pinned"><input type="checkbox" name="pinnedOnly" data-testid="advanced-pinned" [(ngModel)]="pinned">{{ s('pinnedOnly') }}</label>
      <div class="advanced-actions"><button class="primary" type="submit" data-testid="advanced-submit" [disabled]="busy() || workspace.switching() || workspace.initializing()"><app-icon name="Search" />{{ s('search') }}</button><button class="secondary" type="button" data-testid="advanced-reset" (click)="reset()" [disabled]="busy()">{{ s('reset') }}</button></div>
      <p class="muted">{{ s('hint') }}</p>
    </form>
    <section class="advanced-results" [attr.aria-busy]="busy()">
      <header><h2>{{ s('results') }} <span data-testid="advanced-total">{{ total() }}</span></h2><label>{{ s('pageSize') }}<select appSelect data-testid="advanced-page-size" [ngModel]="limit" (ngModelChange)="changeLimit(+$event)" [disabled]="busy()">@for (size of pageSizes; track size) { <option [value]="size">{{ size }}</option> }</select></label></header>
      @if (failure()) { <p role="alert" class="warning" data-testid="advanced-error">{{ failure() }}</p> }
      <div class="advanced-table-scroll"><table data-testid="advanced-results"><thead><tr><th scope="col">{{ t('title') }}</th><th scope="col">{{ t('folders') }}</th><th scope="col">{{ t('tags') }}</th><th scope="col">{{ s('created') }}</th><th scope="col">{{ s('modified') }}</th></tr></thead><tbody>
        @for (note of rows(); track note.id) {
          <tr [class.selected]="workspace.session()?.note?.id === note.id"><td><div class="advanced-title-cell">@if (note.pinned) { <span class="advanced-pin"><app-icon name="Pin" />{{ t('pinned') }}</span> }<button class="advanced-title" [attr.data-search-note]="note.id" (click)="open(note.id)" [disabled]="workspace.switching() || busy()">@for (part of parts(note.title); track $index) { @if (part.matched) { <strong [textContent]="part.text"></strong> } @else { <span [textContent]="part.text"></span> } }</button></div></td>
          <td>{{ workspace.folderPath(note.folderId) || t('rootFolder') }}</td><td><div class="advanced-result-tags">@for (tag of noteTags(note); track tag.id) { <span class="tag-chip"><i [style.background]="tag.color"></i>{{ tag.name }}</span> }</div></td><td class="advanced-date">{{ date(note.createdAt) }}</td><td class="advanced-date">{{ date(note.updatedAt) }}</td></tr>
        } @empty { <tr><td colspan="5" class="advanced-empty">{{ s(busy() ? 'loading' : 'empty') }}</td></tr> }
      </tbody></table></div>
      <footer aria-live="polite"><button class="secondary" data-testid="advanced-previous" (click)="run(offset - limit)" [disabled]="busy() || offset === 0"><app-icon name="ChevronLeft" />{{ t('previousPage') }}</button><span data-testid="advanced-range">{{ total() ? offset + 1 : 0 }}–{{ offset + rows().length }} / {{ total() }}</span><button class="secondary" data-testid="advanced-next" (click)="run(offset + limit)" [disabled]="busy() || offset + rows().length >= total()">{{ t('nextPage') }}<app-icon name="ChevronRight" /></button></footer>
    </section>
  `,
  host: { class: 'advanced-search-page' }
})
export class AdvancedSearchComponent {
  readonly locale = input<Locale>('zh-CN');
  readonly active = input(false);
  @Output() opened = new EventEmitter<void>();
  readonly workspace = inject(NoteWorkspace);
  readonly rows = signal<NoteSummary[]>([]);
  readonly total = signal(0);
  readonly busy = signal(false);
  readonly failure = signal('');
  readonly pageSizes = [10, 20, 50, 100];
  words = ['']; mode: 'AND' | 'OR' = 'AND'; folder = '*'; tags: string[] = []; pinned = false;
  includeDescendants = true;
  limit = 10; offset = 0;
  private applied: NoteQuery = { keywords: [], matchMode: 'AND', view: 'all' };
  private libraryId?: string;
  private epoch = 0;
  constructor() {
    effect(() => {
      const active = this.active(), status = this.workspace.status();
      this.workspace.organization(); this.workspace.notes();
      untracked(() => {
        if (status?.libraryId !== this.libraryId) {
          this.libraryId = status?.libraryId; this.words = ['']; this.mode = 'AND'; this.folder = '*'; this.tags = []; this.pinned = false; this.includeDescendants = true;
          this.applied = { keywords: [], matchMode: 'AND', view: 'all' }; this.offset = 0; this.rows.set([]); this.total.set(0); this.failure.set('');
        }
        this.epoch++; this.busy.set(false);
        if (active && status && !this.workspace.initializing()) void this.run(this.offset);
        else if (status?.security?.configured && !status.security.unlocked) { this.rows.set([]); this.total.set(0); }
      });
    });
  }
  s(key: SearchKey): string { return searchText(this.locale(), key); }
  t(key: MessageKey): string { return translate(this.locale(), key); }
  date(value: string): string { return new Date(value).toLocaleString(regionalLocale(this.locale()), { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }); }
  parts(title: string) { return highlightTitle(title, this.applied.keywords ?? []); }
  noteTags(note: NoteSummary) { return this.workspace.sortedTags().filter(tag => note.tagIds.includes(tag.id)); }
  removeKeyword(index: number): void { if (this.words.length > 1) this.words.splice(index, 1); else this.words[0] = ''; }
  toggleTag(id: string): void { this.tags = this.tags.includes(id) ? this.tags.filter(tag => tag !== id) : [...this.tags, id]; }
  submit(): void {
    this.applied = { keywords: this.words.map(word => word.trim()).filter(Boolean), matchMode:this.mode, view:this.pinned ? 'pinned' : 'all', tagIds:[...this.tags], includeDescendants:this.includeDescendants, ...(this.folder === '*' ? {} : { folderId:this.folder || null }) };
    void this.run(0);
  }
  reset(): void { this.words = ['']; this.mode = 'AND'; this.folder = '*'; this.tags = []; this.pinned = false; this.includeDescendants = true; this.submit(); }
  changeLimit(value: number): void { if (this.pageSizes.includes(value)) { this.limit = value; void this.run(0); } }
  async run(offset: number): Promise<void> {
    if (!this.active() || !this.workspace.status() || this.workspace.initializing()) return;
    const epoch = ++this.epoch, library = this.libraryId;
    this.busy.set(true); this.failure.set(''); this.rows.set([]);
    try {
      const result = await window.notebookAid.library.query({ ...this.applied, offset: Math.max(0, offset), limit: this.limit });
      if (epoch !== this.epoch || library !== this.workspace.status()?.libraryId || !this.active()) return;
      if (!result.ok) { this.offset = 0; this.total.set(0); this.failure.set(errorText(this.locale(), result.code)); return; }
      if (offset && offset >= result.value.total) { await this.run(0); return; }
      this.offset = Math.max(0, offset); this.rows.set(result.value.notes); this.total.set(result.value.total);
    } catch { if (epoch === this.epoch) { this.offset = 0; this.total.set(0); this.failure.set(this.t('failed')); } }
    finally { if (epoch === this.epoch) this.busy.set(false); }
  }
  async open(id: string): Promise<void> {
    const library = this.libraryId;
    await this.workspace.select(id);
    if (this.active() && library === this.workspace.status()?.libraryId && this.workspace.session()?.note.id === id) this.opened.emit();
  }
}
