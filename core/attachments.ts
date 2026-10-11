import { createHash } from 'node:crypto';
import { closeSync, fsyncSync, fstatSync, openSync, readSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { realpathSync } from 'node:fs';
import { LibraryError } from './library';
import { plainPath } from './library-import';
import { attachmentLimit, type Attachment } from '../shared/attachments';

export const attachmentHash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
export function attachmentName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 180 || /[<>:"/\\|?*\x00-\x1f]/.test(value) || /[. ]$/.test(value) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(value)) throw new LibraryError('INVALID_INPUT');
  return value.trim();
}
export function validateAttachments(value: unknown): asserts value is Attachment[] {
  if (!Array.isArray(value) || value.length > 50) throw new LibraryError('INTEGRITY_CHECK_FAILED');
  const ids = new Set(), names = new Set(); let total = 0;
  for (const row of value) {
    if (!row || typeof row.id !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(row.id) || !/^[a-f0-9]{64}$/.test(row.sha256) || !Number.isSafeInteger(row.size) || row.size < 0 || row.size > attachmentLimit || !['application/octet-stream','image/png','image/jpeg','image/gif','image/webp'].includes(row.mediaType)) throw new LibraryError('INTEGRITY_CHECK_FAILED');
    attachmentName(row.name); const name = row.name.normalize('NFKC').toLowerCase();
    if (ids.has(row.id) || names.has(name)) throw new LibraryError('INTEGRITY_CHECK_FAILED'); ids.add(row.id); names.add(name); total += row.size;
  }
  if (total > 200 * 1024 * 1024) throw new LibraryError('INVALID_INPUT');
}
export function readAttachmentFile(path: string, expected?: Attachment): Buffer {
  plainPath(path); const fd = openSync(path, 'r');
  try {
    const info = fstatSync(fd);
    if (!info.isFile() || info.size > attachmentLimit) throw new LibraryError('INVALID_INPUT');
    const buffer = Buffer.alloc(Math.min(info.size + 1, attachmentLimit + 1)); let size=0;
    while (size<buffer.length) { const count=readSync(fd,buffer,size,buffer.length-size,null); if(!count)break;size+=count; }
    const bytes=buffer.subarray(0,size);
    if (size !== info.size || (expected && (size !== expected.size || attachmentHash(bytes) !== expected.sha256))) throw new LibraryError('INTEGRITY_CHECK_FAILED');
    return bytes;
  } finally { closeSync(fd); }
}
export function isSvg(bytes: Buffer): boolean {
  return bytes.length <= 1024 * 1024 && /^\s*(?:<\?xml[\s\S]*?\?>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg(?:\s|>)/i.test(bytes.subarray(0,4096).toString('utf8').replace(/^\uFEFF/, ''));
}
export function imageType(bytes: Buffer): Attachment['mediaType'] {
  if (bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if (bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return 'image/jpeg';
  if (/^GIF8[79]a/.test(bytes.subarray(0,6).toString('ascii'))) return 'image/gif';
  if (bytes.subarray(0,4).toString()==='RIFF' && bytes.subarray(8,12).toString()==='WEBP') return 'image/webp';
  return 'application/octet-stream';
}
export function exportAttachmentFile(path: string, bytes: Buffer, roots: string[]): void {
  attachmentName(basename(path)); plainPath(dirname(path));
  const target = resolve(realpathSync(dirname(path)), basename(path));
  for (const root of roots) {
    let canonical: string; try { canonical=realpathSync(root); } catch { canonical=resolve(root); }
    const distance=relative(canonical.toLowerCase(),target.toLowerCase());
    if (!distance || (!distance.startsWith('..'+sep) && distance!=='..' && !isAbsolute(distance))) throw new LibraryError('INVALID_INPUT');
  }
  const fd=openSync(target,'wx'); try { writeFileSync(fd,bytes); fsyncSync(fd); } finally { closeSync(fd); }
}
