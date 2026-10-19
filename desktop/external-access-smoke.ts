import { BrowserWindow } from 'electron';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ExternalNoteContext } from '../core/external-notes';
import { externalAccessHost } from './external-access';
import { assertProbeHome } from './mcp-probe';

/** Private parent/child test IPC; credential messages are never written to logs or files. */
export async function startExternalAccessSmoke(workspace: string, directory: string, context: () => ExternalNoteContext, stop: () => void) {
  assertProbeHome(workspace, directory);
  let locked = false;
  const host = await externalAccessHost(directory, () => { const state = context(); return { ...state, appUnlocked: !locked && state.appUnlocked }; });
  const credentials = [];
  if (!host.list().length) {
    const library = context().library!;
    const folderId = randomUUID(); library.editOrganization({ kind: 'folder', id: folderId, name: 'Synthetic inbox', expectedVersion: library.organization().version });
    credentials.push(host.issue({ name: 'Synthetic Codex', libraryId: library.libraryId, folderId: null }));
    credentials.push(host.issue({ name: 'Synthetic second client', libraryId: library.libraryId, folderId }));
    await host.start();
  }
  process.stdout.write(JSON.stringify({ type: 'external-test-ready', credentials, clients: host.list(), windowCount: BrowserWindow.getAllWindows().length }) + '\n');
  // Electron GUI executables do not reliably expose inherited stdin on Windows.
  // This file controller is available only in a guarded, fresh synthetic fixture.
  const commandFile = join(directory, 'external-test-command.json');
  const timer = setInterval(() => {
    if (!existsSync(commandFile)) return;
    let id: unknown;
    try {
      const command = JSON.parse(readFileSync(commandFile, 'utf8')); unlinkSync(commandFile); id = command.id;
      if (command.action === 'revoke') host.revoke(command.clientId);
      else if (command.action === 'lock') locked = true;
      else if (command.action === 'unlock') locked = false;
      else if (command.action === 'stop') { clearInterval(timer); host.close(); stop(); return; }
      else throw Error();
      writeFileSync(join(directory, 'external-test-result.json'), JSON.stringify({ id, ok: true }));
    } catch { writeFileSync(join(directory, 'external-test-result.json'), JSON.stringify({ id, ok: false })); }
  }, 50);
}
