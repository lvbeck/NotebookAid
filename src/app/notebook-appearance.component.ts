import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { Dialog, DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { IconComponent } from './icon.component';
import { NoteWorkspace } from './note-workspace';
import { appearanceText, coverName, presetCovers, type AppearanceKey } from './appearance-i18n';
import { defaultNotebookAppearance, type NotebookAppearance } from '../../shared/notebook-appearance';
import type { LibraryEntryState } from '../../shared/registry';
import type { Locale } from './i18n';

@Component({ selector: 'app-cover-crop', standalone: true, imports: [FormsModule, IconComponent], template: `
  <section class="app-confirm-dialog cover-crop-dialog" data-testid="cover-crop-dialog">
    <header><span class="dialog-symbol"><app-icon name="Image" /></span><h2 id="cover-crop-title">{{ t('crop') }}</h2><button class="icon-button" [attr.aria-label]="t('cancel')" (click)="ref.close()"><app-icon name="X" /></button></header>
    <p class="muted">{{ t('cropHint') }}</p>
    <div class="cover-crop-layout"><canvas #canvas width="640" height="640" role="img" [attr.aria-label]="t('cropHint')" (pointerdown)="start($event)" (pointermove)="move($event)" (pointerup)="drag = null" (pointercancel)="drag = null"></canvas>
      <div class="cover-crop-controls"><label>{{ t('zoom') }} · {{ percent() }}%<input type="range" min="1" max="4" step="0.01" data-testid="cover-zoom" [(ngModel)]="zoom" (input)="draw()" [disabled]="!ready()"></label><label>{{ t('horizontal') }}<input type="range" min="0" max="100" step="1" data-testid="cover-x" [(ngModel)]="x" (input)="draw()" [disabled]="!ready()"></label><label>{{ t('vertical') }}<input type="range" min="0" max="100" step="1" data-testid="cover-y" [(ngModel)]="y" (input)="draw()" [disabled]="!ready()"></label></div>
    </div>
    @if (error()) { <p class="warning" role="alert">{{ t('failed') }}</p> }
    <footer><button class="secondary" data-testid="cover-crop-cancel" (click)="ref.close()"><app-icon name="X" />{{ t('cancel') }}</button><button class="primary" data-testid="cover-crop-save" [disabled]="!ready()" (click)="save()"><app-icon name="Check" />{{ t('save') }}</button></footer>
  </section>` })
export class CoverCropDialog implements AfterViewInit, OnDestroy {
  readonly data = inject<{ source: string; locale: Locale }>(DIALOG_DATA);
  readonly ref = inject(DialogRef<string>);
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;
  readonly ready = signal(false); readonly error = signal(false);
  private image = new Image();
  zoom = 1; x = 50; y = 50;
  drag: { px: number; py: number; x: number; y: number } | null = null;
  t(key: AppearanceKey): string { return appearanceText(this.data.locale, key); }
  percent(): number { return Math.round(Number(this.zoom) * 100); }
  ngAfterViewInit(): void {
    this.image.onload = () => { this.ready.set(true); this.draw(); };
    this.image.onerror = () => this.error.set(true);
    this.image.src = this.data.source;
  }
  ngOnDestroy(): void { this.image.onload = this.image.onerror = null; this.image.src = ''; this.drag = null; }
  private dimensions(): { w: number; h: number } { const scale = Math.max(512 / this.image.width, 512 / this.image.height) * Number(this.zoom); return { w: this.image.width * scale, h: this.image.height * scale }; }
  draw(): void {
    if (!this.ready()) return;
    const canvas = this.canvas.nativeElement, ctx = canvas.getContext('2d')!, { w, h } = this.dimensions();
    ctx.clearRect(0, 0, 640, 640); ctx.fillStyle = getComputedStyle(canvas).backgroundColor; ctx.fillRect(0, 0, 640, 640);
    ctx.drawImage(this.image, 64 - (w - 512) * this.x / 100, 64 - (h - 512) * this.y / 100, w, h);
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, 640, 64); ctx.fillRect(0, 576, 640, 64); ctx.fillRect(0, 64, 64, 512); ctx.fillRect(576, 64, 64, 512);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(64, 64, 512, 512); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,.45)';
    for (let i = 1; i < 3; i++) { const p = 64 + 512 * i / 3; ctx.beginPath(); ctx.moveTo(p, 64); ctx.lineTo(p, 576); ctx.moveTo(64, p); ctx.lineTo(576, p); ctx.stroke(); }
  }
  start(event: PointerEvent): void { if (!this.ready()) return; this.drag = { px: event.clientX, py: event.clientY, x: this.x, y: this.y }; this.canvas.nativeElement.setPointerCapture(event.pointerId); }
  move(event: PointerEvent): void {
    if (!this.drag) return;
    const { w, h } = this.dimensions(), ratio = 640 / this.canvas.nativeElement.getBoundingClientRect().width;
    this.x = w > 512 ? Math.max(0, Math.min(100, this.drag.x - (event.clientX - this.drag.px) * ratio * 100 / (w - 512))) : 50;
    this.y = h > 512 ? Math.max(0, Math.min(100, this.drag.y - (event.clientY - this.drag.py) * ratio * 100 / (h - 512))) : 50;
    this.draw();
  }
  save(): void {
    if (!this.ready()) return;
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
    const { w, h } = this.dimensions(); canvas.getContext('2d')!.drawImage(this.image, -(w - 512) * this.x / 100, -(h - 512) * this.y / 100, w, h);
    this.ref.close(canvas.toDataURL('image/png'));
  }
}

