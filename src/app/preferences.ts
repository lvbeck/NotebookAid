import { Injectable, computed, inject, signal } from '@angular/core';
import { defaultSettings, type SettingsState, type GlobalSettingsPatch, type AutosaveSettings } from '../../shared/settings';
import { NotificationService } from './notification-service';
@Injectable({ providedIn: 'root' })
export class Preferences {
  readonly state = signal<SettingsState>(structuredClone(defaultSettings));
  readonly ready = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly locale = computed(() => this.state().global.locale);
  readonly theme = computed(() => this.state().global.theme);
  private readonly notices = inject(NotificationService);
  private queue: Promise<void> = Promise.resolve();
  private jobs = 0;
  readonly initialized = this.reload();
  private enqueue(action: () => Promise<void>): Promise<void> {
    this.jobs++; this.busy.set(true);
    this.queue = this.queue.then(action).catch(() => { this.error.set('WRITE_FAILED'); void this.notices.publish('settingsFailed', 'settings'); }).finally(() => { if (--this.jobs === 0) this.busy.set(false); });
    return this.queue;
  }
  idle(): Promise<void> { return this.queue; }
  reload(): Promise<void> {
    return this.enqueue(async () => {
      const result = await window.notebookAid.library.settings({ locale: localStorage.getItem('notebookaid.t02.locale'), theme: localStorage.getItem('notebookaid.t02.theme'), autosave: localStorage.getItem('notebookaid.autosave') });
      if (!result.ok) { this.error.set(result.code); return; }
      this.state.set(result.value); this.ready.set(true); this.error.set('');
    });
  }
  update(patch: GlobalSettingsPatch): Promise<void> { return this.save(() => window.notebookAid.library.updateSettings(patch)); }
  override(id: string, patch: Partial<AutosaveSettings> | null): Promise<void> {
    return this.save(() => window.notebookAid.library.librarySettings(id, patch === null ? null : { ...(this.state().libraries[id] ?? this.state().global.autosave), ...patch }));
  }
  private save(action: () => ReturnType<typeof window.notebookAid.library.updateSettings>): Promise<void> {
    return this.enqueue(async () => {
      if (!this.ready()) return;
      const result = await action();
      if (!result.ok) { this.error.set(result.code); void this.notices.publish('settingsFailed', 'settings'); return; }
      this.state.set(result.value); this.error.set(''); void this.notices.publish('settingsSaved', 'settings');
    });
  }
}
