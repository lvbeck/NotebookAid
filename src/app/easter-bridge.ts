import { Injectable, computed, inject } from '@angular/core';
import { Dialog, type DialogRef } from '@angular/cdk/dialog';
import { Preferences } from './preferences';
import { UiFailure } from './ui-failure';
import { defaultEasterState, type EasterState, type EggId } from '../../shared/easter-eggs';

/** Keep only dispatch and persistence in the initial bundle. */
@Injectable({ providedIn: 'root' })
export class EasterBridge {
  private readonly prefs = inject(Preferences);
  private readonly dialogs = inject(Dialog);
  private readonly failure = inject(UiFailure);
  readonly state = computed(() => this.prefs.state().global.easterEggs ?? defaultEasterState);
  private queue: Promise<void> = Promise.resolve();
  private generation = 0;
  private ref?: Pick<DialogRef, 'close'>;
  private taps: number[] = [];
  private finder?: (id: EggId) => void;
  attachFinder(finder: (id: EggId) => void): void { this.finder = finder; }
  find(id: EggId): void { this.stop(); requestAnimationFrame(() => this.finder?.(id)); }
  logo(): void {
    if (!this.state().enabled) return;
    const now = Date.now(); this.taps = this.taps.filter(time => now - time < 3500); this.taps.push(now);
    if (this.taps.length >= 3) { this.taps = []; void this.collect('hello'); }
  }
  update(change: (state: EasterState) => EasterState): Promise<void> {
    const job = this.queue.then(async () => {
      await this.prefs.idle(); if (!this.prefs.ready()) return;
      await this.prefs.update({ easterEggs: change(structuredClone(this.state())) }, false);
    });
    this.queue = job.catch(() => {}); return job;
  }
  async collect(id: EggId): Promise<void> {
    if (!this.state().enabled || this.state().found.includes(id) || document.hidden) return;
    let added = false, complete = false;
    const generation = this.generation;
    await this.update(state => {
      if (!state.enabled || state.found.includes(id)) return state;
      state.found.push(id); added = true;
      complete = state.found.length === 6 && !state.celebrated;
      if (complete) state.celebrated = true;
      return state;
    });
    if (added && generation === this.generation && this.state().enabled && this.state().found.includes(id))
      await this.open(complete ? 'celebrate' : 'discovery', id);
  }
  async open(mode: 'collection' | 'discovery' | 'celebrate' = 'collection', id?: EggId): Promise<void> {
    if (!this.prefs.ready() || document.hidden || (mode !== 'collection' && !this.state().enabled)) return;
    const generation = this.generation;
    try {
      const { EasterDialog } = await import('./easter-dialog');
      if (generation !== this.generation || document.hidden) return;
      this.ref?.close();
      this.ref = this.dialogs.open(EasterDialog, { data: { mode, id }, ariaLabelledBy: 'easter-title', panelClass: 'app-dialog-panel', backdropClass: 'app-dialog-backdrop', width: '640px', maxWidth: 'calc(100vw - 32px)', autoFocus: '[data-testid=easter-close]', restoreFocus: true });
    } catch { this.failure.visible.set(true); }
  }
  stop(): void { this.generation++; this.taps = []; this.ref?.close(); this.ref = undefined; }
}
