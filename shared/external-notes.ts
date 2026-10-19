import type { LibraryErrorCode } from './library';

export const maxExternalNoteBodyBytes = 2 * 1024 * 1024;
export const maxExternalNoteTitleLength = 300;
export type ExternalNoteFormat = 'text' | 'markdown';

export interface ExternalCreateRequest {
  libraryId: string;
  requestId: string;
  title: string;
  body: string;
  format?: ExternalNoteFormat;
  folderId?: string | null;
}

/** Supplied by the authenticated host, never by the request payload. */
export interface ExternalCreateBinding {
  readonly libraryId: string;
  readonly folderId: string | null;
}

export interface ExternalCreateReceipt {
  libraryId: string;
  requestId: string;
  noteId: string;
  folderId: string | null;
  format: ExternalNoteFormat;
  version: number;
  saved: true;
  indexed: boolean;
}

export type ExternalCreateErrorCode = LibraryErrorCode | 'APP_LOCKED' | 'BACKGROUND_UNAVAILABLE' | 'LIBRARY_CHANGED';
export type ExternalCreateResult = { ok: true; value: ExternalCreateReceipt } | { ok: false; code: ExternalCreateErrorCode };
