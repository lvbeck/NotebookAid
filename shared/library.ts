import type { SettingsApi } from './settings';
import type { Attachment, AttachmentRequest, AttachmentView, AttachmentPreview } from './attachments';
import type { Organization, OrganizationEdit, NotePlacement, PlacementRequest, NoteQuery } from './organization';
import type { LibraryImportPreview, LibraryImportResult } from './library-import';
import type { RegistryApi } from './registry';
export type LibraryErrorCode = 'INVALID_INPUT' | 'WRITE_FAILED' | 'INTEGRITY_CHECK_FAILED' | 'VERSION_CONFLICT' | 'SESSION_EXPIRED' | 'NOTE_IN_USE' | 'LIBRARY_IN_USE' | 'NOT_FOUND_OR_UNAVAILABLE' | 'COMMIT_STATUS_UNKNOWN' | 'DUPLICATE_LIBRARY' | 'LIBRARY_ID_MISMATCH' | 'REGISTRY_INVALID' | 'UNSUPPORTED_LIBRARY' | 'CURRENT_LIBRARY';
export type Result<T> = { ok: true; value: T } | { ok: false; code: LibraryErrorCode };
export type NoteFormat = 'markdown' | 'html' | 'text';
export const formatExtensions: Record<NoteFormat, string> = { markdown: 'md', html: 'html', text: 'txt' };
export interface NoteInput { primaryFormat: NoteFormat; title: string; body: string; folderId?: string | null; }
export interface NoteSummary extends NotePlacement { id: string; title: string; primaryFormat: NoteFormat; version: number; contentVersion: number; createdAt: string; updatedAt: string; deletedAt: string | null; }
export interface NoteDocument extends NoteSummary { body: string; revisionId: string; attachments?: Attachment[]; }
export interface EditSession { token: string; generation: string; note: NoteDocument; }
export interface SaveRequest { noteId: string; token: string; generation: string; expectedVersion: number; operationId: string; title: string; body: string; }
export interface SaveResult { removedUnsafeSvg?: number; note: NoteDocument; saved: true; indexed: boolean; }
export interface LibraryStatus { path: string; libraryId: string; indexed: boolean; issues: string[]; pendingRecovery: number; }
export interface LibraryApi extends RegistryApi, SettingsApi {
  attachments(noteId: string): Promise<Result<AttachmentView[]>>;
  addAttachment(request: AttachmentRequest): Promise<Result<SaveResult | null>>;
  unlinkAttachment(request: AttachmentRequest, id: string): Promise<Result<SaveResult>>;
  renameAttachment(request: AttachmentRequest, id: string, name: string): Promise<Result<SaveResult>>;
  previewAttachment(noteId: string, id: string): Promise<Result<AttachmentPreview>>;
  exportAttachment(noteId: string, id: string): Promise<Result<boolean>>;
  previewLibraryImport(): Promise<Result<LibraryImportPreview | null>>;
  confirmLibraryImport(token: string): Promise<Result<LibraryImportResult>>;
  organization(): Promise<Result<Organization>>;
  editOrganization(input: OrganizationEdit): Promise<Result<Organization>>;
  place(request: PlacementRequest): Promise<Result<SaveResult>>;
  query(input: NoteQuery): Promise<Result<{ notes: NoteSummary[]; total: number }>>;
  status(): Promise<Result<LibraryStatus>>;
  list(): Promise<Result<NoteSummary[]>>;
  create(operationId: string, input?: NoteInput): Promise<Result<SaveResult>>;
  importFile(): Promise<Result<(NoteInput & { removed?: number }) | null>>;
  exportFile(input: NoteInput): Promise<Result<boolean>>;
  begin(noteId: string): Promise<Result<EditSession>>;
  end(token: string, generation: string): Promise<Result<void>>;
  save(request: SaveRequest): Promise<Result<SaveResult>>;
  rebuild(): Promise<Result<LibraryStatus>>;
  onExit(callback: () => Promise<boolean>): () => void;
}
