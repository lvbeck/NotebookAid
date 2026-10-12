import { imageType } from './attachments';
import { randomUUID } from 'node:crypto';
import { NoteLibrary, LibraryError } from './library';
import { addonProtocolVersion, type AddonRequest, type DesktopNoteTarget } from '../shared/addon';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const integer = (n: unknown, max: number) => Number.isSafeInteger(n) && (n as number) >= 0 && (n as number) <= max;
export class AddonService {
  private library: NoteLibrary | null = null;
  private unsubscribe?: () => void;
  private sequence = 0;
  private readonly instance = randomUUID();
  private stamp = '';
  constructor(private readonly context: () => { library: NoteLibrary; name: string; unlocked: boolean; locale: string; theme: string; appVersion?: string }, private readonly open: (target: DesktopNoteTarget) => Promise<boolean>) {}
  close(): void { this.unsubscribe?.(); this.unsubscribe = undefined; }
  private state() {
    const state = this.context();
    if (state.library !== this.library) { this.close(); this.library = state.library; this.unsubscribe = state.library.addon().onChange(() => this.sequence++); this.sequence++; }
    const stamp = JSON.stringify([state.library.libraryId, state.unlocked, state.library.organization().version, state.locale, state.theme, state.name]);
    if (stamp !== this.stamp) { this.stamp = stamp; this.sequence++; }
    return { ...state, cursor: this.instance + ':' + this.sequence };
  }
  async request(input: AddonRequest): Promise<any> {
    try {
      if (!input || typeof input !== 'object' || Array.isArray(input) || typeof input.method !== 'string' || JSON.stringify(input).length > 60000) throw new LibraryError('INVALID_INPUT');
      if (input.protocolVersion !== addonProtocolVersion) return { ok: false, code: 'PROTOCOL_MISMATCH', protocolVersion: addonProtocolVersion };
      const state = this.state();
      if (input.method === 'handshake' || input.method === 'changes') return { ok: true, value: { protocolVersion: addonProtocolVersion, appVersion: state.appVersion, capabilities: ['query','preview','trash','openNote','mapTags','changes','image'], libraryId: state.unlocked ? state.library.libraryId : null, name: state.unlocked ? state.name : '', locked: !state.unlocked, cursor: state.cursor, locale: state.locale, theme: state.theme, resyncRequired: input.params?.['cursor'] !== state.cursor } };
      if (!state.unlocked) return { ok: false, code: 'APP_LOCKED' };
      if (input.libraryId !== state.library.libraryId) return { ok: false, code: 'LIBRARY_CHANGED' };
      const lib = state.library, api = lib.addon(), p = input.params ?? {};
      if (!p || typeof p !== 'object' || Array.isArray(p)) throw new LibraryError('INVALID_INPUT');
      switch (input.method) {
        case 'query': {
          if (p['view'] === 'trash') throw new LibraryError('INVALID_INPUT');
          const result = api.query({ ...p, limit: 20 });
          return { ok: true, value: { total: result.total, cursor: state.cursor, notes: result.notes.map(n => ({ id: n.id, title: n.title, version: n.version, primaryFormat: n.primaryFormat, updatedAt: n.updatedAt, folderId: n.folderId, tagIds: n.tagIds, pinned: n.pinned, encrypted: n.encrypted })) } };
        }
        case 'organization': {
          const offset = p['offset'] ?? 0; if (!integer(offset, 1000)) throw new LibraryError('INVALID_INPUT');
          const org = lib.organization(); return { ok: true, value: { version: org.version, total: Math.max(org.folders.length, org.tags.length), folders: org.folders.slice(offset as number, (offset as number) + 30), tags: org.tags.slice(offset as number, (offset as number) + 30) } };
        }
        case 'preview': {
          const note = api.read(String(p['noteId']));
          if (p['version'] !== note.version) throw new LibraryError('VERSION_CONFLICT');
          const offset = p['offset'] ?? 0; if (!integer(offset, note.body.length)) throw new LibraryError('INVALID_INPUT');
          return { ok: true, value: { title: note.title, version: note.version, primaryFormat: note.primaryFormat, length: note.body.length, body: note.body.slice(offset as number, (offset as number) + 4096), cursor: state.cursor } };
        }
        case 'image': {
          const note = api.read(String(p['noteId'])); if (note.version !== p['version']) throw new LibraryError('VERSION_CONFLICT');
          const bytes = api.attachment(String(p['noteId']), String(p['attachmentId']));
          try { const mime = imageType(bytes); if (!['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(mime)) return { ok: false, code: 'PREVIEW_UNAVAILABLE' };
            const offset = p['offset'] ?? 0; if (!integer(offset, bytes.length)) throw new LibraryError('INVALID_INPUT');
            return { ok: true, value: { mime, length: bytes.length, size: Math.min(32768, bytes.length - (offset as number)), data: bytes.subarray(offset as number, (offset as number) + 32768).toString('base64') } };
          } finally { bytes.fill(0); }
        }
        case 'trash': {
          const id = String(p['noteId']); if (!uuid.test(String(p['operationId']))) throw new LibraryError('INVALID_INPUT');
          const note = api.read(id); if (note.version !== p['version']) throw new LibraryError('VERSION_CONFLICT');
          const result = lib.trash(id, note.version, String(p['operationId'])); return { ok: true, value: { saved: result.saved, indexed: result.indexed } };
        }
        case 'openNote': { const note = api.read(String(p['noteId'])); return { ok: true, value: await this.open({ libraryId: lib.libraryId, noteId: note.id }) }; }
        case 'mapTags': return { ok: true, value: lib.mapThunderbirdTags(p['profileId'], p['tags'], p['expectedVersion']) };
        default: throw new LibraryError('INVALID_INPUT');
      }
    } catch (error) { return { ok: false, code: error instanceof LibraryError ? error.code : 'WRITE_FAILED' }; }
  }
}
