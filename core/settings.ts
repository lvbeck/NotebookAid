import { validEasterState } from '../shared/easter-eggs';
import { existsSync, readFileSync, statSync, openSync, writeFileSync, fsyncSync, closeSync, renameSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { validOnboarding } from '../shared/onboarding';
import { validZoom } from '../shared/ui';
import { LibraryError } from './library';
import { defaultSettings, locales, notePageSizes, type AutosaveSettings, type SettingsState } from '../shared/settings';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function check(value: unknown): asserts value { if (!value) throw new LibraryError('INVALID_INPUT'); }
function object(value: unknown, keys: string[]): asserts value is Record<string, any> { check(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(key => keys.includes(key))); }
function autosave(value: unknown): asserts value is AutosaveSettings { object(value, ['enabled', 'minutes']); check(typeof value.enabled === 'boolean' && Number.isInteger(value.minutes) && value.minutes >= 1 && value.minutes <= 60); }
function global(value: unknown): void { object(value, ['locale', 'theme', 'translationLocale', 'aiEnabled', 'autosave', 'sidebarCollapsed', 'masterPasswordDefault', 'zoomPercent', 'onboarding', 'notePageSize', 'easterEggs']); check(locales.includes(value.locale) && ['system', 'light', 'dark'].includes(value.theme)); check(value.translationLocale === undefined || locales.includes(value.translationLocale)); check(value.aiEnabled === undefined || typeof value.aiEnabled === 'boolean'); check(value.sidebarCollapsed === undefined || typeof value.sidebarCollapsed === 'boolean'); check(value.masterPasswordDefault === undefined || typeof value.masterPasswordDefault === 'boolean'); check(value.onboarding === undefined || validOnboarding(value.onboarding)); check(value.zoomPercent === undefined || validZoom(value.zoomPercent)); check(value.notePageSize === undefined || notePageSizes.includes(value.notePageSize)); check(value.easterEggs === undefined || validEasterState(value.easterEggs)); autosave(value.autosave); }
export class SettingsStore {
  private state!: SettingsState;
  private readonly file: string;
  constructor(directory: string, legacy: unknown, private readonly fault?: () => void) {
    this.file = join(directory, 'settings.json');
    if (existsSync(this.file)) {
      try {
        check(statSync(this.file).size <= 1024 * 1024);
        const value = JSON.parse(readFileSync(this.file, 'utf8'));
        object(value, ['schemaVersion', 'global', 'libraries']); check(value.schemaVersion === 1); global(value.global);
        check(value.libraries && typeof value.libraries === 'object' && !Array.isArray(value.libraries) && Object.keys(value.libraries).length <= 1000);
        for (const [id, entry] of Object.entries(value.libraries)) { check(uuid.test(id)); autosave(entry); }
        this.state = value as SettingsState;
      } catch { throw new LibraryError('REGISTRY_INVALID'); }
    } else {
      object(legacy, ['locale', 'theme', 'autosave']);
      for (const key of ['locale', 'theme', 'autosave']) check(legacy[key] === null || (typeof legacy[key] === 'string' && legacy[key].length <= 4096));
      const backup = join(directory, 'settings-legacy.t03c-backup.json');
      if (!existsSync(backup)) this.write(backup, JSON.stringify(legacy), true);
      const next = structuredClone(defaultSettings);
      if (legacy.locale !== null) { check(locales.includes(legacy.locale)); next.global.locale = legacy.locale; }
      if (legacy.theme !== null) { check(['light', 'dark', 'system'].includes(legacy.theme)); next.global.theme = legacy.theme; }
      if (legacy.autosave !== null) {
        let parsed: unknown; try { parsed = JSON.parse(legacy.autosave); } catch { throw new LibraryError('INVALID_INPUT'); }
        autosave(parsed); next.global.autosave = parsed;
      }
      this.persist(next);
    }
  }
  private write(file: string, text: string, exclusive: boolean): void {
    const fd = openSync(file, exclusive ? 'wx' : 'w');
    try { writeFileSync(fd, text); fsyncSync(fd); } finally { closeSync(fd); }
  }
  private persist(next: SettingsState): SettingsState {
    const temporary = this.file + '.' + randomUUID() + '.tmp';
    try { this.fault?.(); this.write(temporary, JSON.stringify(next), true); renameSync(temporary, this.file); this.state = next; }
    catch { throw new LibraryError('WRITE_FAILED'); }
    finally { if (existsSync(temporary)) { try { unlinkSync(temporary); } catch { /* Preserve an inaccessible temporary file. */ } } }
    return this.get();
  }
  get(): SettingsState { return structuredClone(this.state); }
  update(patch: unknown): SettingsState {
    object(patch, ['locale', 'theme', 'translationLocale', 'aiEnabled', 'autosave', 'sidebarCollapsed', 'masterPasswordDefault', 'zoomPercent', 'onboarding', 'notePageSize', 'easterEggs']); check(Object.keys(patch).length > 0);
    if (patch.autosave !== undefined) object(patch.autosave, ['enabled', 'minutes']);
    const next = this.get();
    next.global = { ...next.global, ...patch, autosave: { ...next.global.autosave, ...patch.autosave } };
    global(next.global); return this.persist(next);
  }
  override(id: unknown, value: unknown): SettingsState {
    check(typeof id === 'string' && uuid.test(id)); if (value !== null) autosave(value);
    const next = this.get();
    if (value === null) delete next.libraries[id]; else next.libraries[id] = value as AutosaveSettings;
    check(Object.keys(next.libraries).length <= 1000); return this.persist(next);
  }
}
