import type { Attachment } from './attachments';

export interface NativeAttachment extends Attachment { data: string; }
export interface DeltaOp { insert: string | { image: string }; attributes?: Record<string, string | number | boolean>; }
export interface DeltaDocument { format: 'NotebookAidDelta'; version: 1; ops: DeltaOp[]; }
export class DeltaError extends Error {
  constructor(readonly code: 'INVALID_DELTA' | 'UNSUPPORTED_DELTA', detail: string) { super(detail); }
}
export const emptyDelta = JSON.stringify({ format: 'NotebookAidDelta', version: 1, ops: [{ insert: '\n' }] });
const languages = ['plain','python','javascript','typescript','json','bash','css','xml','sql','java','cpp','csharp','markdown'];
const block = ['header','list','indent','blockquote','code-block','table','cell-header','cell-align'];
const plain = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const invalid = (path: string): never => { throw new DeltaError('INVALID_DELTA', path); };
export function parseDelta(body: string): DeltaDocument {
  if (typeof body !== 'string' || new TextEncoder().encode(body).length > 2 * 1024 * 1024) invalid('document size');
  let doc: any; try { doc = JSON.parse(body); } catch { return invalid('JSON'); }
  if (!plain(doc) || doc.format !== 'NotebookAidDelta') invalid('format');
  if (doc.version !== 1) throw new DeltaError('UNSUPPORTED_DELTA', 'version');
  if (Object.keys(doc).some(key => !['format','version','ops'].includes(key)) || !Array.isArray(doc.ops) || !doc.ops.length || doc.ops.length > 50000) invalid('ops');
  doc.ops.forEach((op: any, index: number) => {
    const path = 'ops[' + index + ']';
    if (!plain(op) || Object.keys(op).some(key => !['insert','attributes'].includes(key))) invalid(path);
    const image = plain(op.insert);
    if (image) {
      if (Object.keys(op.insert).join() !== 'image' || typeof op.insert.image !== 'string' || !/^(attachments\/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}|https?:\/\/[^\s<>]{1,2048})$/i.test(op.insert.image)) invalid(path + '.image');
    } else if (typeof op.insert !== 'string' || !op.insert || op.insert.includes('\0') || op.insert.includes('\r')) invalid(path + '.insert');
    if (op.attributes !== undefined) {
      if (!plain(op.attributes)) invalid(path + '.attributes');
      const a = op.attributes;
      for (const [key, value] of Object.entries(a)) {
        let valid = false;
        if (['bold','italic','code','blockquote'].includes(key)) valid = value === true;
        if (key === 'header') valid = [1,2,3].includes(value as number);
        if (key === 'list') valid = ['ordered','bullet','checked','unchecked'].includes(value as string);
        if (key === 'indent') valid = Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 8;
        if (key === 'code-block') valid = languages.includes(value as string);
        if (key === 'table') valid = typeof value === 'string' && /^[a-z0-9_-]{1,80}$/i.test(value);
        if (key === 'cell-header') valid = value === 'true';
        if (key === 'cell-align') valid = ['left','center','right'].includes(value as string);
        if (key === 'link') {
          try { valid = typeof value === 'string' && value.length <= 2048 && !/[\x00-\x20<>]/.test(value) && ['https:','http:','mailto:','tel:','sms:'].includes(new URL(value, 'https://notebookaid.invalid/').protocol); } catch { valid = false; }
        }
        if (['width','height'].includes(key)) valid = image && typeof value === 'string' && /^[1-9][0-9]{0,3}$/.test(value) && Number(value) <= 8192;
        if (['alt','title'].includes(key)) valid = image && typeof value === 'string' && value.length <= 1000 && !value.includes('\0');
        if (!valid || (block.includes(key) && (image || !/^\n+$/.test(op.insert)))) invalid(path + '.attributes.' + key);
      }
      if ([a.header,a.list,a.blockquote,a['code-block'],a.table].filter(Boolean).length > 1 || ((a['cell-header'] || a['cell-align']) && !a.table)) invalid(path + '.block');
    }
  });
  if (typeof doc.ops.at(-1).insert !== 'string' || !doc.ops.at(-1).insert.endsWith('\n')) invalid('final newline');
  return doc as DeltaDocument;
}
export function deltaText(body: string): string { return parseDelta(body).ops.map(op => typeof op.insert === 'string' ? op.insert : '').join(''); }
export function deltaImageIds(body: string): string[] { return parseDelta(body).ops.flatMap(op => typeof op.insert !== 'string' && op.insert.image.startsWith('attachments/') ? [op.insert.image.slice(12)] : []); }
export function deltaSnapshot(ops: DeltaOp[]): string {
  const body = JSON.stringify({ format: 'NotebookAidDelta', version: 1, ops: ops.map(op => {
    const attributes = { ...op.attributes }; delete attributes['code-token'];
    return { insert: op.insert, ...(Object.keys(attributes).length ? { attributes } : {}) };
  }) });
  parseDelta(body); return body;
}
