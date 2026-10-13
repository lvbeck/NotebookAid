import { errorText } from './ui-i18n';
import { SelectDirective } from './select.directive';
import { AfterViewInit, Component, Input, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Overlay, type OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { A11yModule } from '@angular/cdk/a11y';
import { NoteWorkspace } from './note-workspace';
import { NotificationService } from './notification-service';
import { IconComponent } from './icon.component';
import { type Locale, type MessageKey, regionalLocale, translate } from './i18n';
import type { NotificationRecord, NotificationType } from '../../shared/notifications';

@Component({ selector: 'app-notifications', standalone: true, imports: [SelectDirective, FormsModule, IconComponent, A11yModule], templateUrl: './notifications.component.html' })
export class NotificationsComponent implements AfterViewInit, OnDestroy {
  @Input() locale: Locale = 'zh-CN';
  @ViewChild('cards', { static: true }) cards!: TemplateRef<unknown>;
  @ViewChild('history', { static: true }) history!: TemplateRef<unknown>;
  readonly workspace = inject(NoteWorkspace);
  readonly notifications = inject(NotificationService);
  private readonly overlay = inject(Overlay);
  private readonly container = inject(ViewContainerRef);
  private readonly ready = signal(false);
  private cardsOverlay?: OverlayRef;
  private historyOverlay?: OverlayRef;
  readonly typeFilter = signal('all');
  readonly unreadOnly = signal(false);
  readonly libraryFilter = signal('all');
  readonly confirmClear = signal(false);
  readonly libraries = computed(() => [...new Set(this.notifications.records().map(item => item.libraryId).filter((id): id is string => !!id))]);
  readonly filtered = computed(() => this.notifications.records().filter(item =>
    (this.typeFilter() === 'all' || item.type === this.typeFilter()) && (!this.unreadOnly() || !item.read) &&
    (this.libraryFilter() === 'all' || (item.libraryId ?? 'global') === this.libraryFilter())));
  constructor() {
    effect(() => {
      if (!this.ready()) return;
      const position = this.notifications.position();
      const visible = this.notifications.toasts().length > 0 && !this.notifications.drawerOpen();
      if (visible) {
        if (!this.cardsOverlay) {
          this.cardsOverlay = this.overlay.create({ panelClass: 'notification-overlay', scrollStrategy: this.overlay.scrollStrategies.noop() });
          this.cardsOverlay.attach(new TemplatePortal(this.cards, this.container));
        }
        const strategy = this.overlay.position().global();
        position.startsWith('top') ? strategy.top('20px') : strategy.bottom('20px');
        position.endsWith('right') ? strategy.right('20px') : strategy.left('20px');
        this.cardsOverlay.updatePositionStrategy(strategy);
      } else { this.cardsOverlay?.dispose(); this.cardsOverlay = undefined; }
      if (this.notifications.drawerOpen() && !this.historyOverlay) {
        this.historyOverlay = this.overlay.create({ hasBackdrop: true, backdropClass: 'notification-backdrop', panelClass: 'notification-drawer-overlay', positionStrategy: this.overlay.position().global().right('0').top('0'), scrollStrategy: this.overlay.scrollStrategies.block() });
        this.historyOverlay.attach(new TemplatePortal(this.history, this.container));
        this.historyOverlay.backdropClick().subscribe(() => this.close());
        this.historyOverlay.keydownEvents().subscribe(event => { if (event.key === 'Escape') { event.preventDefault(); this.confirmClear() ? this.confirmClear.set(false) : this.close(); } });
      } else if (!this.notifications.drawerOpen()) { this.historyOverlay?.dispose(); this.historyOverlay = undefined; this.confirmClear.set(false); }
    });
  }
  ngAfterViewInit(): void { this.ready.set(true); }
  ngOnDestroy(): void { this.cardsOverlay?.dispose(); this.historyOverlay?.dispose(); }
  errorText(code: string): string { return errorText(this.locale, code); }
  t(key: MessageKey): string { return translate(this.locale, key); }
  icon(type: NotificationType): 'CircleCheck' | 'Info' | 'TriangleAlert' | 'CircleX' { return { success: 'CircleCheck', info: 'Info', warning: 'TriangleAlert', error: 'CircleX' }[type] as ReturnType<NotificationsComponent['icon']>; }
  label(type: NotificationType): string { return this.t(({ success: 'noticeSuccess', info: 'noticeInfo', warning: 'noticeWarning', error: 'noticeError' } as const)[type]); }
  time(item: NotificationRecord): string { return new Date(item.updatedAt).toLocaleString(regionalLocale(this.locale), { dateStyle: 'short', timeStyle: 'medium' }); }
  library(id: string | null | undefined): string { return id ? (this.workspace.registry().entries.find(item => item.libraryId === id)?.name ?? `${this.t('noticeLibrary')} · ${id.slice(0, 8)}`) : this.t('noticeGlobal'); }
  close(): void { this.confirmClear.set(false); this.notifications.closeHistory(); }
  async clear(): Promise<void> { await this.notifications.clear(); this.confirmClear.set(false); }
  focusOut(event: FocusEvent, id: string): void { if (!(event.relatedTarget instanceof Node) || !(event.currentTarget as HTMLElement).contains(event.relatedTarget)) this.notifications.resume(id, 'focus'); }
}
