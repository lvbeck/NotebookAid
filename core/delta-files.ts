import { createHash } from 'node:crypto';
import { parseDelta, deltaImageIds, DeltaError, type NativeAttachment } from '../shared/delta-document';
import type { NoteInput } from '../shared/library';
import { validateAttachments } from './attachments';
import { writeFileSync } from 'node:fs';
import { attachmentLimit, attachmentCountLimit, attachmentTotalLimit, type Attachment } from '../shared/attachments';

// Allow Base64 expansion, per-file padding, escaped document text and metadata.
export const nativeLimit = Math.ceil(attachmentTotalLimit / 3) * 4 + attachmentCountLimit * 4 + 7 * 1024 * 1024;
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const invalid = (detail: string): never => { throw new DeltaError('INVALID_DELTA', detail); };
export function validateNative(body: string, files: NativeAttachment[] = []): void {
  parseDelta(body);
  if (!Array.isArray(files) || files.length > attachmentCountLimit) invalid('attachments');
  validateAttachments(files);
  let total = 0;
  for (const item of files) {
    if (typeof item.data !== 'string' || item.data.length !== Math.ceil(item.size / 3) * 4 || item.data.length > Math.ceil(attachmentLimit / 3) * 4 || (item.data.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(item.data))) invalid('attachment base64');
    if (Object.keys(item).some(key => !['id','name','size','sha256','mediaType','data'].includes(key))) invalid('attachment metadata');
    const bytes = Buffer.from(item.data, 'base64'); total += bytes.length;
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    if ((item.data.endsWith('==') && (alphabet.indexOf(item.data.at(-3)!) & 15) !== 0) || (!item.data.endsWith('==') && item.data.endsWith('=') && (alphabet.indexOf(item.data.at(-2)!) & 3) !== 0)) invalid('attachment encoding');
    if (bytes.length !== item.size || hash(bytes) !== item.sha256 || total > attachmentTotalLimit) invalid('attachment integrity or size');
  }
  if (deltaImageIds(body).some(id => !files.some(item => item.id === id))) invalid('missing attachment');
}
export function parseNative(text: string): NoteInput {
  if (Buffer.byteLength(text) > nativeLimit) invalid('container size');
  let value: any; try { value = JSON.parse(text); } catch { return invalid('JSON'); }
  if (!value || value.format !== 'NotebookAidNative') invalid('container');
  if (value.version !== 1) throw new DeltaError('UNSUPPORTED_DELTA', 'container version');
  if (Object.keys(value).some(key => !['format','version','title','document','sha256','attachments'].includes(key)) || typeof value.title !== 'string' || !value.title.trim() || value.title.length > 300 || value.title.includes('\0')) invalid('metadata');
  const body = JSON.stringify(value.document);
  if (hash(JSON.stringify({ title: value.title, document: value.document })) !== value.sha256) invalid('document integrity');
  validateNative(body, value.attachments);
  return { primaryFormat: 'delta', title: value.title, body, nativeAttachments: value.attachments };
}
export function serializeNative(input: NoteInput): string {
  if (typeof input.title !== 'string' || !input.title.trim() || input.title.length > 300 || input.title.includes('\0')) invalid('title');
  validateNative(input.body, input.nativeAttachments);
  const document = parseDelta(input.body);
  const result = JSON.stringify({ format: 'NotebookAidNative', version: 1, title: input.title, document, sha256: hash(JSON.stringify({ title: input.title, document })), attachments: input.nativeAttachments ?? [] });
  if (Buffer.byteLength(result) > nativeLimit) invalid('container size');
  return result;
}

export interface NativeAttachmentSource { items: Attachment[]; read(item: Attachment): Buffer; }
// Keep each encoded attachment short-lived, rather than assembling a full container string.
export function writeNative(fd: number, input: NoteInput, source?: NativeAttachmentSource): void {
  if (typeof input.title !== 'string' || !input.title.trim() || input.title.length > 300 || input.title.includes('\0')) invalid('title');
  const document = parseDelta(input.body), files = source?.items ?? input.nativeAttachments ?? [];
  validateAttachments(files);
  if (deltaImageIds(input.body).some(id => !files.some(item => item.id === id))) invalid('missing attachment');
  const ascii = (value: unknown) => JSON.stringify(value).replace(/[\u0080-\uffff]/g, char => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0'));
  const header = { format: 'NotebookAidNative', version: 1, title: input.title, document, sha256: hash(JSON.stringify({ title: input.title, document })) };
  writeFileSync(fd, ascii(header).slice(0, -1) + ',"attachments":[', 'utf8');
  for (let index = 0; index < files.length; index++) {
    const item = files[index]!;
    const bytes = source ? source.read(item) : Buffer.from((item as NativeAttachment).data, 'base64');
    if (bytes.length !== item.size || hash(bytes) !== item.sha256) invalid('attachment integrity');
    const metadata = { id: item.id, name: item.name, size: item.size, sha256: item.sha256, mediaType: item.mediaType };
    writeFileSync(fd, (index ? ',' : '') + ascii(metadata).slice(0, -1) + ',"data":"', 'utf8');
    writeFileSync(fd, bytes.toString('base64'), 'ascii');
    writeFileSync(fd, '"}', 'ascii');
  }
  writeFileSync(fd, ']}', 'ascii');
}
