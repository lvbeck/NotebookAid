import { parentPort, workerData } from 'node:worker_threads';
import { exportNotebookArchive, importNotebookArchive } from './notebook-archive';
import { LibraryError } from './library';
import type { BackupProgress } from '../shared/backup';

if (parentPort) {
  const port = parentPort;
  const progress = (value: BackupProgress) => port.postMessage({ progress: value });
  void (async () => {
    const request = workerData as { action: 'import' | 'export'; source: string; target: string; identities: string[] };
    try {
      const value = request.action === 'export' ? await exportNotebookArchive(request.source, request.target, progress) : await importNotebookArchive(request.source, request.target, progress, id => { if (request.identities.includes(id)) throw new LibraryError('DUPLICATE_LIBRARY'); });
      port.postMessage({ done: true, value });
    } catch (error) { port.postMessage({ error: error instanceof LibraryError ? error.code : 'WRITE_FAILED' }); }
    finally { port.close(); }
  })();
}
