import type { SettingsApi } from './settings';
import type { Attachment, AttachmentRequest, AttachmentView, AttachmentPreview } from './attachments';
import type { Organization, OrganizationEdit, NotePlacement, PlacementRequest, NoteQuery } from './organization';
import type { LibraryImportPreview, LibraryImportResult } from './library-import';
import type { RegistryApi } from './registry';
export type MaintenanceErrorCode = 'TARGET_NOT_EMPTY' | 'PATH_OVERLAP' | 'PATH_LINKED' | 'RESTORE_TARGET_INVALID' | 'RESTORE_FAILED_ROLLED_BACK' | 'RESTORE_ROLLBACK_FAILED' | 'RESTORE_INTERRUPTED' | 'DISK_FULL' | 'ACCESS_DENIED';
export type LibraryErrorCode = MaintenanceErrorCode | 'PASSWORD_POLICY' | 'BAD_CREDENTIAL' | 'NOTEBOOK_LOCKED' | 'ENCRYPTED_NOTES_REMAIN' | 'INVALID_INPUT' | 'WRITE_FAILED' | 'INTEGRITY_CHECK_FAILED' | 'VERSION_CONFLICT' | 'SESSION_EXPIRED' | 'NOTE_IN_USE' | 'LIBRARY_IN_USE' | 'NOT_FOUND_OR_UNAVAILABLE' | 'COMMIT_STATUS_UNKNOWN' | 'DUPLICATE_LIBRARY' | 'LIBRARY_ID_MISMATCH' | 'REGISTRY_INVALID' | 'UNSUPPORTED_LIBRARY' | 'CURRENT_LIBRARY' | 'INVALID_DELTA' | 'UNSUPPORTED_DELTA' | 'CANCELLED';
export type Result<T> = { ok: true; value: T } | { ok: false; code: LibraryErrorCode; details?: { targetPath?: string; rollbackPath?: string; stagingPath?: string } };
export type NoteFormat = 'markdown' | 'html' | 'text' | 'delta';
export const formatExtensions: Record<NoteFormat, string> = { markdown: 'md', html: 'html', text: 'txt', delta: 'nadelta' };
export const latestNotebookSchemaVersion = 9;
export const maxNoteMetadataBytes=512*1024;
export interface LibraryUpgradeResult { schemaVersion: number; backupPath: string | null; }
export interface NoteInput { primaryFormat: NoteFormat; title: string; body: string; folderId?: string | null; nativeAttachments?: import('./delta-document').NativeAttachment[]; attachmentNoteId?: string; nativeImportToken?: string; }
export interface NoteSummary extends NotePlacement { encrypted?: boolean; visibleInThunderbird?: boolean; id: string; title: string; primaryFormat: NoteFormat; version: number; contentVersion: number; createdAt: string; updatedAt: string; deletedAt: string | null; }
export interface NoteDocument extends NoteSummary { body: string; revisionId: string; attachments?: Attachment[]; generatedSummary?: import('./writing').GeneratedSummary;generatedTranslation?:import('./writing').GeneratedTranslation; }
export interface EditSession { token: string; generation: string; note: NoteDocument; }
export interface SaveRequest { noteId: string; token: string; generation: string; expectedVersion: number; operationId: string; title: string; body: string; }
export interface SaveResult { removedUnsafeSvg?: number; note: NoteDocument; saved: true; indexed: boolean; }
export interface LibraryStatus { security?: import('./security').SecurityState; path: string; libraryId: string; indexed: boolean; issues: string[]; pendingRecovery: number; }
export interface LibraryApi extends RegistryApi, SettingsApi {
  backups(): Promise<Result<import('./backup').BackupState>>;
  onBackupStatus(callback: (value: { ok: boolean; libraryId: string | null }) => void): () => void;
  configureBackup(id: string, enabled: boolean, chooseDirectory: boolean): Promise<Result<import('./backup').BackupState | null>>;
  maintenance(id: string, action: import('./backup').MaintenanceAction): Promise<Result<unknown>>;
  printRecovery(mode: 'print' | 'pdf', key: string): Promise<Result<boolean>>;
  upgradeLibrary(id: string, expectedSchemaVersion: number): Promise<Result<LibraryUpgradeResult | null>>;
  security(request: import('./security').SecurityRequest): Promise<Result<{ state: import('./security').SecurityState; recoveryKey?: string }>>;
  securityPreference(value: boolean | null): Promise<Result<void>>;
  protectNote(id: string, version: number, encrypted: boolean): Promise<Result<void>>;
  noteVisibility(id: string, version: number, visible: boolean): Promise<Result<SaveResult>>;
  onSecurityLocked(callback: () => void): () => void;
  cleanHistory(id: string, version: number, retain: number, operationId: string): Promise<Result<number | null>>;
  trashNote(id: string, version: number, operationId: string): Promise<Result<SaveResult | null>>;
  restoreNote(id: string, version: number, operationId: string): Promise<Result<SaveResult>>;
  purgeNote(id: string, version: number, operationId: string): Promise<Result<boolean>>;
  history(id: string, offset?: number): Promise<Result<{ revisions: (NoteSummary & { revisionId: string; attachmentCount: number })[]; total: number }>>;
  revision(id: string, revision: string): Promise<Result<NoteDocument>>;
  restoreRevision(id: string, revision: string, version: number, operationId: string): Promise<Result<SaveResult | null>>;
  deleteOrganization(kind: 'folder' | 'tag', id: string, version: number): Promise<Result<Organization | null>>;
  attachments(noteId: string): Promise<Result<AttachmentView[]>>;
  addAttachment(request: AttachmentRequest): Promise<Result<SaveResult | null>>;
  unlinkAttachment(request: AttachmentRequest, id: string): Promise<Result<SaveResult>>;
  renameAttachment(request: AttachmentRequest, id: string, name: string): Promise<Result<SaveResult>>;
  previewAttachment(noteId: string, id: string): Promise<Result<AttachmentPreview>>;
  exportAttachment(noteId: string, id: string): Promise<Result<boolean>>;
  previewLibraryImport(credential?: string): Promise<Result<LibraryImportPreview | null>>;
  cancelLibraryImport(): Promise<Result<void>>;
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
  onExit(callback: (command: import('./dialog').ExitCommand) => Promise<import('./dialog').ExitState>): () => void;
}
