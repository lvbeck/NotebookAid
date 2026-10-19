import { parseNative, writeNative, nativeLimit, type NativeAttachmentSource } from './delta-files';
import { closeSync, fsyncSync, fstatSync, openSync, readSync, realpathSync, writeFileSync, unlinkSync } from 'node:fs';
import { basename, dirname, extname, relative, resolve, sep } from 'node:path';
import { formatExtensions, type NoteInput, type NoteFormat } from '../shared/library';
import { LibraryError } from './library';

const limit = 2 * 1024 * 1024;
export function importNote(path: string): NoteInput {
  const format = ({ '.md': 'markdown', '.markdown': 'markdown', '.html': 'html', '.htm': 'html', '.txt': 'text', '.nadelta': 'delta' } as Record<string, NoteFormat>)[extname(path).toLowerCase()];
  if (!format) throw new LibraryError('INVALID_INPUT');
  const limit = format === 'delta' ? nativeLimit : 2 * 1024 * 1024;
  let body: string;
  const fd = openSync(path, 'r');
  try {
    const info = fstatSync(fd);
    if (!info.isFile() || info.size > limit + 3) throw new LibraryError('INVALID_INPUT');
    const buffer = Buffer.alloc(Math.min(info.size + 1, limit + 4)); let size = 0;
    while (size < buffer.length) { const count = readSync(fd, buffer, size, buffer.length - size, null); if (!count) break; size += count; }
    if (size !== info.size || size > limit + 3) throw new LibraryError('INVALID_INPUT');
    body = new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, size));
  } catch { throw new LibraryError('INVALID_INPUT'); }
  finally { closeSync(fd); }
  if (body.includes('\0') || Buffer.byteLength(body) > limit) throw new LibraryError('INVALID_INPUT');
  if (format === 'delta') return parseNative(body);
  return { title: basename(path, extname(path)).slice(0, 300).trim() || 'Untitled', body, primaryFormat: format };
}

export function exportNote(path: string, input: NoteInput, protectedRoots: string[], source?: NativeAttachmentSource): void {
  if (!input || !Object.hasOwn(formatExtensions, input.primaryFormat) || typeof input.body !== 'string' || input.body.includes('\0') || Buffer.byteLength(input.body) > limit) throw new LibraryError('INVALID_INPUT');
  const target = exportTarget(path, formatExtensions[input.primaryFormat], protectedRoots);
  // Never overwrite an existing file, even if the selection races another writer.
  const fd = openSync(target, 'wx');
  // A UTF-8 BOM makes standalone HTML fragments readable without a charset declaration.
  const text = input.primaryFormat === 'html' && !input.body.startsWith('\ufeff') ? '\ufeff' + input.body : input.body;
  let complete = false;
  try { if (input.primaryFormat === 'delta') writeNative(fd, input, source); else writeFileSync(fd, text, 'utf8'); fsyncSync(fd); complete = true; }
  finally { closeSync(fd); if (!complete) unlinkSync(target); }
}

function exportTarget(path: string, extension: string, protectedRoots: string[]): string {
  // Resolve junctions in the parent before comparing protected application/library paths.
  const target = resolve(realpathSync(dirname(path)), basename(path));
  if (/[<>:"/\\|?*\x00-\x1f]/.test(basename(target)) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(basename(target))) throw new LibraryError('INVALID_INPUT');
  for (const root of protectedRoots) {
    let canonical: string;
    try { canonical = realpathSync(root); } catch { canonical = resolve(root); }
    const distance = relative(canonical.toLowerCase(), target.toLowerCase());
    if (!distance || (!distance.startsWith(`..${sep}`) && distance !== '..' && !require('node:path').isAbsolute(distance))) throw new LibraryError('INVALID_INPUT');
  }
  if (extname(target).toLowerCase() !== `.${extension}`) throw new LibraryError('INVALID_INPUT');
  return target;
}

export function exportPdf(path: string, bytes: Buffer, protectedRoots: string[]): void {
  if (!bytes.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new LibraryError('INVALID_INPUT');
  const target = exportTarget(path, 'pdf', protectedRoots), fd = openSync(target, 'wx', 0o600);
  let complete = false;
  try { writeFileSync(fd, bytes); fsyncSync(fd); complete = true; }
  finally { closeSync(fd); if (!complete) unlinkSync(target); }
}
