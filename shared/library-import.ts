export interface LibraryImportPreview {
  token: string; sourcePath: string; targetPath: string; sourceVersion: number; targetVersion: number;
  notes: number; revisions: number; folders: number; tags: number; skipped: number; conflicts: number; deleted: number;
}
export interface LibraryImportResult { imported: number; skipped: number; backupPath: string | null; targetVersion: number; }
