import { Component, ElementRef, Input, inject, signal, OnDestroy } from '@angular/core';
import { IconComponent } from './icon.component';
import { Preferences } from './preferences';
import { updateText, type UpdateKey } from './updates-i18n';
import type { Locale } from './i18n';
import type { UpdateState } from '../../shared/updates';
@Component({ selector: 'app-updates', standalone: true, imports: [IconComponent], styles: ['progress { width: 100%; accent-color: var(--accent); }'], template: `
  <article class="panel settings-panel" data-testid="update-settings" tabindex="-1" [attr.aria-label]="text('title')"><h2>{{ text('title') }}</h2>
    <label class="setting-row"><span>{{ text('automatic') }}</span><input data-testid="auto-update" type="checkbox" [checked]="prefs.state().global.autoUpdates !== false" [disabled]="!prefs.ready() || prefs.busy()" (change)="automatic($event)"></label>
    <p role="status">{{ text(state().phase) }} @if (state().version) { <span>{{ state().version }}</span> }</p>
    @if (state().phase === 'downloading') { <progress max="100" [value]="state().percent ?? 0" [attr.aria-label]="text('downloading')"></progress> }
    <div class="actions"><button class="secondary" (click)="check()" [disabled]="busy() || ['portable','unconfigured','checking','downloading','ready'].includes(state().phase)"><app-icon name="RefreshCw" />{{ text('check') }}</button>
    @if (state().phase === 'ready') { <button class="primary" (click)="install()" [disabled]="busy()"><app-icon name="RefreshCw" />{{ text('install') }}</button> }</div>
  </article>` })
export class UpdatesComponent implements OnDestroy {
  @Input() locale: Locale = 'zh-CN';
  readonly prefs = inject(Preferences);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly state = signal<UpdateState>({ phase: 'unconfigured' });
  readonly busy = signal(false);
  private readonly stop = window.notebookAid.updates.onState(state => this.state.set(state));
  constructor() { void window.notebookAid.updates.state().then(state => this.state.set(state)).catch(() => this.state.set({ phase: 'error' })); }
  text(key: UpdateKey): string { return updateText(this.locale, key); }
  async automatic(event: Event): Promise<void> { const input = event.target as HTMLInputElement; await this.prefs.update({ autoUpdates: input.checked }); input.checked = this.prefs.state().global.autoUpdates !== false; }
  async revealAndCheck(): Promise<void> { const panel = this.element.nativeElement.querySelector<HTMLElement>('[data-testid=update-settings]'); panel?.scrollIntoView({ block: 'center' }); panel?.focus({ preventScroll: true }); await this.check(); }
  async check(): Promise<void> { if (this.busy()) return; this.busy.set(true); try { this.state.set(await window.notebookAid.updates.check()); } catch { this.state.set({ phase: 'error' }); } finally { this.busy.set(false); } }
  async install(): Promise<void> { this.busy.set(true); try { this.state.set(await window.notebookAid.updates.install()); } catch { this.state.set({ phase: 'error' }); } finally { this.busy.set(false); } }
  ngOnDestroy(): void { this.stop(); }
}
