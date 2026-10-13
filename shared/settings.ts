import type { Result } from './library';
export const locales = ['en', 'de', 'fr', 'it', 'es', 'pt-PT', 'zh-CN', 'zh-TW'] as const;
export type SettingsLocale = typeof locales[number];
export type SettingsTheme = 'light' | 'dark' | 'system';
export interface AutosaveSettings { enabled: boolean; minutes: number; }
export interface GlobalSettings { locale: SettingsLocale; theme: SettingsTheme; translationLocale?: SettingsLocale; aiEnabled?: boolean; masterPasswordDefault?: boolean; sidebarCollapsed?: boolean; autosave: AutosaveSettings; }
export interface SettingsState { schemaVersion: 1; global: GlobalSettings; libraries: Record<string, AutosaveSettings>; }
export interface LegacySettings { locale: string | null; theme: string | null; autosave: string | null; }
export interface GlobalSettingsPatch { locale?: SettingsLocale; theme?: SettingsTheme; translationLocale?: SettingsLocale; aiEnabled?: boolean; masterPasswordDefault?: boolean; sidebarCollapsed?: boolean; autosave?: Partial<AutosaveSettings>; }
export const defaultSettings: SettingsState = { schemaVersion: 1, global: { locale: 'zh-CN', theme: 'system', masterPasswordDefault: false, autosave: { enabled: true, minutes: 5 } }, libraries: {} };
export function effectiveAutosave(state: SettingsState, entryId: string | null): AutosaveSettings { return (entryId && state.libraries[entryId]) || state.global.autosave; }
export interface SettingsApi {
  settings(legacy: LegacySettings): Promise<Result<SettingsState>>;
  updateSettings(patch: GlobalSettingsPatch): Promise<Result<SettingsState>>;
  librarySettings(id: string, autosave: AutosaveSettings | null): Promise<Result<SettingsState>>;
}
