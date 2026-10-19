import { ExternalAccessService } from './external-access';
import { ExternalClients } from './external-clients';
import { LibraryError } from './library';
import { parseExternalCreateRequest, type ExternalNoteContext } from './external-notes';
import type { ExternalAccessResult, ExternalUnlockResult } from '../shared/external-access';

export interface ExternalRequestLifetime { signal: AbortSignal; authenticationWaiting(): void; }
interface AuthenticationSession { controller: AbortController; waiters: Set<symbol>; result: Promise<ExternalUnlockResult>; }

/** Authentication never creates a note; callers must retry the original create afterward. */
export class ExternalBackground {
  private readonly service: ExternalAccessService;
  private session: AuthenticationSession | undefined;
  private closed = false;
  private readonly failures = new Map<string, { until: number; result: ExternalUnlockResult }>();
  constructor(private readonly clients: ExternalClients, private readonly context: () => ExternalNoteContext, private readonly unlock?: (signal: AbortSignal) => Promise<void>) {
    this.service = new ExternalAccessService(clients, context);
  }
  close(): void { this.closed = true; this.session?.controller.abort(); }
  async request(value: unknown, lifetime: ExternalRequestLifetime): Promise<ExternalAccessResult> {
    if (this.closed || lifetime.signal.aborted) return { ok: false, code: 'BACKGROUND_UNAVAILABLE' };
    const input = value as Record<string, unknown> | null;
    if (!input || typeof input !== 'object' || Array.isArray(input) || input.method !== 'unlock') return this.service.request(value);
    try {
      if (input.protocolVersion !== 1 || Object.keys(input).some(key => !['protocolVersion', 'method', 'clientId', 'token', 'params'].includes(key))) return { ok: false, code: 'ACCESS_DENIED' };
      const binding = this.clients.authenticate(input.clientId, input.token);
      if (!binding) return { ok: false, code: 'ACCESS_DENIED' };
      const params = parseExternalCreateRequest(input.params);
      if (params.libraryId !== binding.libraryId) return { ok: false, code: 'LIBRARY_CHANGED' };
      if (params.folderId !== undefined && params.folderId !== binding.folderId) return { ok: false, code: 'ACCESS_DENIED' };
      const state = this.context();
      if (state.busy !== false) return { ok: false, code: 'LIBRARY_IN_USE' };
      if (state.appUnlocked !== true) {
        const key = input.clientId + ':' + params.requestId;
        const previous = this.failures.get(key);
        if (previous && previous.until > Date.now()) return previous.result;
        if (!this.unlock) return { ok: false, code: 'PASSKEY_UNAVAILABLE' };
        lifetime.authenticationWaiting();
        const result = await this.wait(lifetime.signal);
        if (!result.ok) {
          if (this.failures.size >= 128) this.failures.delete(this.failures.keys().next().value!);
          this.failures.set(key, { until: Date.now() + 10 * 60 * 1000, result });
          return result;
        }
      }
      if (this.closed || lifetime.signal.aborted) return { ok: false, code: 'BACKGROUND_UNAVAILABLE' };
      const current = this.clients.authenticate(input.clientId, input.token);
      if (!current || current.libraryId !== binding.libraryId || current.folderId !== binding.folderId) return { ok: false, code: 'ACCESS_DENIED' };
      const after = this.context();
      if (after.appUnlocked !== true) return { ok: false, code: 'APP_LOCKED' };
      if (after.busy !== false) return { ok: false, code: 'LIBRARY_IN_USE' };
      if (!after.library) return { ok: false, code: 'BACKGROUND_UNAVAILABLE' };
      if (after.library.libraryId !== binding.libraryId) return { ok: false, code: 'LIBRARY_CHANGED' };
      if (binding.folderId !== null && !after.library.organization().folders.some(folder => folder.id === binding.folderId)) return { ok: false, code: 'INVALID_INPUT' };
      const security = after.library.securityState();
      if (security.configured && !security.unlocked) return { ok: false, code: 'NOTEBOOK_LOCKED' };
      return { ok: true, unlocked: true };
    } catch (error) { return { ok: false, code: error instanceof LibraryError ? error.code : 'ACCESS_DENIED' }; }
  }
  private async wait(signal: AbortSignal): Promise<ExternalUnlockResult> {
    if (!this.session) {
      const controller = new AbortController();
      const session: AuthenticationSession = { controller, waiters: new Set(), result: Promise.resolve({ ok: false, code: 'APP_LOCKED' }) };
      session.result = Promise.resolve().then(() => this.unlock!(controller.signal)).then<ExternalUnlockResult, ExternalUnlockResult>(() => ({ ok: true, unlocked: true }), error => {
        const message = error instanceof Error ? error.message : '';
        const code = message === 'PASSKEY_TIMEOUT' ? 'PASSKEY_TIMEOUT' : message === 'PASSKEY_UNAVAILABLE' ? 'PASSKEY_UNAVAILABLE' : message === 'PASSKEY_BUSY' ? 'PASSKEY_BUSY' : 'PASSKEY_CANCELLED';
        return { ok: false, code };
      }).finally(() => { if (this.session === session) this.session = undefined; });
      this.session = session;
    }
    const session = this.session, id = Symbol(); session.waiters.add(id);
    let abort: () => void = () => {};
    try {
      return await Promise.race([session.result, new Promise<ExternalUnlockResult>(resolve => {
        abort = () => resolve({ ok: false, code: 'PASSKEY_CANCELLED' });
        signal.addEventListener('abort', abort, { once: true }); if (signal.aborted) abort();
      })]);
    } finally {
      signal.removeEventListener('abort', abort); session.waiters.delete(id);
      if (!session.waiters.size) session.controller.abort();
    }
  }
}
