export interface SecurityState {
  configured: boolean;
  unlocked: boolean;
  encryptedNotes: number;
  preference: boolean | null;
}
export type SecurityAction = 'setup' | 'unlock' | 'recover' | 'password' | 'lock' | 'disable';
export interface SecurityRequest { action: SecurityAction; password?: string; credential?: string; }
export interface EncryptedNote { id: string; title: string; version: number; folder: string; deleted: boolean; }
export interface DecryptProgress { libraryId: string; processed: number; total: number; }
export interface DecryptReport { backupPath: string; succeeded: number; failed: number; errors: Array<{ id: string; code: string }>; }
