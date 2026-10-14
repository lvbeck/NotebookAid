export interface BackupPolicy { directory: string | null; enabled: boolean; nextAt: number | null; lastAt: number | null; }
export interface BackupResult { path: string; files: number; bytes: number; libraryId: string; createdAt: string; }
export interface IntegrityResult { notes: number; revisions: number; attachments: number; encryptedSkipped: number; }
export type MaintenanceAction = 'backup' | 'verify' | 'restore' | 'migrate';
export interface BackupState { policies: Record<string, BackupPolicy>; missed: string[]; }
export interface BackupProgress { phase: 'validating' | 'scanning' | 'hashing' | 'copying' | 'verifying' | 'complete' | 'failed'; completed: number; total: number | null; }
export interface BackupJob { id: string; progress: BackupProgress; }
