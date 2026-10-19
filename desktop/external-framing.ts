import { maxExternalNoteBodyBytes } from '../shared/external-notes';

export const maxExternalFrameBytes = maxExternalNoteBodyBytes * 6 + 32 * 1024;
export function encodeExternalFrame(value: unknown): Buffer {
  const payload = Buffer.from(JSON.stringify(value), 'utf8');
  if (payload.length > maxExternalFrameBytes) throw Error('INVALID_EXTERNAL_FRAME');
  const header = Buffer.alloc(4); header.writeUInt32LE(payload.length);
  return Buffer.concat([header, payload]);
}

/** One bounded frame per connection, without repeated whole-payload concatenation. */
export class ExternalFrameDecoder {
  private readonly header = Buffer.alloc(4);
  private headerLength = 0;
  private payload: Buffer | null = null;
  private length = 0;
  private done = false;
  push(chunk: Buffer): unknown | undefined {
    if (this.done) throw Error('INVALID_EXTERNAL_FRAME');
    let offset = 0;
    if (this.headerLength < 4) {
      const count = Math.min(4 - this.headerLength, chunk.length);
      chunk.copy(this.header, this.headerLength, 0, count); this.headerLength += count; offset = count;
      if (this.headerLength < 4) return undefined;
      const size = this.header.readUInt32LE(0);
      if (size < 2 || size > maxExternalFrameBytes) throw Error('INVALID_EXTERNAL_FRAME');
      this.payload = Buffer.alloc(size);
    }
    if (chunk.length - offset > this.payload!.length - this.length) throw Error('INVALID_EXTERNAL_FRAME');
    this.length += chunk.copy(this.payload!, this.length, offset);
    if (this.length !== this.payload!.length) return undefined;
    this.done = true;
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(this.payload!));
  }
}
