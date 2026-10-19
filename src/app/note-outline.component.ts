import { Component, Input, Output, EventEmitter, OnChanges, signal, computed } from '@angular/core';
import { noteOutline, type OutlineNode } from '../../shared/note-outline';
import { viewText, type ViewKey } from './view-i18n';
import type { Locale } from './i18n';
import { IconComponent } from './icon.component';

@Component({
  selector: 'app-note-outline', standalone: true, imports: [IconComponent],
  template: `
    <section class="note-outline" [class.outline-directory]="mode === 'directory'" data-testid="note-outline">
      <header class="outline-controls">
        <span>{{label(format === 'markdown' ? 'syntaxOutline' : 'indentOutline')}}</span>
        @if (mode === 'fold') {
          <button class="secondary" data-testid="outline-expand" (click)="expandAll()">{{label('expandAll')}}</button>
          <button class="secondary" data-testid="outline-collapse" (click)="collapseAll()">{{label('collapseAll')}}</button>
          <button class="secondary" data-testid="outline-edit" (click)="navigate.emit({start: 0, edit: true})"><app-icon name="FileText" />{{label('editBody')}}</button>
        }
      </header>
      @if (!outline().nodes.length) { <p class="muted" data-testid="outline-empty">{{label('outlineEmpty')}}</p> }
      @if (mode === 'fold' && outline().preambleEnd) { <pre class="outline-body">{{body.slice(0, outline().preambleEnd)}}</pre> }
      <nav [attr.aria-label]="label(mode === 'directory' ? 'directory' : 'fold')">
        @for (row of visible(); track row.node.start) {
          <div class="outline-row" [style.--outline-depth]="row.node.depth > 10 ? 10 : row.node.depth" [attr.data-outline-start]="row.node.start">
            <div class="outline-title">
              @if (mode === 'fold' && (hasChildren(row.index) || row.node.contentEnd > row.node.contentStart)) {
                <button class="outline-disclosure" [attr.aria-expanded]="!collapsed().has(row.index)" [attr.aria-label]="label(collapsed().has(row.index) ? 'expand' : 'collapse') + ' · ' + (row.node.title || label('untitledHeading'))" (click)="toggle(row.index)"><app-icon [name]="collapsed().has(row.index) ? 'ChevronRight' : 'ChevronDown'" /></button>
              }
              <button class="outline-link" [class.outline-selected]="selected() === row.node.start" (click)="choose(row.node)" [attr.aria-expanded]="mode === 'fold' ? !collapsed().has(row.index) : null" [attr.aria-current]="selected() === row.node.start ? 'location' : null"><span class="outline-level">{{format === 'markdown' ? '#' : '−'}}</span>{{row.node.title || label('untitledHeading')}}</button>
            </div>
            @if (mode === 'fold' && !collapsed().has(row.index)) {
              <pre class="outline-body">{{body.slice(row.node.contentStart, row.node.contentEnd)}}</pre>
            }
          </div>
        }
      </nav>
      @if (mode === 'fold') { <small class="muted">{{label('outlineReadOnly')}}</small> }
    </section>
  `
})
export class NoteOutlineComponent implements OnChanges {
  @Input() body = '';
  @Input() format = '';
  @Input() noteKey = '';
  @Input() mode: 'fold' | 'directory' = 'fold';
  @Input() locale: Locale = 'en';
  @Output() navigate = new EventEmitter<{ start: number; edit: boolean }>();
  readonly outline = signal(noteOutline('', ''));
  readonly collapsed = signal<Set<number>>(new Set());
  readonly selected = signal<number | null>(null);
  private key = '';
  readonly visible = computed(() => {
    const nodes = this.outline().nodes, hidden = new Set<number>(), collapsed = this.collapsed();
    return nodes.flatMap((node, index) => {
      if (this.mode === 'fold' && node.parent !== null && (collapsed.has(node.parent) || hidden.has(node.parent))) { hidden.add(index); return []; }
      return [{ node, index }];
    });
  });
  ngOnChanges(): void {
    this.outline.set(noteOutline(this.body, this.format));
    this.collapsed.set(new Set());
    if (this.key !== this.noteKey) this.selected.set(null);
    this.key = this.noteKey;
  }
  label(key: ViewKey): string { return viewText(this.locale, key); }
  hasChildren(index: number): boolean { return this.outline().nodes[index + 1]?.parent === index; }
  toggle(index: number): void { this.collapsed.update(previous => { const next = new Set(previous); next.has(index) ? next.delete(index) : next.add(index); return next; }); }
  collapseAll(): void { this.collapsed.set(new Set(this.outline().nodes.map((_, index) => index))); }
  expandAll(): void { this.collapsed.set(new Set()); }
  choose(node: OutlineNode): void {
    this.selected.set(node.start);
    if (this.mode === 'fold') this.toggle(this.outline().nodes.indexOf(node));
    else this.navigate.emit({ start: node.start, edit: false });
  }
}
