import { Injectable, computed, signal } from '@angular/core';
import { notificationTypes, notificationPositions } from '../../shared/notifications';
import type { NotificationCode, NotificationInput, NotificationPosition, NotificationRecord, NotificationResult, NotificationState } from '../../shared/notifications';

interface ToastTimer { remaining: number; started: number; timer?: ReturnType<typeof setTimeout>; reasons: Set<string>; }
@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly records = signal<NotificationRecord[]>([]);
  readonly toasts = signal<NotificationRecord[]>([]);
  readonly position = signal<NotificationPosition>('bottom-right');
  readonly drawerOpen = signal(false);
  readonly storageFailed = signal(false);
  readonly busy = signal(false);
  readonly unread = computed(() => this.records().filter(item => !item.read).length);
  private readonly api = window.notebookAid.notifications;
  private readonly timers = new Map<string, ToastTimer>();
  private queue: Promise<void> = Promise.resolve();
  private jobs = 0;
  private restoreTarget: HTMLElement | null = null;

  constructor() { void this.reload(); }
  private accept(result: NotificationResult<NotificationState>): boolean {
    if (!result.ok) { this.storageFailed.set(true); return false; }
    this.records.set(result.value.records); this.position.set(result.value.position); this.storageFailed.set(false); return true;
  }
  private enqueue(action: () => Promise<void>): Promise<void> {
    this.jobs++; this.busy.set(true);
    this.queue = this.queue.then(action).catch(() => this.storageFailed.set(true)).finally(() => { if (--this.jobs === 0) this.busy.set(false); });
    return this.queue;
  }
  async idle(): Promise<void> { await this.queue; }
  reload(): Promise<void> { return this.enqueue(async () => { this.accept(await this.api.state()); }); }
  publish(code: NotificationCode, operation: NotificationInput['operation'], libraryId: string | null = null, errorCode: NotificationInput['errorCode'] = null): Promise<void> {
    const input: NotificationInput = { code, operation, libraryId, errorCode };
    return this.enqueue(async () => {
      try {
        const result = await this.api.publish(input);
        if (result.ok) {
          this.accept({ ok: true, value: result.value.state });
          const existing = this.toasts().some(item => item.id === result.value.record.id);
          if (result.value.merged && existing) this.toasts.update(items => items.map(item => item.id === result.value.record.id ? result.value.record : item));
          else if (!result.value.merged || code === 'settingsSaved') this.show(result.value.record);
          return;
        }
      } catch { /* A transient card still reports the operation result. */ }
      this.storageFailed.set(true);
      this.show({ ...input, id: crypto.randomUUID(), type: notificationTypes[code], createdAt: Date.now(), updatedAt: Date.now(), count: 1, read: notificationTypes[code] === 'success' });
    });
  }
  private show(record: NotificationRecord): void {
    if (this.toasts().length >= 3) this.dismiss(this.toasts()[0].id);
    this.toasts.update(items => [...items, record]);
    const remaining = { success: 4000, info: 5000, warning: 8000, error: 0 }[record.type];
    if (!remaining) return;
    this.timers.set(record.id, { remaining, started: performance.now(), reasons: new Set(this.drawerOpen() ? ['drawer'] : []) });
    this.resume(record.id, 'initial');
  }
  dismiss(id: string): void { clearTimeout(this.timers.get(id)?.timer); this.timers.delete(id); this.toasts.update(items => items.filter(item => item.id !== id)); }
  pause(id: string, reason: string): void {
    const clock = this.timers.get(id); if (!clock || clock.reasons.has(reason)) return;
    if (clock.timer !== undefined) { clearTimeout(clock.timer); clock.timer = undefined; clock.remaining = Math.max(0, clock.remaining - (performance.now() - clock.started)); }
    clock.reasons.add(reason);
  }
  resume(id: string, reason: string): void {
    const clock = this.timers.get(id); if (!clock) return;
    clock.reasons.delete(reason);
    if (clock.reasons.size || clock.timer !== undefined) return;
    clock.started = performance.now(); clock.timer = setTimeout(() => this.dismiss(id), clock.remaining);
  }
  openHistory(): void {
    if (this.drawerOpen()) return;
    this.restoreTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.drawerOpen.set(true); this.toasts().forEach(item => this.pause(item.id, 'drawer')); void this.reload();
  }
  closeHistory(): void {
    this.drawerOpen.set(false);
    this.toasts().forEach(item => { this.resume(item.id, 'focus'); this.resume(item.id, 'hover'); this.resume(item.id, 'drawer'); });
    const target = this.restoreTarget;
    setTimeout(() => { if (target?.isConnected && !target.closest('[inert]')) target.focus(); else document.querySelector<HTMLElement>('[data-testid=notifications-bell]')?.focus(); }, 0);
  }
  read(id: string | null): Promise<void> { return this.enqueue(async () => { this.accept(await this.api.read(id)); }); }
  remove(id: string): Promise<void> { return this.enqueue(async () => { if (this.accept(await this.api.remove(id))) this.dismiss(id); }); }
  clear(): Promise<void> { return this.enqueue(async () => { if (this.accept(await this.api.clear())) this.toasts().forEach(item => this.dismiss(item.id)); }); }
  async setPosition(value: string): Promise<void> {
    if (!notificationPositions.includes(value as NotificationPosition) || value === this.position()) return;
    let saved = false;
    await this.enqueue(async () => { saved = this.accept(await this.api.position(value as NotificationPosition)); });
    if (saved) await this.publish('settingsSaved', 'settings');
  }
}
