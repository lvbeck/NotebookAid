import { Component, inject } from '@angular/core';
import { EasterBridge } from './easter-bridge';
import { Preferences } from './preferences';
import { IconComponent } from './icon.component';
import { eggText } from './easter-i18n';

@Component({ selector: 'app-easter-settings', standalone: true, imports: [IconComponent], template: `
  <article class="panel settings-panel" data-testid="easter-settings">
    <h2>{{ t(0) }}</h2>
    <label class="setting-row"><span>{{ t(1) }}</span><input type="checkbox" data-testid="easter-enabled" [checked]="eggs.state().enabled" [disabled]="prefs.busy()" (change)="toggle('enabled', $event)"></label>
    <label class="setting-row"><span>{{ t(2) }}</span><input type="checkbox" data-testid="easter-reduced" [checked]="eggs.state().reducedMotion" [disabled]="prefs.busy()" (change)="toggle('reducedMotion', $event)"></label>
    <p class="muted">{{ t(8) }} {{ eggs.state().found.length }}/6 · {{ t(30) }}</p>
    <button class="secondary" data-testid="easter-collection" (click)="eggs.open()"><app-icon name="Sparkles" />{{ t(3) }}</button>
  </article>` })
export class EasterSettings {
  readonly eggs = inject(EasterBridge); readonly prefs = inject(Preferences);
  t(index: number): string { return eggText(this.prefs.locale(), index); }
  async toggle(key: 'enabled' | 'reducedMotion', event: Event): Promise<void> {
    const input = event.target as HTMLInputElement, checked = input.checked;
    if (key === 'enabled' && !checked) this.eggs.stop();
    await this.eggs.update(state => ({ ...state, [key]: checked })); input.checked = this.eggs.state()[key];
  }
}
