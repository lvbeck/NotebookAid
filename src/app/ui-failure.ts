import { ErrorHandler, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UiFailure extends ErrorHandler {
  readonly visible = signal(false);
  override handleError(_error: unknown): void {
    // Do not log exception payloads: they may contain credentials or note content.
    this.visible.set(true);
  }
}