@Component({ selector: 'app-notebook-appearance', standalone: true, imports: [FormsModule, IconComponent], template: `
  <article class="panel settings-panel notebook-appearance" data-testid="notebook-appearance">
    <h2>{{ t('color') }}</h2>
    <div class="appearance-color-row"><label><input type="color" data-testid="notebook-color" [(ngModel)]="color" [disabled]="busy()" [attr.aria-label]="t('color')"></label><span>{{ color.toUpperCase() }}</span><span class="muted">{{ t('default') }}</span></div>
    <div class="notebook-swatches">@for (swatch of colors; track swatch) { <button type="button" class="secondary notebook-swatch" [class.selected]="color === swatch" [attr.aria-pressed]="color === swatch" [attr.aria-label]="swatch" [title]="swatch" [disabled]="busy()" (click)="color = swatch"><span [style.background]="swatch"></span></button> }</div>
    <h2>{{ t('cover') }}</h2><div class="notebook-cover-actions"><div class="notebook-cover">@if (cover) { <img [src]="cover" [alt]="t('cover')"> } @else { <span class="notebook-cover-placeholder" [style.color]="color"><app-icon name="Image" /><small>{{ t('empty') }}</small></span> }</div><div><div class="actions"><button class="secondary" data-testid="notebook-cover-choose" [disabled]="busy() || workspace.switching() || entry.availability !== 'available'" (click)="choose()"><app-icon name="ImagePlus" />{{ t('choose') }}</button><button class="secondary" data-testid="notebook-cover-remove" [disabled]="busy() || !cover" (click)="cover = null; preset = ''"><app-icon name="X" />{{ t('remove') }}</button></div><p class="muted">1:1 · 512 × 512</p></div></div>
    <h3>{{ t('presets') }}</h3><div class="notebook-preset-grid">@for (name of presets; track name; let i = $index) { <button class="notebook-preset" [attr.aria-label]="coverLabel(i)" [title]="coverLabel(i)" [attr.aria-pressed]="preset === name" [disabled]="busy()" [attr.data-cover-preset]="name" (click)="choosePreset(name)"><img [src]="'assets/notebook-covers/' + name + '.svg'" [alt]="coverLabel(i)"><span>{{ coverLabel(i) }}</span></button> }</div>
    <p class="muted">{{ t('hint') }}</p>@if (entry.appearanceIssue) { <p class="warning">{{ t('damaged') }}</p> }
    <button class="primary" data-testid="notebook-appearance-save" [disabled]="busy() || workspace.switching() || entry.availability !== 'available'" (click)="save()"><app-icon name="Save" />{{ t('save') }}</button>
    @if (message()) { <p role="status" data-testid="notebook-appearance-result" [class.warning]="failed()">{{ message() }}</p> }
  </article>` })
