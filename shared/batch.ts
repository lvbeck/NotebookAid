export interface BatchProgress {
  token: string;
  phase: 'backup' | 'process' | 'done';
  processed: number;
  total: number;
  succeeded: number;
  skipped: number;
  failed: number;
}
export interface FolderBulkPreview { token: string; folderId: string | null; includeChildren: boolean; count: number; }
export interface FolderBulkReport { succeeded: number; failed: number; backupPath: string; rows: Array<{id: string; code?: string}>; }
export interface FolderBulkApi {
  preview(folderId: string | null, includeChildren: boolean): Promise<import('./library').Result<FolderBulkPreview>>;
  confirm(token: string, mode: 'trash' | 'delete'): Promise<import('./library').Result<FolderBulkReport>>;
  cancel(token: string): Promise<void>;
  onProgress(callback: (progress: BatchProgress) => void): () => void;
}
