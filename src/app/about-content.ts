import { Component, Input, inject, signal } from '@angular/core';
import { IconComponent } from './icon.component';
import { EasterBridge } from './easter-bridge';
import { aboutText, type AboutKey } from './about-i18n';
import { informationText, type InformationKey } from './information-i18n';
import type { Locale } from './i18n';
import { projectLicense } from './project-license';

@Component({ selector: 'app-about-content', standalone: true, imports: [IconComponent], template: `
  <div class="about-content">
    <div class="information-brand"><img src="assets/notebookaid-64.png" alt=""><div><h3>NotebookAid</h3><p>{{ t('description') }}</p></div></div>
    <p>{{ taglinePrefix() }}<button class="easter-slogan" data-testid="egg-echo" (click)="eggs.collect('echo')">{{ taglineEcho() }}</button></p>
    <section><h3>{{ text('software') }}</h3><div class="about-metadata">
      <dl><dt>{{ text('name') }}</dt><dd>NotebookAid</dd><dt>{{ t('author') }}</dt><dd>Jin Lu</dd></dl>
      <dl><dt>{{ t('version') }}</dt><dd data-testid="information-version">{{ version || runtimeVersion() }}</dd><dt>{{ t('contact') }}</dt><dd><a href="mailto:it@live.cn" (click)="open($event,'contact')">it&#64;live.cn</a></dd></dl>
    </div><div class="about-links"><a href="https://github.com/lvbeck/NotebookAid" (click)="open($event,'github')" data-testid="about-github"><app-icon name="GitFork" />{{ text('github') }}</a><button class="about-link" [attr.aria-expanded]="privacy()" (click)="privacy.set(!privacy())"><app-icon name="FileText" />{{ t('privacy') }}</button></div>
    @if(privacy()){<div class="about-privacy">@for(key of privacyKeys;track key){<p>{{ t(key) }}</p>}</div>}</section>
    <section><h3>{{ t('license') }}</h3><p class="muted">{{ text('licenseHint') }}</p><details data-testid="about-license"><summary>{{ text('fullLicense') }}</summary><pre class="license-text">{{ license }}</pre></details></section>
    <section><h3>{{ text('disclaimer') }}</h3><p class="muted">{{ text('warranty') }}</p><p class="muted">{{ text('aiDisclaimer') }}</p></section>
    <section><h3>{{ text('support') }}</h3><p class="muted">{{ text('supportHint') }}</p><a class="primary about-coffee" href="https://buymeacoffee.com/lvbeck" (click)="open($event,'support')" data-testid="about-support"><app-icon name="Coffee" />Buy me a coffee</a><p class="muted">{{ text('voluntary') }}</p></section>
    @if(linkError()){<p class="warning" role="alert">{{ text('linkFailed') }}</p>}
    <p class="muted about-copyright">Copyright © 2026 Jin Lu · BSD-3-Clause</p>
  </div>` })
export class AboutContent {
  @Input() locale: Locale = 'zh-CN';
  @Input() version = '';
  readonly runtimeVersion = signal('—');
  readonly privacy = signal(false);
  readonly linkError = signal(false);
  readonly eggs = inject(EasterBridge);
  readonly license = projectLicense;
  readonly privacyKeys: InformationKey[] = ['privacyLocal','privacyAi','privacyCredentials','privacyBridge','privacyBackup'];
  constructor() { void window.notebookAid.runtime().then(value => this.runtimeVersion.set(value.version)).catch(() => {}); }
  t(key: InformationKey): string { return informationText(this.locale,key); }
  text(key: AboutKey): string { return aboutText(this.locale,key); }
  private taglineBreak(): number { const value=this.t('tagline'); return Math.max(value.lastIndexOf(','),value.lastIndexOf('，'))+1; }
  taglinePrefix(): string { return this.t('tagline').slice(0,this.taglineBreak()); }
  taglineEcho(): string { return this.t('tagline').slice(this.taglineBreak()); }
  async open(event: Event, target: 'github'|'support'|'contact'): Promise<void> { event.preventDefault(); this.linkError.set(false); try { await window.notebookAid.openInformationLink(target); } catch { this.linkError.set(true); } }
}
