import { app, type BrowserWindow } from 'electron';
import { createHash, randomUUID } from 'node:crypto';
import { openSync, readSync, closeSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { tmpdir } from 'node:os';
import { emptyDelta } from '../shared/delta-document';


export async function smokeNativeCapacity(window: BrowserWindow, directory: string): Promise<void> {
  const run = (script: string) => window.webContents.executeJavaScript(script);
  const call = async (method: string, ...args: unknown[]) => {
    const result = await run(`window.notebookAid.library.${method}(...${JSON.stringify(args)})`);
    if (!result.ok) throw Error(method + ': ' + result.code);
    return result.value;
  };
  const digest = (path: string) => {
    const hash = createHash('sha256'), buffer = Buffer.alloc(64 * 1024), fd = openSync(path, 'r');
    try { let count: number; while ((count = readSync(fd, buffer, 0, buffer.length, null)) > 0) hash.update(buffer.subarray(0, count)); return hash.digest('hex'); } finally { closeSync(fd); }
  };
  const samples: unknown[] = [];
  const sample = (stage: string) => samples.push({ stage, memoryBytes: process.memoryUsage(), processes: app.getAppMetrics().map(({ pid, type, memory }) => ({ pid, type, memoryKiB: memory })) });
  if (process.argv.includes('--self-test-reopen')) {
    const expected = JSON.parse(readFileSync(join(directory, 'capacity-report.json'), 'utf8'));
    const items = await call('attachments', expected.noteId);
    if (items.length !== expected.count || items.some((item: any) => !item.available)) throw Error('Capacity restart integrity failed');
    writeFileSync(join(directory, 'capacity-reopen.json'), JSON.stringify({ count: items.length, available: true })); return;
  }
  const count = Number(process.env['NOTEBOOKAID_NATIVE_CAPACITY_TEST']);
  if (![10, 50].includes(count)) throw Error('Invalid capacity fixture');
  const size = 200 * 1024 * 1024 / count;
  const started = Date.now(); sample('baseline');
  const input = { primaryFormat: 'delta' as const, title: '满容量交换测试', body: emptyDelta };
  const fixture = join(directory, 'capacity.nadelta');
  if (!statSync(fixture).isFile()) throw Error('Missing independently generated capacity fixture');
  writeFileSync(join(directory, 'note-file-dialog.json'), JSON.stringify({ path: fixture }));
  let time = Date.now();
  const imported = await call('importFile');
  const importMs = Date.now() - time;
  if (imported.nativeAttachments || !imported.nativeImportToken || Buffer.byteLength(JSON.stringify(imported)) > 4096) throw Error('Binary payload crossed renderer IPC');
  sample('imported');
  const operationId = randomUUID(); time = Date.now();
  const created = await call('create', operationId, imported);
  const createMs = Date.now() - time;
  sample('created');
  const replay = await call('create', operationId, imported);
  if (replay.note.id !== created.note.id) throw Error('Import retry duplicated note');
  const rejected = await run(`window.notebookAid.library.create('${randomUUID()}',${JSON.stringify(imported)})`);
  if (rejected.ok) throw Error('Consumed token accepted a different operation');
  const attachments = await call('attachments', created.note.id);
  if (attachments.length !== count || attachments.some((item: any) => !item.available)) throw Error('Imported attachments missing');
  const output = join(tmpdir(), 'notebookaid-export-' + basename(directory)); mkdirSync(output, { recursive: true });
  const destination = join(output, 'capacity-copy.nadelta');
  writeFileSync(join(directory, 'note-file-dialog.json'), JSON.stringify({ path: destination }));
  time = Date.now();
  await call('exportFile', { ...input, attachmentNoteId: created.note.id });
  const exportMs = Date.now() - time; sample('exported');
  if (await digest(fixture) !== await digest(destination)) throw Error('Full container hash differs after round trip');
  await new Promise(resolve => setTimeout(resolve, 2000)); sample('settled');
  writeFileSync(join(directory, 'capacity-report.json'), JSON.stringify({ count, eachBytes: size, totalBytes: size * count, packageBytes: statSync(destination).size, rendererImportBytes: Buffer.byteLength(JSON.stringify(imported)), importMs, createMs, exportMs, elapsedMs: Date.now() - started, noteId: created.note.id, fullHashRoundTrip: true, retry: true, samples }, null, 2));
}
