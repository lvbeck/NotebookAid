import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, effect, inject, signal } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { IconComponent } from './icon.component';
import { EasterBridge } from './easter-bridge';
import { Preferences } from './preferences';
import { eggText } from './easter-i18n';
import { eggIds, type EggId } from '../../shared/easter-eggs';

@Component({ standalone: true, imports: [IconComponent], styles: [`
  header,footer{display:flex;align-items:center;gap:10px}header h2{flex:1;margin:0}footer{justify-content:flex-end;flex-wrap:wrap}
  .eggs-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:20px 0}.egg-card{border:1px solid var(--line);border-radius:12px;padding:16px;min-width:0;background:var(--bg);text-align:center}.egg-card app-icon{color:var(--accent)}.egg-card h3{font-size:1rem;margin:12px 0}.egg-card p{font-size:.85rem}.egg-card.locked{color:var(--muted)}
  .medal{display:flex;justify-content:center;align-items:center;min-height:120px;color:var(--accent)}.medal app-icon{transform:scale(2)}
  .celebration{position:relative;height:190px;border-radius:12px;background:var(--bg);overflow:hidden;display:flex;align-items:center;justify-content:center;gap:18px}.celebration canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.celebration app-icon{color:var(--accent)}progress{width:100%;height:10px;accent-color:var(--accent)}
  .egg-card summary{cursor:pointer}.egg-card details p{text-align:start}.reset-copy{color:var(--muted)}
  @media(max-width:480px){.eggs-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.celebration{gap:10px}footer button{width:100%}}
`], template: `
  <section class="app-confirm-dialog" data-testid="easter-dialog" [attr.data-mode]="mode()">
    <header><app-icon name="Sparkles" /><h2 id="easter-title">{{ t(mode() === 'discovery' ? 7 : mode() === 'celebrate' ? 10 : 0) }}</h2><button class="icon-button" data-testid="easter-close" [attr.aria-label]="t(5)" (click)="ref.close()"><app-icon name="X" /></button></header>
    <p class="muted" role="status">{{ t(8) }} {{ eggs.state().found.length }}/6</p>
    <progress max="6" [value]="eggs.state().found.length" [attr.aria-label]="t(8)"></progress>
    @if(mode() === 'discovery') {
      <div class="medal"><app-icon [name]="icon(data.id!)" /></div><h3 style="text-align:center">{{ name(data.id!) }}</h3>
      <footer><button class="secondary" data-testid="easter-continue" (click)="ref.close()"><app-icon name="Check" />{{ t(6) }}</button><button class="primary" (click)="collection()"><app-icon name="Sparkles" />{{ t(3) }}</button></footer>
    } @else if(mode() === 'celebrate') {
      <p>{{ t(31) }}</p><div class="celebration" #field data-testid="easter-celebration">@if(!animating()){@for(id of ids;track id){<app-icon [name]="icon(id)" />}}</div>
      <footer>@if(animating()){<button class="secondary" data-testid="easter-skip" (click)="stop()"><app-icon name="X" />{{ t(11) }}</button>}<button class="primary" data-testid="easter-return" (click)="collection()"><app-icon name="ChevronLeft" />{{ t(12) }}</button></footer>
    } @else {
      <div class="eggs-grid">@for(id of ids;track id){<article class="egg-card" [class.locked]="!found(id)"><app-icon [name]="found(id) ? icon(id) : 'LockKeyhole'" /><h3>{{ found(id) ? name(id) : t(9) }}</h3>@if(!found(id)){<details><summary>{{ t(17) }}</summary><p>{{ clue(id) }}</p><button class="secondary" [disabled]="!eggs.state().enabled" (click)="eggs.find(id)"><app-icon name="ChevronRight" />{{ t(32) }}</button></details>}</article>}</div>
      @if(confirmReset()){<p class="reset-copy">{{ t(14) }}</p>}
      <footer>@if(confirmReset()){<button class="secondary" (click)="confirmReset.set(false)"><app-icon name="X" />{{ t(15) }}</button><button class="primary" data-testid="easter-reset-confirm" [disabled]="prefs.busy()" (click)="reset()"><app-icon name="RefreshCw" />{{ t(16) }}</button>}@else{<button class="secondary" data-testid="easter-reset" [disabled]="prefs.busy()" (click)="confirmReset.set(true)"><app-icon name="RefreshCw" />{{ t(4) }}</button>@if(eggs.state().found.length === 6 && eggs.state().enabled){<button class="primary" data-testid="easter-replay" (click)="celebrate()"><app-icon name="Sparkles" />{{ t(13) }}</button>}}<button class="secondary" (click)="ref.close()"><app-icon name="X" />{{ t(5) }}</button></footer>
    }
  </section>` })
