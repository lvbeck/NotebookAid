import { lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LibraryError } from './library';
import type { AutosaveSettings } from '../shared/settings';

export interface NotebookSettingsSeed { name: string; autosave: AutosaveSettings | null; dailyBackup: boolean; }
export interface NotebookSettings extends NotebookSettingsSeed { format: 'NotebookAidNotebookSettings'; schemaVersion: 1; libraryId: string; revision: number; }
export const notebookSettingsFile = 'notebook-settings.json';
export function validateNotebookSettings(value: unknown, libraryId: string): NotebookSettings {
  const item = value as NotebookSettings;
  if (!item || typeof item !== 'object' || Array.isArray(item) || Object.keys(item).some(key => !['format','schemaVersion','libraryId','revision','name','autosave','dailyBackup'].includes(key)) || item.format !== 'NotebookAidNotebookSettings' || item.schemaVersion !== 1 || !Number.isSafeInteger(item.revision) || item.revision < 1 || typeof item.name !== 'string' || !item.name.trim() || item.name !== item.name.trim() || item.name.length > 100 || /[\x00-\x1f]/.test(item.name) || typeof item.dailyBackup !== 'boolean') throw new LibraryError('INVALID_INPUT');
  if (item.libraryId !== libraryId) throw new LibraryError('LIBRARY_ID_MISMATCH');
  const auto = item.autosave;
  if (auto !== null && (!auto || typeof auto !== 'object' || Array.isArray(auto) || Object.keys(auto).some(key => !['enabled','minutes'].includes(key)) || typeof auto.enabled !== 'boolean' || !Number.isInteger(auto.minutes) || auto.minutes < 1 || auto.minutes > 60)) throw new LibraryError('INVALID_INPUT');
  return structuredClone(item);
}
export function readNotebookSettings(directory: string, libraryId: string): NotebookSettings | null {
  const file = join(directory, notebookSettingsFile);
  try {
    const info = lstatSync(file);
    if (!info.isFile() || info.isSymbolicLink() || info.size > 16384) throw new LibraryError('INTEGRITY_CHECK_FAILED');
    return validateNotebookSettings(JSON.parse(readFileSync(file, 'utf8')), libraryId);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    if (error instanceof LibraryError && error.code === 'LIBRARY_ID_MISMATCH') throw error;
    throw new LibraryError('INTEGRITY_CHECK_FAILED');
  }
}
