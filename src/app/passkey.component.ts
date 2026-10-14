import { UiFailure } from './ui-failure';
import { uiText, type UiKey } from './ui-i18n';
import { Component, Input, OnDestroy, inject, signal } from '@angular/core';
import { IconComponent } from './icon.component';
import { TooltipDirective } from './tooltip.directive';
import { Preferences } from './preferences';
import { AppDialogs } from './app-dialog';
import { passkeyText, type PasskeyKey } from './passkey-i18n';
import { languages, translate, type Locale } from './i18n';
import type { PrototypeApi } from '../../shared/contracts';
type PasskeyState = Awaited<ReturnType<PrototypeApi['appPasskeys']>>;

@Component({ selector: 'app-passkeys', standalone: true, imports: [IconComponent, TooltipDirective], template: `
  @if (compact) {
    @if (state()?.enabled) { <button class="nav-item" data-testid="lock-app" (click)="act('lock')" [disabled]="busy()" [appTooltip]="t('lock')"><app-icon name="Shield" /><span class="sidebar-text">{{ t('lock') }}</span></button> }
  } @else {
    @if (grouped) { <h3>{{ t('title') }}</h3> } @else { <h2>{{ t('title') }}</h2> }<p>{{ t('hint') }}</p><p class="muted">{{ t('phone') }}</p>
    <p>{{ t(state()?.enabled ? 'on' : 'off') }} · {{ t('count') }}: {{ state()?.count ?? 0 }}</p>
    <div class="actions"><button class="primary" data-testid="passkey-enable" (click)="act('enable')" [disabled]="busy() || !state()?.supported || (state()?.count ?? 0) >= 10"><app-icon name="Shield" />{{ t(state()?.enabled ? 'add' : 'enable') }}</button>
    @if (state()?.enabled) { <button class="secondary" (click)="act('disable')" [disabled]="busy()"><app-icon name="X" />{{ t('disable') }}</button><button class="secondary" (click)="act('lock')" [disabled]="busy()"><app-icon name="LockKeyhole" />{{ t('lock') }}</button> }</div>
    <p class="muted">{{ t('boundary') }}</p>
    @if (state() && !state()?.supported) { <p class="warning">{{ t('unavailable') }}</p> }
  }
  @if (busy()) { <p role="status">{{ t('waiting') }}</p> } @if (error()) { <p class="warning" role="alert">{{ t('failed') }}</p> }
` })
export class PasskeyComponent implements OnDestroy {
  @Input() compact = false;
  @Input() grouped = false;
  readonly prefs = inject(Preferences);
  readonly state = signal<PasskeyState | null>(null); readonly busy = signal(false); readonly error = signal(false);
  private readonly refresh = () => { void window.notebookAid.appPasskeys('status').then(value => this.state.set(value)); };
  constructor() { this.refresh(); window.addEventListener('passkey-state', this.refresh); }
  ngOnDestroy(): void { window.removeEventListener('passkey-state', this.refresh); }
  t(key: PasskeyKey): string { return passkeyText(this.prefs.locale(), key); }
  async act(action: 'enable' | 'disable' | 'lock'): Promise<void> {
    if (this.busy()) return; this.busy.set(true); this.error.set(false);
    try { const state = await window.notebookAid.appPasskeys(action); this.state.set(state); this.error.set(!!state.error); window.dispatchEvent(new Event('passkey-state')); }
    catch { this.error.set(true); } finally { this.busy.set(false); }
  }
}

@Component({ selector: 'app-root', standalone: true, imports: [IconComponent], template: `
  <main class="passkey-screen"><section class="panel passkey-card" data-testid="passkey-screen">
    <img class="passkey-logo" src="assets/notebookaid-64.png" alt="NotebookAid"><h1>NotebookAid</h1><h2>{{ t('locked') }}</h2><p>{{ t('hint') }}</p>
    <button class="primary" data-testid="passkey-unlock" (click)="unlock()" [disabled]="busy() || !initial.supported"><app-icon name="LockKeyhole" />{{ t('unlock') }}</button>
    @if (busy()) { <p role="status">{{ t('waiting') }}</p> } @if (error()) { <p class="warning" role="alert">{{ t('failed') }}</p> }
    @if (uiFailure.visible()) { <p class="warning" role="alert">{{ ui('unexpected') }}</p><button class="secondary" (click)="uiFailure.visible.set(false)"><app-icon name="X" />{{ ui('dismiss') }}</button> }
    @if (!initial.supported) { <p class="warning">{{ t('unavailable') }}</p> }
    <p class="muted">{{ t('phone') }}</p><button class="secondary" (click)="quit()"><app-icon name="Power" />{{ exitLabel }}</button>
  </section></main>
` })
export class PasskeyScreenComponent implements OnDestroy {
  readonly uiFailure = inject(UiFailure);
  ui(key: UiKey): string { return uiText(this.locale, key); }
  static initial: PasskeyState;
  readonly initial = PasskeyScreenComponent.initial;
  readonly dialogs = inject(AppDialogs);
  readonly busy = signal(false); readonly error = signal(false);
  readonly locale: Locale = languages.find(item => item.code === this.initial.locale)?.code ?? 'en';
  readonly exitLabel = translate(this.locale, 'exitApp');
  private readonly media = matchMedia('(prefers-color-scheme: dark)');
  private readonly applyTheme = () => { document.documentElement.dataset['theme'] = this.initial.theme === 'system' ? this.media.matches ? 'dark' : 'light' : this.initial.theme; document.documentElement.lang = this.locale === 'zh-TW' ? 'zh-HK' : this.locale; };
  constructor() { this.applyTheme(); this.media.addEventListener('change', this.applyTheme); }
  private readonly stop = window.notebookAid.library.onExit(async () => ({ dirty: false, busy: this.busy(), saved: true }));
  t(key: PasskeyKey): string { return passkeyText(this.locale, key); }
  async unlock(): Promise<void> { this.busy.set(true); this.error.set(false); try { const result = await window.notebookAid.appPasskeys('unlock'); if (!result.locked && !result.error) location.reload(); else this.error.set(true); } catch { this.error.set(true); } finally { this.busy.set(false); } }
  quit(): void { void window.notebookAid.quit(); }
  ngOnDestroy(): void { this.stop(); this.media.removeEventListener('change', this.applyTheme); }
}
