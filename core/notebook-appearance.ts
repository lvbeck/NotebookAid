import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LibraryError } from './library';
import { defaultNotebookAppearance, type NotebookAppearance } from '../shared/notebook-appearance';

export function validateAppearance(value: unknown): NotebookAppearance {
  const item = value as NotebookAppearance;
  if (!item || item.version !== 1 || typeof item.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(item.color)) throw new LibraryError('INVALID_INPUT');
  if (item.cover !== null) {
    if (typeof item.cover !== 'string' || item.cover.length > 1500000 || !/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(item.cover)) throw new LibraryError('INVALID_INPUT');
    const text = item.cover.slice(22), png = Buffer.from(text, 'base64');
    if (png.toString('base64') !== text || png.length < 45 || png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || png.readUInt32BE(8) !== 13 || png.toString('ascii', 12, 16) !== 'IHDR' || png.readUInt32BE(16) !== 512 || png.readUInt32BE(20) !== 512 || png.subarray(-12).toString('hex') !== '0000000049454e44ae426082') throw new LibraryError('INVALID_INPUT');
  }
  return { version: 1, color: item.color.toLowerCase(), cover: item.cover };
}
export function readAppearance(directory: string): NotebookAppearance {
  const file = join(directory, 'appearance.json');
  if (!existsSync(file)) {
    try { lstatSync(file); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return defaultNotebookAppearance(); }
    throw new LibraryError('INTEGRITY_CHECK_FAILED');
  }
  try {
    const info = lstatSync(file);
    if (!info.isFile() || info.isSymbolicLink() || info.size > 1600000) throw Error('Invalid appearance file');
    return validateAppearance(JSON.parse(readFileSync(file, 'utf8')));
  } catch { throw new LibraryError('INTEGRITY_CHECK_FAILED'); }
}