export class EasterDialog implements AfterViewInit, OnDestroy {
  readonly data = inject<{ mode: 'discovery' | 'collection' | 'celebrate'; id?: EggId }>(DIALOG_DATA);
  readonly ref = inject(DialogRef); readonly eggs = inject(EasterBridge); readonly prefs = inject(Preferences);
  readonly mode = signal(this.data.mode); readonly animating = signal(false); readonly confirmReset = signal(false); readonly ids = eggIds;
  @ViewChild('field') field?: ElementRef<HTMLElement>;
  private cancel?: () => void; private epoch = 0; private alive = true;
  private readonly media = matchMedia('(prefers-reduced-motion: reduce)');
  constructor() { effect(() => { if (!this.eggs.state().enabled || this.eggs.state().reducedMotion) this.stop(); }); }
  t(index: number): string { return eggText(this.prefs.locale(), index); }
  found(id: EggId): boolean { return this.eggs.state().found.includes(id); }
  name(id: EggId): string { return this.t(18 + this.ids.indexOf(id)); }
  clue(id: EggId): string { return this.t(24 + this.ids.indexOf(id)); }
  icon(id: EggId): IconComponent['name'] { return (['Sparkles','Radio','Sun','Moon','Compass','Heart'] as const)[this.ids.indexOf(id)] ?? 'Sparkles'; }
  ngAfterViewInit(): void {
    document.addEventListener('visibilitychange', this.visibility); window.addEventListener('blur', this.stopListener);
    this.media.addEventListener('change', this.motion);
    if (this.mode() === 'celebrate') void this.start();
  }
  private readonly visibility = () => { if (document.hidden) this.stop(); };
  private readonly stopListener = () => this.stop();
  private readonly motion = () => { if (this.media.matches) this.stop(); };
  stop(): void { this.epoch++; this.cancel?.(); this.cancel = undefined; this.animating.set(false); }
  collection(): void { this.stop(); this.mode.set('collection'); }
  celebrate(): void { if (!this.eggs.state().enabled || this.eggs.state().found.length !== 6) return; this.mode.set('celebrate'); setTimeout(() => { if (this.alive && this.mode() === 'celebrate') void this.start(); }); }
  private async start(): Promise<void> {
    this.stop(); const epoch = this.epoch;
    if (!this.alive || this.media.matches || this.eggs.state().reducedMotion || !this.eggs.state().enabled || document.hidden) return;
    try {
      const { fireworks } = await import('./easter-fireworks');
      if (!this.alive || epoch !== this.epoch || !this.field || this.media.matches || document.hidden) return;
      this.animating.set(true); this.cancel = fireworks(this.field.nativeElement, () => this.stop());
    } catch { this.stop(); }
  }
  async reset(): Promise<void> { this.stop(); await this.eggs.update(state => ({ ...state, found: [], celebrated: false })); this.confirmReset.set(false); }
  ngOnDestroy(): void { this.alive = false; this.stop(); document.removeEventListener('visibilitychange', this.visibility); window.removeEventListener('blur', this.stopListener); this.media.removeEventListener('change', this.motion); }
}
