export interface BackupPolicy { directory: string | null; enabled: boolean; nextAt: number | null; lastAt: number | null; }
export interface BackupResult { path: string; files: number; bytes: number; libraryId: string; createdAt: string; }
export interface IntegrityResult { notes: number; revisions: number; attachments: number; encryptedSkipped: number; }
export type MaintenanceAction = 'backup' | 'verify' | 'restore' | 'migrate';
export interface BackupState { policies: Record<string, BackupPolicy>; missed: string[]; }
