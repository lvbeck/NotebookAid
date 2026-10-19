import { AfterViewInit, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { FormsModule } from '@angular/forms';
import { formulaHtml } from '../../shared/math-render';
import { formulaLimit, formulaSource } from '../../shared/math-source';
import { mathText, type MathKey } from './math-i18n';
import type { Locale } from './i18n';

@Component({ selector: 'app-math-dialog', standalone: true, imports: [FormsModule], template: `
  <section class="app-confirm-dialog math-dialog" data-testid="math-dialog">
    <header><h2 id="math-dialog-title">{{label('edit')}}</h2></header>
    <label>{{label('source')}}<textarea data-testid="math-source" [ngModel]="latex()" (ngModelChange)="latex.set($event); check()" [attr.maxlength]="limit" rows="4" spellcheck="false"></textarea></label>
    <div class="segmented-radio" role="radiogroup" [attr.aria-label]="label('formula')">
      <label><input type="radio" name="math-mode" data-testid="math-inline" [checked]="!block()" (change)="block.set(false); check()"><span>{{label('inline')}}</span></label>
      <label><input type="radio" name="math-mode" data-testid="math-block" [checked]="block()" (change)="block.set(true); check()"><span>{{label('block')}}</span></label>
    </div>
    <div #preview class="math-preview" data-testid="math-preview" aria-live="polite"></div>
    @if (invalid()) { <p role="alert" class="warning" data-testid="math-error">{{label('invalid')}}</p> }
    <footer>@if (data.source) { <button class="secondary" data-testid="math-remove" (click)="ref.close('')">{{label('remove')}}</button> }<button class="secondary" data-testid="math-cancel" (click)="ref.close()">{{label('cancel')}}</button><button class="primary" data-testid="math-apply" [disabled]="invalid()" (click)="ref.close(value())">{{label('apply')}}</button></footer>
  </section>
` })
export class MathDialog implements AfterViewInit {
  @ViewChild('preview') preview?: ElementRef<HTMLElement>;
  readonly data = inject<{ source: string; locale: Locale }>(DIALOG_DATA);
  readonly ref = inject<DialogRef<string | undefined>>(DialogRef);
  readonly limit = formulaLimit - 8;
  private readonly initial = formulaSource(this.data.source);
  readonly latex = signal(this.initial?.latex ?? 'x^2');
  readonly block = signal(this.initial?.display ?? false);
  readonly invalid = signal(false);
  constructor() { this.check(); }
  ngAfterViewInit(): void { this.check(); }
  label(key: MathKey): string { return mathText(this.data.locale, key); }
  value(): string {
    if (this.initial && this.latex() === this.initial.latex && this.block() === this.initial.display) return this.data.source;
    return this.block() ? '$$\n' + this.latex() + '\n$$' : '$' + this.latex() + '$';
  }
  check(): void { try { if (!this.latex().trim()) throw Error('EMPTY'); const html = formulaHtml(this.value()); if (this.preview) this.preview.nativeElement.innerHTML = html; this.invalid.set(false); } catch { this.preview?.nativeElement.replaceChildren(); this.invalid.set(true); } }
}
