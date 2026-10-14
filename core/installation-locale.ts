import { existsSync, readFileSync, lstatSync } from 'node:fs';
import { join } from 'node:path';
import { locales, type SettingsLocale } from '../shared/settings';
export function installationLocale(directory: string): SettingsLocale | null {
  try {
    const file = join(directory, 'installation.json');
    if (!existsSync(file) || lstatSync(file).isSymbolicLink() || lstatSync(file).size > 4096) return null;
    const value = JSON.parse(readFileSync(file, 'utf8'));
    return value.owner === 'NotebookAid.Installation.v1' && locales.includes(value.locale) ? value.locale : null;
  } catch { return null; }
}
