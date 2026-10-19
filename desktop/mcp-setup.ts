import { app, ipcMain, shell, type IpcMainInvokeEvent } from 'electron';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { McpProfiles } from '../core/mcp-profile';
import { writeMcpPlugin } from '../core/mcp-plugin';
import { mcpCipher } from './mcp-cipher';
import { mcpText } from '../src/app/mcp-i18n';
import type { ExternalNoteContext } from '../core/external-notes';
import type { externalAccessHost } from './external-access';
import type { McpSetupResult } from '../shared/mcp-setup';
export function registerMcpSetup(directory: string, host: Awaited<ReturnType<typeof externalAccessHost>>, authorize: (event: IpcMainInvokeEvent) => void, context: () => ExternalNoteContext, confirm: (message: string) => Promise<unknown>, locale: () => string) {
  const profiles = new McpProfiles(directory, mcpCipher); let busy = false;
  ipcMain.handle('mcp:setup', async (event, input: unknown): Promise<McpSetupResult> => {
    try {
      authorize(event);
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('INVALID_INPUT');
      const request = input as Record<string, unknown>, action = request.action;
      if (!['state', 'create', 'revoke', 'reveal'].includes(action as string) || Object.keys(request).some(key => !['action', ...(action === 'create' ? ['name', 'libraryId', 'folderId'] : action === 'state' ? [] : ['clientId'])].includes(key))) throw Error('INVALID_INPUT');
      const state = async () => ({ available: await mcpCipher.available(), clients: host.list() });
      if (action === 'state') return { ok: true, value: await state() };
      if (busy) throw Error('LIBRARY_IN_USE'); busy = true;
      try {
        if (action === 'create') {
          if (!await mcpCipher.available()) throw Error('SECURE_STORAGE_UNAVAILABLE');
          const before = context();
          if (!before.library || before.library.libraryId !== request.libraryId) throw Error('LIBRARY_CHANGED');
          const folder = request.folderId === null ? mcpText(locale(), 'root') : before.library.organization().folders.find(item => item.id === request.folderId)?.name;
          if (!folder || typeof request.name !== 'string' || !request.name.trim() || request.name.length > 80 || /[\x00-\x1f\x7f\uD800-\uDFFF]/u.test(request.name)) throw Error('INVALID_INPUT');
          if (await confirm(mcpText(locale(), 'confirm') + '\n' + request.name + '\n' + request.libraryId + '\n' + folder) !== true) throw Error('CANCELLED');
          authorize(event);
          const issued = host.issue({ name: request.name, libraryId: request.libraryId, folderId: request.folderId });
          try {
            await profiles.write(issued); authorize(event);
            const after = context();
            if (after.appUnlocked !== true || after.busy !== false || after.library?.libraryId !== request.libraryId) throw Error('LIBRARY_CHANGED');
            if (request.folderId !== null && !after.library.organization().folders.some(item => item.id === request.folderId)) throw Error('INVALID_INPUT');
            const security = after.library.securityState(); if (security.configured && !security.unlocked) throw Error('NOTEBOOK_LOCKED');
            const args = app.isPackaged ? [] : [app.getAppPath()];
            if (!app.isPackaged && process.env['NOTEBOOKAID_TEST_HOME']) args.push('--mcp-test-home', directory);
            writeMcpPlugin(directory, issued.clientId, process.execPath, args, readFileSync(join(app.getAppPath(), 'LICENSE'), 'utf8'));
            await host.start();
            return { ok: true, value: await state(), createdId: issued.clientId };
          } catch {
            let rollbackFailed = false;
            try { host.rollbackIssue(issued.clientId); } catch { rollbackFailed = true; }
            try { profiles.remove(issued.clientId); } catch { /* Revocation, when successful, is authoritative. */ }
            throw Error(rollbackFailed ? 'ROLLBACK_FAILED' : 'WRITE_FAILED');
          }
        }
        if (typeof request.clientId !== 'string' || !host.list().some(item => item.clientId === request.clientId)) throw Error('INVALID_INPUT');
        if (action === 'revoke') { host.revoke(request.clientId); try { profiles.remove(request.clientId); } catch { /* Revocation is authoritative even when an obsolete encrypted file cannot be removed. */ } }
        else { const error = await shell.openPath(join(directory, 'mcp-plugins', request.clientId)); if (error) throw Error('UNAVAILABLE'); }
        return { ok: true, value: await state() };
      } finally { busy = false; }
    } catch (error) { const code = error instanceof Error && ['APP_LOCKED', 'INVALID_INPUT', 'LIBRARY_CHANGED', 'LIBRARY_IN_USE', 'NOTEBOOK_LOCKED', 'CANCELLED', 'SECURE_STORAGE_UNAVAILABLE', 'WRITE_FAILED', 'ROLLBACK_FAILED', 'UNAVAILABLE'].includes(error.message) ? error.message : 'MCP_SETUP_FAILED'; return { ok: false, code }; }
  });
}
