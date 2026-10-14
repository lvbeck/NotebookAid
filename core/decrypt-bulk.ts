import type { NoteLibrary } from './library';
import type { DecryptProgress, DecryptReport } from '../shared/security';
import { LibraryError } from './library';
import { createBackup } from './backups';
import { basename, dirname, join } from 'node:path';

export async function decryptNotes(library: NoteLibrary, credential: string, progress: (value: Omit<DecryptProgress, 'libraryId'>) => void, guard: () => void): Promise<DecryptReport> {
  guard(); library.assertSecurityIdle();
  await library.securityCommand({ action: 'unlock', credential });
  guard();
  const notes = library.encryptedNotes(), status = library.status();
  if (status.issues.length || status.pendingRecovery) throw new LibraryError('INTEGRITY_CHECK_FAILED');
  if (!notes.length) throw new LibraryError('INVALID_INPUT');
  progress({ processed: 0, total: notes.length }); await new Promise<void>(resolve => setImmediate(resolve)); guard();
  const report: DecryptReport = { backupPath: createBackup(library.path, join(dirname(library.path), basename(library.path) + '.security-backups')).path, succeeded: 0, failed: 0, errors: [] };
  for (const note of notes) {
    guard();
    try { library.protect(note.id, note.version, false); report.succeeded++; }
    catch (error) { report.failed++; report.errors.push({ id: note.id, code: error instanceof LibraryError ? error.code : 'WRITE_FAILED' }); }
    progress({ processed: report.succeeded + report.failed, total: notes.length });
    await new Promise<void>(resolve => setImmediate(resolve));
    if (report.failed) break;
  }
  return report;
}
