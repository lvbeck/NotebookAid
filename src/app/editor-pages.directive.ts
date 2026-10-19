import { AfterViewInit, Directive, ElementRef, Input, NgZone, OnChanges, OnDestroy, inject } from '@angular/core';

let nextPageView = 0;

/** Screen-only layout: CSS decorations never become document blots or saved page breaks. */
@Directive({ selector: '[appEditorPages]', standalone: true })
export class EditorPagesDirective implements AfterViewInit, OnChanges, OnDestroy {
  @Input() appEditorPages = false;
  @Input() pageLabel = 'Page';
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly zone = inject(NgZone);
  private readonly id = 'screen-pages-' + ++nextPageView;
  private editor?: HTMLElement;
  private style?: HTMLStyleElement;
  private layer?: HTMLElement;
  private resize?: ResizeObserver;
  private mutation?: MutationObserver;
  private timer = 0;
  private composing = false;
  private width = 0;
  private readonly changed = () => this.schedule();
  private readonly start = () => { this.composing = true; };
  private readonly end = () => { this.composing = false; this.schedule(); };

  ngAfterViewInit(): void { this.zone.runOutsideAngular(() => this.configure()); }
  ngOnChanges(): void { this.zone.runOutsideAngular(() => this.configure()); }
  private configure(): void {
    this.clear();
    if (!this.appEditorPages) return;
    this.host.classList.add('editor-paginated'); this.host.id ||= this.id;
    this.style = document.createElement('style'); document.head.append(this.style);
    this.layer = document.createElement('div'); this.layer.className = 'screen-page-layer'; this.layer.setAttribute('aria-hidden', 'true'); this.host.prepend(this.layer);
    this.resize = new ResizeObserver(entries => { const width = entries[0]?.contentRect.width ?? 0; if (width !== this.width) { this.width = width; this.schedule(); } }); this.resize.observe(this.host);
    this.mutation = new MutationObserver(this.changed);
    // The editor is created by Quill after Angular view initialization.
    this.mutation.observe(this.host, { childList: true, subtree: true, characterData: true });
    this.host.addEventListener('load', this.changed, true);
    this.host.addEventListener('compositionstart', this.start);
    this.host.addEventListener('compositionend', this.end);
    this.schedule();
  }
  private schedule(): void {
    if (!this.appEditorPages || this.composing || this.timer) return;
    this.timer = window.setTimeout(() => { this.timer = 0; this.layout(); }, 80);
  }
  private selector(node: Element): string {
    const path: string[] = [];
    for (let current: Element | null = node; current && current !== this.editor; current = current.parentElement) path.unshift(':nth-child(' + (Array.prototype.indexOf.call(current.parentElement!.children, current) + 1) + ')');
    return '#' + this.host.id + ' .ql-editor > ' + path.join(' > ');
  }
  private layout(): void {
    if (!this.appEditorPages || this.composing || !this.style || !this.layer || !this.host.getClientRects().length) return;
    this.editor = this.host.querySelector<HTMLElement>('.ql-editor') ?? undefined;
    if (!this.editor) return;
    const pane = this.host.closest<HTMLElement>('.editor-pane'), scrollTop = pane?.scrollTop;
    this.mutation?.disconnect();
    this.style.textContent = ''; this.editor.style.removeProperty('min-height');
    const width = this.editor.getBoundingClientRect().width;
    if (width < 100) { this.observe(); return; }
    const page = width * 297 / 210, margin = Math.min(56, width * .085), gap = 24, stride = page + gap, content = page - 2 * margin;
    this.host.style.setProperty('--screen-page-height', page + 'px'); this.host.style.setProperty('--screen-page-margin', margin + 'px'); this.host.style.setProperty('--screen-content-height', content + 'px');
    const rect = this.editor.getBoundingClientRect();
    const nodes = [...this.editor.children].flatMap(node => node.tagName === 'OL' || node.classList.contains('ql-code-block-container') ? [...node.children] : node.tagName === 'TABLE' ? [...node.querySelectorAll('tr')] : [node]);
    const blocks = nodes.map(node => { const bounds = node.getBoundingClientRect(); return { node, top: bounds.top - rect.top, height: bounds.height }; });
    let visual = 0, flow = 0, bottom = margin;
    const rules: string[] = [];
    for (const block of blocks) {
      let top = block.top + visual + flow;
      let index = Math.max(0, Math.floor(top / stride));
      const end = index * stride + page - margin;
      if (top < index * stride + margin) { visual += index * stride + margin - top; top = index * stride + margin; }
      if (block.height <= content && top + block.height > end + .5) { const push = (index + 1) * stride + margin - top; visual += push; top += push; index++; }
      const selector = this.selector(block.node);
      if (visual) rules.push(selector + '{transform:translateY(' + visual.toFixed(3) + 'px)}');
      let added = 0;
      if (block.height > content && block.node.tagName !== 'TABLE') {
        const points = ['0 0']; let boundary = index * stride + page - margin - top;
        while (boundary < block.height + added) {
          const after = boundary + 2 * margin + gap;
          points.push('0 ' + boundary + 'px', '100% ' + boundary + 'px', '100% ' + after + 'px', '0 ' + after + 'px');
          added += 2 * margin + gap; boundary += stride;
        }
        if (added) {
          points.push('0 0');
          const prefix = block.node.tagName === 'TR' ? selector + ' > td' : selector;
          rules.push((block.node.tagName === 'TR' ? '' : prefix + '{display:flow-root}') + prefix + '::before{content:"";float:left;width:100%;height:' + (boundary - stride + 2 * margin + gap) + 'px;shape-outside:polygon(' + points.join(',') + ')}');
        }
      }
      flow += added; bottom = Math.max(bottom, top + block.height + added);
    }
    const pages = Math.max(1, Math.ceil((bottom + margin + gap) / stride));
    this.style.textContent = rules.join('\n');
    this.editor.style.minHeight = (pages * stride - gap) + 'px';
    this.host.dataset['pageCount'] = String(pages);
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < pages; index++) { const sheet = document.createElement('div'); sheet.className = 'screen-page-sheet'; sheet.style.top = index * stride + 'px'; sheet.style.height = page + 'px'; const number = document.createElement('span'); number.textContent = this.pageLabel + ' ' + (index + 1); sheet.append(number); fragment.append(sheet); }
    this.layer.replaceChildren(fragment);
    if (pane && scrollTop !== undefined) pane.scrollTop = scrollTop;
    this.observe();
  }
  private observe(): void { if (this.appEditorPages) this.mutation?.observe(this.host, { childList: true, subtree: true, characterData: true }); }
  private clear(): void {
    window.clearTimeout(this.timer); this.timer = 0; this.resize?.disconnect(); this.mutation?.disconnect();
    this.host.removeEventListener('load', this.changed, true); this.host.removeEventListener('compositionstart', this.start); this.host.removeEventListener('compositionend', this.end);
    this.style?.remove(); this.layer?.remove(); this.style = undefined; this.layer = undefined;
    this.editor?.style.removeProperty('min-height'); this.host.classList.remove('editor-paginated'); delete this.host.dataset['pageCount'];
  }
  ngOnDestroy(): void { this.clear(); }
}