export class NotebookAppearanceComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) entry!: LibraryEntryState;
  @Input() locale: Locale = 'zh-CN';
  readonly workspace = inject(NoteWorkspace);
  private readonly dialogs = inject(Dialog);
  readonly busy = signal(false); readonly message = signal(''); readonly failed = signal(false);
  readonly colors = ['#7460c9', '#bd9da6', '#9aa99b', '#92a8ba', '#c3b397', '#a6a4af', '#b89b88', '#a3b6b1', '#afa2bb', '#bcc1a2'];
  readonly presets = presetCovers;
  color = '#7460c9'; cover: string | null = null; preset = '';
  private id = ''; private alive = true; private crop?: DialogRef<string>;
  private baseline = defaultNotebookAppearance();
  t(key: AppearanceKey): string { return appearanceText(this.locale, key); }
  coverLabel(index: number): string { return coverName(this.locale, index); }
  ngOnChanges(): void {
    const changed = this.entry.id !== this.id;
    if (changed || (!this.busy() && this.color === this.baseline.color && this.cover === this.baseline.cover)) {
      if (changed) { this.crop?.close(); this.message.set(''); }
      this.id = this.entry.id; this.baseline = this.entry.appearance ?? defaultNotebookAppearance(); this.color = this.baseline.color; this.cover = this.baseline.cover; this.preset = '';
    }
  }
  ngOnDestroy(): void { this.alive = false; this.crop?.close(); }
  async choose(): Promise<void> {
    if (this.busy()) return;
    const id = this.id; this.busy.set(true); this.message.set('');
    try {
      const result = await window.notebookAid.library.chooseNotebookCover(id);
      if (!this.alive || id !== this.id) return;
      if (!result.ok) { this.failed.set(true); this.message.set(this.t('failed') + ' · ' + result.code); return; }
      if (!result.value) return;
      this.crop = this.dialogs.open<string>(CoverCropDialog, { data: { source: result.value, locale: this.locale }, ariaLabelledBy: 'cover-crop-title', ariaModal: true, panelClass: 'app-dialog-panel', backdropClass: 'app-dialog-backdrop', width: '760px', maxWidth: 'calc(100vw - 32px)', restoreFocus: true });
      const cover = await firstValueFrom(this.crop.closed);
      if (this.alive && this.id === id && cover) { this.cover = cover; this.preset = ''; }
    } catch { if (this.alive && id === this.id) { this.failed.set(true); this.message.set(this.t('failed')); } }
    finally { this.busy.set(false); }
  }
  async choosePreset(name: string): Promise<void> {
    if (this.busy() || !presetCovers.includes(name)) return;
    const id = this.id; this.busy.set(true); this.message.set('');
    try {
      const image = new Image(); await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = reject; image.src = 'assets/notebook-covers/' + name + '.svg'; });
      if (!this.alive || id !== this.id) return;
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512; canvas.getContext('2d')!.drawImage(image, 0, 0, 512, 512);
      this.cover = canvas.toDataURL('image/png'); this.preset = name;
    } catch { if (this.alive && id === this.id) { this.failed.set(true); this.message.set(this.t('failed')); } }
    finally { this.busy.set(false); }
  }
  async save(): Promise<void> {
    if (this.busy()) return;
    const id = this.id, value: NotebookAppearance = { version: 1, color: this.color, cover: this.cover };
    this.busy.set(true); this.message.set('');
    try {
      const result = await window.notebookAid.library.setNotebookAppearance(id, value);
      if (result.ok) {
        if (this.alive && id === this.id) { this.baseline = result.value.entries.find(item => item.id === id)?.appearance ?? value; this.color = this.baseline.color; this.cover = this.baseline.cover; }
        this.workspace.registry.set(result.value);
      }
      if (this.alive && id === this.id) { this.failed.set(!result.ok); this.message.set(result.ok ? this.t('saved') : this.t('failed') + ' · ' + result.code); }
    } catch { if (this.alive && id === this.id) { this.failed.set(true); this.message.set(this.t('failed')); } }
    finally { this.busy.set(false); }
  }
}
