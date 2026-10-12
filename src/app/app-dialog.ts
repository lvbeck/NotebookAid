import { Component, Injectable, OnDestroy, inject } from '@angular/core';
import { DIALOG_DATA, Dialog, DialogModule, DialogRef } from '@angular/cdk/dialog';
import type { AppDialog, DialogAnswer } from '../../shared/dialog';
import { IconComponent } from './icon.component';

@Component({
  standalone: true, imports: [DialogModule, IconComponent], selector: 'app-confirm-dialog',
  template: `
    <section class="app-confirm-dialog" data-testid="app-dialog">
      <header><span class="dialog-symbol" [class.warning]="data.kind === 'warning'"><app-icon [name]="data.kind === 'warning' ? 'TriangleAlert' : 'InfoPlain'" /></span><h2 id="app-dialog-title">{{ data.title }}</h2><button class="icon-button" data-testid="dialog-close" [attr.aria-label]="data.cancelLabel" (click)="ref.close(false)"><app-icon name="X" /></button></header>
      <div id="app-dialog-description" class="dialog-copy"><p>{{ data.message }}</p>@if (data.detail) { <p class="dialog-detail">{{ data.detail }}</p> }</div>
      <footer><button class="secondary" data-testid="dialog-cancel" (click)="ref.close(false)"><app-icon name="X" />{{ data.cancelLabel }}</button>@if (data.discardLabel) { <button class="secondary" data-testid="dialog-discard" (click)="ref.close('discard')"><app-icon name="Power" />{{ data.discardLabel }}</button> }<button class="primary" data-testid="dialog-confirm" (click)="ref.close(true)"><app-icon name="Check" />{{ data.confirmLabel }}</button></footer>
    </section>`
})
export class AppConfirmDialog {
  readonly data = inject<AppDialog>(DIALOG_DATA);
  readonly ref = inject<DialogRef<DialogAnswer>>(DialogRef);
}

@Injectable({ providedIn: 'root' })
export class AppDialogs implements OnDestroy {
  private readonly dialog = inject(Dialog);
  private active: { id: string; ref: DialogRef<DialogAnswer> } | null = null;
  get opened(): boolean { return this.active !== null; }
  private readonly stopRequest = window.notebookAid.dialogs.onRequest(data => {
    if (this.active) { void window.notebookAid.dialogs.respond(data.id, false); return; }
    const ref = this.dialog.open<DialogAnswer>(AppConfirmDialog, {
      data, role: 'alertdialog', ariaModal: true,
      ariaLabelledBy: 'app-dialog-title', ariaDescribedBy: 'app-dialog-description',
      autoFocus: '[data-testid=dialog-cancel]', restoreFocus: true,
      panelClass: 'app-dialog-panel', backdropClass: 'app-dialog-backdrop',
      width: data.discardLabel ? '640px' : '480px', maxWidth: 'calc(100vw - 32px)'
    });
    this.active = { id: data.id, ref };
    ref.closed.subscribe(accepted => {
      if (this.active?.id === data.id) this.active = null;
      void window.notebookAid.dialogs.respond(data.id, accepted === 'discard' ? 'discard' : accepted === true);
    });
  });
  private readonly stopDismiss = window.notebookAid.dialogs.onDismiss(id => {
    if (this.active?.id === id) this.active.ref.close(false);
  });
  ngOnDestroy(): void { this.stopRequest(); this.stopDismiss(); this.active?.ref.close(false); }
}
