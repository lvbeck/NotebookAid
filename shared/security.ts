export interface SecurityState {
  configured: boolean;
  unlocked: boolean;
  encryptedNotes: number;
  preference: boolean | null;
}
export type SecurityAction = 'setup' | 'unlock' | 'recover' | 'password' | 'lock' | 'disable';
export interface SecurityRequest { action: SecurityAction; password?: string; credential?: string; }
