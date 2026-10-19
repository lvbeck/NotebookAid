import { LibraryError, type NoteLibrary } from './library';
import { maxExternalNoteBodyBytes, maxExternalNoteTitleLength, type ExternalCreateBinding, type ExternalCreateRequest, type ExternalCreateResult } from '../shared/external-notes';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fields = new Set(['libraryId', 'requestId', 'title', 'body', 'format', 'folderId']);

function parseRequest(value: unknown): ExternalCreateRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new LibraryError('INVALID_INPUT');
  const input = value as Record<string, unknown>;
  if (['libraryId', 'requestId', 'title', 'body'].some(key => !Object.hasOwn(input, key)) ||
    Object.keys(input).some(key => !fields.has(key)) || typeof input.libraryId !== 'string' || !uuid.test(input.libraryId) ||
    typeof input.requestId !== 'string' || !uuid.test(input.requestId) ||
    typeof input.title !== 'string' || !input.title.trim() || input.title.length > maxExternalNoteTitleLength || /[\x00-\x1f\x7f\uD800-\uDFFF]/u.test(input.title) ||
    typeof input.body !== 'string' || /[\u0000\uD800-\uDFFF]/u.test(input.body) || Buffer.byteLength(input.body, 'utf8') > maxExternalNoteBodyBytes ||
    input.format !== undefined && input.format !== 'text' && input.format !== 'markdown' ||
    input.folderId !== undefined && input.folderId !== null && (typeof input.folderId !== 'string' || !uuid.test(input.folderId))) {
    throw new LibraryError('INVALID_INPUT');
  }
  return input as unknown as ExternalCreateRequest;
}

export interface ExternalNoteContext {
  readonly library: NoteLibrary | null;
  readonly appUnlocked: boolean;
  readonly busy: boolean;
}

/** Reuses the running host's writer; this service never opens a notebook. */
export class ExternalNoteService {
  constructor(private readonly context: () => ExternalNoteContext, private readonly binding: () => ExternalCreateBinding | null) {}

  create(value: unknown): ExternalCreateResult {
    try {
      const binding = this.binding();
      if (!binding || typeof binding.libraryId !== 'string' || !uuid.test(binding.libraryId) ||
        binding.folderId !== null && (typeof binding.folderId !== 'string' || !uuid.test(binding.folderId))) return { ok: false, code: 'ACCESS_DENIED' };
      const state = this.context();
      if (state.appUnlocked !== true) return { ok: false, code: 'APP_LOCKED' };
      if (state.busy !== false) return { ok: false, code: 'LIBRARY_IN_USE' };
      if (!state.library) return { ok: false, code: 'BACKGROUND_UNAVAILABLE' };
      const input = parseRequest(value), library = state.library;
      if (input.libraryId !== binding.libraryId || library.libraryId !== binding.libraryId) return { ok: false, code: 'LIBRARY_CHANGED' };
      const folderId = input.folderId === undefined ? binding.folderId : input.folderId;
      if (folderId !== binding.folderId) return { ok: false, code: 'ACCESS_DENIED' };
      const security = library.securityState();
      if (security.configured && !security.unlocked) return { ok: false, code: 'NOTEBOOK_LOCKED' };
      const format = input.format ?? 'text';
      const result = library.create(input.requestId, { title: input.title, body: input.body, primaryFormat: format, folderId });
      return { ok: true, value: { libraryId: library.libraryId, requestId: input.requestId, noteId: result.note.id, folderId: result.note.folderId, format, version: result.note.version, saved: result.saved, indexed: result.indexed } };
    } catch (error) {
      if (error instanceof LibraryError) return { ok: false, code: error.code };
      const code = (error as NodeJS.ErrnoException | null)?.code;
      return { ok: false, code: code === 'ENOSPC' ? 'DISK_FULL' : code === 'EACCES' || code === 'EPERM' ? 'ACCESS_DENIED' : 'WRITE_FAILED' };
    }
  }
}
