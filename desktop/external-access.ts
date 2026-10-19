import { ExternalClients } from '../core/external-clients';
import { ExternalBackground } from '../core/external-background';
import type { ExternalNoteContext } from '../core/external-notes';
import { startExternalEndpoint } from './external-endpoint';

/** Only trusted owner setup code can manage grants; no management method is exposed over MCP. */
export async function externalAccessHost(directory: string, context: () => ExternalNoteContext, unlock?: (signal: AbortSignal) => Promise<void>) {
  const clients = new ExternalClients(directory);
  const service = new ExternalBackground(clients, context, unlock);
  let endpoint: Awaited<ReturnType<typeof startExternalEndpoint>> | undefined;
  let starting: Promise<void> | undefined, closed = false;
  const owner = () => { if (closed) throw Error('BACKGROUND_UNAVAILABLE'); const state = context(); if (state.appUnlocked !== true) throw Error('APP_LOCKED'); return state; };
  const host = {
    list() { owner(); return clients.list(); },
    issue(value: unknown) {
      const state = owner(); if (state.busy !== false) throw Error('LIBRARY_IN_USE'); if (!state.library) throw Error('BACKGROUND_UNAVAILABLE');
      const input = value as Record<string, unknown> | null;
      if (!input || input.libraryId !== state.library.libraryId) throw Error('LIBRARY_CHANGED');
      if (input.folderId !== null && !state.library.organization().folders.some(folder => folder.id === input.folderId)) throw Error('INVALID_INPUT');
      const security = state.library.securityState(); if (security.configured && !security.unlocked) throw Error('NOTEBOOK_LOCKED');
      return clients.issue(value);
    },
    revoke(clientId: string) { owner(); return clients.revoke(clientId); },
    rollbackIssue(clientId: string) { return clients.revoke(clientId); },
    async start() {
      if (closed) throw Error('BACKGROUND_UNAVAILABLE');
      if (endpoint || !clients.list().length) return;
      if (!starting) starting = startExternalEndpoint(directory, (value, lifetime) => service.request(value, lifetime)).then(value => { if (closed) value.close(); else endpoint = value; }).finally(() => { starting = undefined; });
      await starting;
    },
    close() { closed = true; service.close(); endpoint?.close(); endpoint = undefined; }
  };
  await host.start(); return host;
}
