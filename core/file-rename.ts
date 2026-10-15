import { renameSync } from 'node:fs';

const retryDelays = [10, 20, 40, 80, 100];
const pause = new Int32Array(new SharedArrayBuffer(4));

export function renameWithRetry(source: string, target: string): void {
  for (let attempt = 0; ; attempt++) {
    try { renameSync(source, target); return; }
    catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (process.platform !== 'win32' || !['EPERM', 'EBUSY'].includes(code ?? '') || attempt >= retryDelays.length) throw error;
      // Windows readers can briefly hold a just-written file or directory open.
      Atomics.wait(pause, 0, 0, retryDelays[attempt]);
    }
  }
}
