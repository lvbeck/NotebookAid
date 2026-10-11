import { randomUUID } from 'node:crypto';
import { LibraryError } from '../core/library';
import type { NoteInput, SaveResult } from '../shared/library';

// Keep binary payloads in the main process; retain only a small receipt after creation.
export class NativeImportCache {
  private pending?: { owner: string; libraryId: string; token: string; input?: NoteInput; title: string; body: string; receipt?: { id: string; signature: string; result: SaveResult } };
  private timer?: NodeJS.Timeout;
  clear(owner?: string): void {
    if (owner !== undefined && this.pending?.owner !== owner) return;
    clearTimeout(this.timer); this.pending = undefined;
  }
  put(owner: string, libraryId: string, input: NoteInput): NoteInput {
    this.clear();
    const token = randomUUID();
    this.pending = { owner, libraryId, token, input, title: input.title, body: input.body };
    this.timer = setTimeout(() => this.clear(), 10 * 60 * 1000); this.timer.unref();
    return { primaryFormat: 'delta', title: input.title, body: input.body, nativeImportToken: token };
  }
  resolve(owner: string, libraryId: string, id: string, input: NoteInput): { input: NoteInput; result?: SaveResult } {
    const pending = this.pending;
    if (!pending || pending.owner !== owner || pending.libraryId !== libraryId || pending.token !== input.nativeImportToken || input.primaryFormat !== 'delta' || pending.title !== input.title || pending.body !== input.body || input.nativeAttachments !== undefined) throw new LibraryError('INVALID_INPUT');
    const signature = JSON.stringify([input.primaryFormat, input.title, input.body, input.folderId ?? null]);
    if (pending.receipt) {
      if (pending.receipt.id !== id || pending.receipt.signature !== signature) throw new LibraryError('INVALID_INPUT');
      return { input, result: pending.receipt.result };
    }
    return { input: { ...pending.input!, folderId: input.folderId } };
  }
  complete(id: string, input: NoteInput, result: SaveResult): void {
    if (!this.pending) return;
    this.pending.receipt = { id, signature: JSON.stringify([input.primaryFormat, input.title, input.body, input.folderId ?? null]), result };
    this.pending.input = undefined;
  }
}
