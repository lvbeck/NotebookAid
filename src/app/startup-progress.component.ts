import { Component, Input, Output, EventEmitter } from '@angular/core';
import { IconComponent } from './icon.component';
import type { Locale } from './i18n';
import { errorText } from './ui-i18n';
import { startupText } from './startup-i18n';
import type { StartupProgress } from '../../shared/startup';

@Component({ selector: 'app-startup-progress', standalone: true, imports: [IconComponent], template: `
<section class="startup-state" data-testid="notebook-loading" [attr.data-phase]="failure ? 'failed' : progress.phase" [attr.aria-busy]="!failure">
  <app-icon name="BookOpen" />
  <h2 role="status">{{ label() }}</h2>
  @if (failure) { <p>{{ reason() }}</p><button class="secondary" data-testid="startup-retry" (click)="retry.emit()"><app-icon name="RefreshCw" />{{ retryLabel() }}</button> }
  @else {
    <div class="startup-track" [class.indeterminate]="!determinate()" role="progressbar" [attr.aria-label]="label()" [attr.aria-valuemin]="0" [attr.aria-valuemax]="determinate() ? progress.total : null" [attr.aria-valuenow]="determinate() ? progress.processed : null"><div [style.width.%]="determinate() ? percent() : 30"></div></div>
    @if (determinate()) { <p>{{ progress.processed }} / {{ progress.total }}</p> }
  }
</section>`, styles: [`.startup-state{max-width:440px;margin:100px auto;padding:24px;text-align:center;color:var(--muted)}.startup-state>app-icon{display:inline-flex;width:44px;height:44px;color:var(--accent)}h2{color:var(--text);font-size:20px;margin:20px 0}.startup-track{height:8px;border-radius:8px;background:var(--surface-soft,var(--line));overflow:hidden;margin:20px 0}.startup-track>div{height:100%;background:var(--accent);border-radius:8px}.indeterminate>div{animation:startup-move 1.4s ease-in-out infinite}p{font-variant-numeric:tabular-nums}.secondary{display:inline-flex;align-items:center;justify-content:center;gap:8px}@keyframes startup-move{from{transform:translateX(-110%)}to{transform:translateX(440%)}}@media(prefers-reduced-motion:reduce){.indeterminate>div{animation:none;width:100%!important;opacity:.4}}` ] })
export class StartupProgressComponent {
  @Input() locale: Locale = 'zh-CN';
  @Input() progress: StartupProgress = { phase: 'opening' };
  @Input() failure = '';
  @Output() retry = new EventEmitter<void>();
  label(): string { return startupText(this.locale, this.failure ? 'failed' : this.progress.phase); }
  retryLabel(): string { return startupText(this.locale, 'retry'); }
  reason(): string { return errorText(this.locale, this.failure); }
  determinate(): boolean { return this.progress.phase === 'notes' && !!this.progress.total && this.progress.processed !== undefined; }
  percent(): number { return Math.max(0, Math.min(100, (this.progress.processed ?? 0) / (this.progress.total ?? 1) * 100)); }
}
