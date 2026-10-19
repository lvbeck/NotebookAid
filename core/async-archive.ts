import { Worker } from 'node:worker_threads';
import { join } from 'node:path';
import { LibraryError } from './library';
import type { BackupProgress } from '../shared/backup';

export function archiveInWorker(action: 'import' | 'export', source: string, target: string, identities: string[], progress: (value: BackupProgress) => void): Promise<{ path: string; libraryId: string } | undefined> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(join(__dirname, 'archive-worker.js'), { workerData: { action, source, target, identities } }); let settled = false;
    worker.on('message', message => {
      if (message.progress) progress(message.progress);
      else if (message.error) { settled = true; reject(new LibraryError(message.error)); }
      else if (message.done) { settled = true; resolve(message.value); }
    });
    worker.on('error', () => { settled = true; reject(new LibraryError('WRITE_FAILED')); });
    worker.on('exit', () => { if (!settled) reject(new LibraryError('WRITE_FAILED')); });
  });
}
