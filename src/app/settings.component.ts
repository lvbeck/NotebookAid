import { AboutContent } from './about-content';
import { informationText } from './information-i18n';
import { settingsLayoutText, type SettingsLayoutKey } from './settings-layout-i18n';
import { EasterBridge } from './easter-bridge';
import { UpdatesComponent } from './updates.component';
import { EasterSettings } from './easter-settings';
import { Onboarding } from './onboarding';
import { onboardingText, type OnboardingKey } from './onboarding-i18n';
import { zoomPercentages } from '../../shared/ui';
import { uiText, errorText, type UiKey } from './ui-i18n';
import { PasskeyComponent } from './passkey.component';
import { writingText } from './writing-i18n';
import { AiSettingsComponent } from './ai-settings.component';
import { BackupComponent } from './backup.component';
import { NotebookAppearanceComponent } from './notebook-appearance.component';
import { securityText, type SecurityKey } from './security-i18n';
import { SecurityComponent } from './security.component';
import { SelectDirective } from './select.directive';
import { Component, Input, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Preferences } from './preferences';
import { NoteWorkspace } from './note-workspace';
import { NotificationService } from './notification-service';
import { IconComponent } from './icon.component';
import { languages, translate, type Locale, type MessageKey } from './i18n';
import { effectiveAutosave, notePageSizes, type SettingsLocale, type SettingsTheme } from '../../shared/settings';
import { pageSizeText } from './startup-i18n';
import { latestNotebookSchemaVersion } from '../../shared/library';
@Component({ selector: 'app-settings', standalone: true, imports: [AboutContent, UpdatesComponent, EasterSettings, AiSettingsComponent, NotebookAppearanceComponent, BackupComponent, PasskeyComponent, SecurityComponent, SelectDirective, FormsModule, IconComponent], templateUrl: './settings.component.html' })
export class SettingsComponent {
  @Input() locale: Locale = 'zh-CN';
  @Input() active = false;
  aboutTitle(): string { return informationText(this.locale,'about'); }
  @ViewChild(UpdatesComponent) updatesPanel?: UpdatesComponent;
  checkUpdates(): void { this.section.set('global'); requestAnimationFrame(() => { void this.updatesPanel?.revealAndCheck(); }); }
  readonly prefs = inject(Preferences);
  readonly onboarding = inject(Onboarding);
  readonly eggs = inject(EasterBridge);
  guide(key: OnboardingKey): string { return onboardingText(this.locale,key,this.onboarding.state().step); }
  async guideEnable(event: Event): Promise<void> { const input=event.target as HTMLInputElement;await this.onboarding.enable(input.checked);input.checked=this.onboarding.state().enabled; }
  readonly workspace = inject(NoteWorkspace);
  readonly notifications = inject(NotificationService);
  readonly section = signal('global');
  readonly selectedId = signal('');
  readonly entry = computed(() => this.workspace.registry().entries.find(item => item.id === this.selectedId()));
  readonly inherited = computed(() => !this.prefs.state().libraries[this.selectedId()]);
  readonly effective = computed(() => effectiveAutosave(this.prefs.state(), this.selectedId()));
  readonly languages = languages;
  readonly zoomPercentages = zoomPercentages;
  readonly notePageSizes = notePageSizes;
  pageSizeLabel(): string { return pageSizeText(this.locale); }
  async pageSize(event: Event): Promise<void> { const input = event.target as HTMLSelectElement; await this.prefs.update({ notePageSize: Number(input.value) }); input.value = String(this.prefs.state().global.notePageSize ?? 30); }
  ui(key: UiKey): string { return uiText(this.locale, key); }
  errorText(code: string): string { return errorText(this.locale, code); }
  async zoom(event: Event): Promise<void> { const input = event.target as HTMLSelectElement; await this.prefs.update({ zoomPercent: Number(input.value) }); input.value = String(this.prefs.state().global.zoomPercent ?? 100); }
  readonly renaming = signal(false);
  readonly latestSchema = latestNotebookSchemaVersion;
  readonly upgrading = signal(false);
  readonly upgradeMessage = signal('');
  name = '';
  securityText(key: SecurityKey): string { return securityText(this.locale, key); }
  translationLabel():string{return writingText(this.locale,'defaultLanguage');}
  async translationDefault(event:Event):Promise<void>{const input=event.target as HTMLSelectElement;await this.prefs.update({translationLocale:input.value as SettingsLocale});input.value=this.prefs.state().global.translationLocale??this.prefs.locale();}
  async securityDefault(event: Event): Promise<void> { const input = event.target as HTMLInputElement; await this.prefs.update({ masterPasswordDefault: input.checked }); input.checked = this.prefs.state().global.masterPasswordDefault ?? false; }
  constructor() { effect(() => { const entries = this.workspace.registry().entries; if (!entries.some(item => item.id === this.selectedId())) this.selectedId.set(this.workspace.registry().activeId ?? entries[0]?.id ?? ''); }); }
  layout(key: SettingsLayoutKey): string { return settingsLayoutText(this.locale, key); }
  t(key: MessageKey): string { return translate(this.locale, key); }
  async globalAuto(field: 'enabled' | 'minutes', event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    await this.prefs.update({ autosave: field === 'enabled' ? { enabled: input.checked } : { minutes: input.valueAsNumber } });
    input.checked = this.prefs.state().global.autosave.enabled; if (field === 'minutes') input.value = String(this.prefs.state().global.autosave.minutes);
  }
  async appearance(field: 'locale' | 'theme', event: Event): Promise<void> {
    const input = event.target as HTMLSelectElement;
    await this.prefs.update(field === 'locale' ? { locale: input.value as SettingsLocale } : { theme: input.value as SettingsTheme });
    input.value = this.prefs.state().global[field];
  }
  async libraryAuto(field: 'inherit' | 'enabled' | 'minutes', event: Event): Promise<void> {
    const input = event.target as HTMLInputElement; const id = this.selectedId();
    await this.prefs.override(id, field === 'inherit' ? (input.checked ? null : {}) : field === 'enabled' ? { enabled: input.checked } : { minutes: input.valueAsNumber });
    if (this.selectedId() === id) { input.checked = field === 'inherit' ? this.inherited() : this.effective().enabled; if (field === 'minutes') input.value = String(this.effective().minutes); }
  }
  select(value: string): void { void this.prefs.reload(); this.selectedId.set(value); this.renaming.set(false); this.upgradeMessage.set(''); }
  async upgrade(): Promise<void> {
    const item = this.entry(); if (!item || item.schemaVersion == null || this.upgrading()) return;
    this.upgrading.set(true); this.upgradeMessage.set('');
    try {
      const result = await this.workspace.securityChange(() => window.notebookAid.library.upgradeLibrary(item.id, item.schemaVersion!));
      if (result && !result.ok) this.upgradeMessage.set(this.t('preferencesFailed') + ' · ' + result.code);
      else if (result?.ok && result.value) this.upgradeMessage.set(result.value.backupPath ? this.t('schemaUpgradeSuccess').replace('{path}', result.value.backupPath) : this.t('schemaLatest'));
    } catch { this.upgradeMessage.set(this.t('preferencesFailed')); }
    finally { this.upgrading.set(false); }
  }
  beginRename(): void { this.name = this.entry()?.name ?? ''; this.renaming.set(true); }
  async rename(): Promise<void> { const id = this.selectedId(); await this.workspace.manage('rename', id, this.name); if (!this.workspace.registryError() && id === this.selectedId()) this.renaming.set(false); }
}
