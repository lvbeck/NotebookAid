import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { IconComponent } from './icon.component';
import { Preferences } from './preferences';
import { securityText, type SecurityKey } from './security-i18n';
import { recoveryDocument } from '../../shared/recovery-document';

@Component({ selector: 'app-recovery-print-preview', standalone: true, imports: [IconComponent], template: `
  <section class="app-confirm-dialog recovery-preview" data-testid="recovery-preview">
    <header><span class="dialog-symbol"><app-icon name="Printer" /></span><h2 id="recovery-preview-title">{{ t('printPreview') }}</h2><button class="icon-button" [disabled]="busy()" [attr.aria-label]="t('cancel')" (click)="ref.close()"><app-icon name="X" /></button></header>
    <div class="recovery-preview-scroll"><div #paper class="recovery-preview-paper" [style.height.px]="1123 * scale()"><iframe sandbox="" title="A4" [srcdoc]="document" [style.transform]="'scale(' + scale() + ')'" ></iframe></div></div>
    @if (error()) { <p role="alert" class="warning">{{ error() }}</p> }
    <footer><button class="secondary" data-testid="recovery-preview-cancel" [disabled]="busy()" (click)="ref.close()"><app-icon name="X" />{{ t('cancel') }}</button><button class="secondary" data-testid="recovery-preview-pdf" [disabled]="busy()" (click)="output('pdf')"><span class="pdf-file-icon"><app-icon name="FileText" /><small>PDF</small></span>{{ t('savePdf') }}</button><button class="primary" data-testid="recovery-preview-print" [disabled]="busy()" (click)="output('print')"><app-icon name="Printer" />{{ t('print') }}</button></footer>
  </section>` })
export class RecoveryPrintPreview implements AfterViewInit, OnDestroy {
  readonly data = inject<{ key: string }>(DIALOG_DATA);
  readonly ref = inject(DialogRef);
  readonly prefs = inject(Preferences);
  readonly busy = signal(false); readonly error = signal(''); readonly scale = signal(1);
  @ViewChild('paper') paper!: ElementRef<HTMLElement>;
  private readonly sanitizer = inject(DomSanitizer);
  document: SafeHtml | null = this.sanitizer.bypassSecurityTrustHtml(recoveryDocument('NotebookAid · ' + this.t('recovery'), this.t('recoveryHint'), this.data.key));
  private observer?: ResizeObserver;
  t(key: SecurityKey): string { return securityText(this.prefs.locale(), key); }
  ngAfterViewInit(): void {
    this.observer = new ResizeObserver(entries => this.scale.set(Math.min(1, entries[0].contentRect.width / 794)));
    this.observer.observe(this.paper.nativeElement);
  }
  async output(mode: 'print' | 'pdf'): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true); this.ref.disableClose = true; this.error.set('');
    try {
      const result = await window.notebookAid.library.printRecovery(mode, this.data.key);
      if (!result.ok) this.error.set(this.t('failed') + ' · ' + result.code);
    } catch { this.error.set(this.t('failed')); }
    finally { this.busy.set(false); this.ref.disableClose = false; }
  }
  ngOnDestroy(): void { this.observer?.disconnect(); this.data.key = ''; this.document = null; }
}
