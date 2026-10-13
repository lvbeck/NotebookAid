import { AfterViewInit, Directive, DoCheck, ElementRef, OnDestroy, inject } from '@angular/core';
import { Overlay, type OverlayRef } from '@angular/cdk/overlay';
import { DomPortal } from '@angular/cdk/portal';
import { Check, ChevronDown, Languages, SunMoon, createElement } from 'lucide';
import { Subscription } from 'rxjs';

let nextId = 0;

/** Preserve Angular's native select bindings while presenting a themed combobox. */
@Directive({ selector: 'select[appSelect]', standalone: true })
export class SelectDirective implements AfterViewInit, DoCheck, OnDestroy {
  private readonly select: HTMLSelectElement = inject<ElementRef<HTMLSelectElement>>(ElementRef).nativeElement;
  private readonly overlay = inject(Overlay);
  private readonly id = `notebookaid-select-${++nextId}`;
  private button?: HTMLButtonElement;
  private label?: HTMLSpanElement;
  private menu?: HTMLDivElement;
  private ref?: OverlayRef;
  private subscriptions = new Subscription();
  private observer?: MutationObserver;
  private active = -1;
  private snapshot = '';
  private pending = false;
  private destroyed = false;
  private search = '';
  private searchTime = 0;

  ngAfterViewInit(): void {
    this.select.classList.add('select-native');
    this.select.tabIndex = -1;
    this.select.setAttribute('aria-hidden', 'true');
    const button = this.button = document.createElement('button');
    button.type = 'button'; button.id = this.id;
    button.className = 'select-trigger ' + Array.from(this.select.classList).filter(name => !name.startsWith('ng-') && name !== 'select-native').join(' ');
    button.setAttribute('role', 'combobox'); button.setAttribute('aria-haspopup', 'listbox'); button.setAttribute('aria-expanded', 'false');
    const testId = this.select.dataset['testid']; if (testId) button.dataset['selectTrigger'] = testId;
    this.label = document.createElement('span'); this.label.className = 'select-value';
    const arrow = createElement(ChevronDown, { width: '16', height: '16', 'stroke-width': '1.8', 'aria-hidden': 'true', class: 'select-arrow' });
    if (testId === 'language' || testId === 'theme') button.append(createElement(testId === 'language' ? Languages : SunMoon, { width: '18', height: '18', 'stroke-width': '1.65', 'aria-hidden': 'true', class: 'select-leading-icon' }));
    button.append(this.label, arrow); this.select.after(button);
    button.addEventListener('click', this.click);
    button.addEventListener('keydown', this.keydown);
    button.addEventListener('blur', this.blur);
    this.select.addEventListener('change', this.queueSync);
    this.observer = new MutationObserver(this.queueSync);
    this.observer.observe(this.select, { childList: true, subtree: true, characterData: true, attributes: true });
    this.sync();
  }
  ngDoCheck(): void { this.queueSync(); }
  private readonly queueSync = () => {
    if (this.pending || this.destroyed || !this.button) return;
    this.pending = true;
    queueMicrotask(() => { this.pending = false; if (!this.destroyed) this.sync(); });
  };
  private options(): HTMLOptionElement[] { return Array.from(this.select.options); }
  private enabled(index: number): boolean {
    const option = this.select.options[index];
    return !!option && !option.disabled && !option.hidden && !(option.parentElement instanceof HTMLOptGroupElement && option.parentElement.disabled);
  }
  private sync(): void {
    const button = this.button; if (!button || !this.label) return;
    const options = this.options();
    this.label.textContent = this.select.selectedOptions[0]?.label ?? '';
    if (this.select.dataset['testid'] === 'export-format') {
      const context = document.createElement('canvas').getContext('2d');
      if (context) {
        const style = getComputedStyle(button);
        context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const textWidth = Math.max(0, ...options.map(option => context.measureText(option.label).width));
        button.style.width = `${Math.ceil(textWidth + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + 16 + (parseFloat(style.columnGap) || 8) + 2)}px`;
      }
    }
    button.disabled = this.select.disabled || !options.some((_option, index) => this.enabled(index));
    const associated = this.select.labels?.[0]?.cloneNode(true) as HTMLElement | undefined;
    associated?.querySelectorAll('select,button,input').forEach(element => element.remove());
    const name = this.select.getAttribute('aria-label') || associated?.textContent?.trim() || this.label.textContent;
    for (const attribute of ['aria-describedby', 'aria-invalid']) { const value = this.select.getAttribute(attribute); if (value !== null) button.setAttribute(attribute, value); else button.removeAttribute(attribute); }
    button.setAttribute('aria-label', name || 'Select');
    button.setAttribute('aria-required', String(this.select.required));
    const snapshot = JSON.stringify(options.map((option, index) => [option.value, option.label, option.selected, this.enabled(index)]));
    if (this.ref && (button.disabled || !button.getClientRects().length || button.closest('[inert]'))) { this.close(); return; }
    if (this.ref && snapshot !== this.snapshot) { this.active = this.select.selectedIndex; this.renderOptions(); }
    this.snapshot = snapshot;
  }
  private readonly click = () => { if (this.ref) this.close(); else this.open(); };
  private readonly blur = () => { this.close(); this.select.dispatchEvent(new Event('blur')); };
  private open(): void {
    this.sync(); if (!this.button || this.button.disabled || this.ref) return;
    this.search = ''; this.active = this.select.selectedIndex;
    if (!this.enabled(this.active)) this.active = this.options().findIndex((_option, index) => this.enabled(index));
    const menu = this.menu = document.createElement('div');
    menu.id = this.id + '-list'; menu.className = 'select-menu';
    if (this.select.dataset['testid'] === 'export-format') menu.classList.add('select-menu-export-format'); menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-label', this.button.getAttribute('aria-label') || 'Select');
    const style = getComputedStyle(this.button);
    menu.style.borderRadius = style.borderRadius; menu.style.fontSize = style.fontSize;
    document.body.append(menu);
    const position = this.overlay.position().flexibleConnectedTo(this.button).withPositions([
      { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 6 },
      { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -6 }
    ]).withViewportMargin(12).withFlexibleDimensions(true).withPush(true);
    this.ref = this.overlay.create({ positionStrategy: position, scrollStrategy: this.overlay.scrollStrategies.reposition(),
      width: Math.max(this.button.getBoundingClientRect().width, 160), maxWidth: 'calc(100vw - 24px)', maxHeight: 'min(320px, calc(100vh - 24px))', panelClass: 'select-overlay' });
    this.ref.attach(new DomPortal(menu));
    this.button.setAttribute('aria-expanded', 'true'); this.button.setAttribute('aria-controls', menu.id);
    this.renderOptions();
    this.subscriptions = new Subscription();
    this.subscriptions.add(this.ref.outsidePointerEvents().subscribe(event => { if (!this.button?.contains(event.target as Node)) this.close(); }));
    // Handle Escape before a parent overlay (such as the notification drawer) receives it.
    this.subscriptions.add(this.ref.keydownEvents().subscribe(event => this.keydown(event)));
    this.button.focus({ preventScroll: true });
  }
  private renderOptions(): void {
    const menu = this.menu; if (!menu) return;
    menu.replaceChildren();
    this.options().forEach((option, index) => {
      if (option.hidden) return;
      const row = document.createElement('div'); row.id = `${this.id}-option-${index}`;
      row.className = 'select-option'; row.setAttribute('role', 'option'); row.dataset['value'] = option.value;
      row.setAttribute('aria-selected', String(option.selected)); row.setAttribute('aria-disabled', String(!this.enabled(index)));
      const label = document.createElement('span'); label.textContent = option.label;
      const check = createElement(Check, { width: '16', height: '16', 'stroke-width': '2', 'aria-hidden': 'true', class: 'select-check' });
      row.append(label, check);
      row.addEventListener('mousedown', event => event.preventDefault());
      row.addEventListener('mouseenter', () => { if (this.enabled(index)) { this.active = index; this.highlight(false); } });
      row.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); this.choose(index); });
      menu.append(row);
    });
    this.highlight(true);
  }
  private highlight(scroll: boolean): void {
    if (!this.menu || !this.button) return;
    const id = `${this.id}-option-${this.active}`;
    this.button.setAttribute('aria-activedescendant', id);
    for (const row of Array.from(this.menu.children)) row.classList.toggle('active', row.id === id);
    if (scroll) document.getElementById(id)?.scrollIntoView({ block: 'nearest' });
  }
  private choose(index: number): void {
    if (this.select.disabled || !this.enabled(index)) return;
    const changed = this.select.selectedIndex !== index;
    this.select.selectedIndex = index;
    this.close();
    if (changed) { this.select.dispatchEvent(new Event('input', { bubbles: true })); this.select.dispatchEvent(new Event('change', { bubbles: true })); }
    this.queueSync();
  }
  private readonly keydown = (event: KeyboardEvent) => {
    if (event.isComposing || this.button?.disabled || event.ctrlKey || event.metaKey) return;
    const key = event.key;
    if (key === 'Tab') { this.close(); return; }
    if (key === 'Escape') { if (this.ref) { event.preventDefault(); event.stopPropagation(); this.close(); } return; }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(key) && (key.length !== 1 || event.altKey)) return;
    event.preventDefault(); event.stopPropagation();
    const wasOpen = !!this.ref;
    if (!wasOpen) this.open();
    if (!this.ref) return;
    if (key === 'Enter' || key === ' ') { if (wasOpen) this.choose(this.active); return; }
    const available = this.options().map((_option, index) => index).filter(index => this.enabled(index));
    if (key === 'Home') this.active = available[0]!;
    else if (key === 'End') this.active = available[available.length - 1]!;
    else if (key === 'ArrowDown' || key === 'ArrowUp') {
      if (wasOpen) this.active = available[(available.indexOf(this.active) + (key === 'ArrowDown' ? 1 : available.length - 1)) % available.length]!;
    } else {
      const now = Date.now(); this.search = now - this.searchTime > 700 ? key : this.search + key; this.searchTime = now;
      const match = available.find(index => this.select.options[index]!.label.toLocaleLowerCase().startsWith(this.search.toLocaleLowerCase()));
      if (match !== undefined) this.active = match;
    }
    this.highlight(true);
  };
  private close(): void {
    const ref = this.ref; this.ref = undefined; this.subscriptions.unsubscribe();
    ref?.dispose(); this.menu?.remove(); this.menu = undefined;
    this.button?.setAttribute('aria-expanded', 'false'); this.button?.removeAttribute('aria-controls'); this.button?.removeAttribute('aria-activedescendant');
  }
  ngOnDestroy(): void {
    this.destroyed = true; this.observer?.disconnect(); this.close();
    this.select.removeEventListener('change', this.queueSync);
    this.button?.removeEventListener('click', this.click); this.button?.removeEventListener('keydown', this.keydown); this.button?.removeEventListener('blur', this.blur);
    this.button?.remove();
  }
}
