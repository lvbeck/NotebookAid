import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { plainPath } from './library-import';
import { renameWithRetry } from './file-rename';
import type { ExternalClientInfo, IssuedExternalClient } from '../shared/external-access';
import type { ExternalCreateBinding } from '../shared/external-notes';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
interface ClientRecord extends ExternalClientInfo { tokenHash: string; }
interface ClientState { version: 1; clients: ClientRecord[]; }
export class ExternalAccessError extends Error {
  constructor(readonly code: 'INVALID_INPUT' | 'AUTH_STATE_INVALID' | 'WRITE_FAILED') { super(code); }
}
function validBinding(value: Record<string, unknown>): boolean {
  return typeof value.libraryId === 'string' && uuid.test(value.libraryId) &&
    (value.folderId === null || typeof value.folderId === 'string' && uuid.test(value.folderId));
}
function validName(value: unknown): value is string {
  return typeof value === 'string' && !!value.trim() && value.length <= 80 && !/[\x00-\x1f\x7f\uD800-\uDFFF]/u.test(value);
}

/** Owned by the running host; only authenticated owner code may issue or revoke clients. */
export class ExternalClients {
  private readonly directory: string;
  private readonly file: string;
  constructor(directory: string, private readonly beforeReplace?: () => void) {
    this.directory = resolve(directory); this.file = join(this.directory, 'external-clients.json'); this.load();
  }
  private load(): ClientState {
    try {
      plainPath(this.file);
      if (!existsSync(this.file)) return { version: 1, clients: [] };
      const stat = lstatSync(this.file);
      if (!stat.isFile() || stat.size > 128 * 1024) throw Error();
      const state = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(this.file)));
      if (!state || Object.keys(state).some(key => !['version', 'clients'].includes(key)) || state.version !== 1 || !Array.isArray(state.clients) || state.clients.length > 32) throw Error();
      const ids = new Set<string>();
      for (const client of state.clients) {
        if (!client || typeof client !== 'object' || Array.isArray(client) ||
          Object.keys(client).some(key => !['clientId', 'name', 'libraryId', 'folderId', 'createdAt', 'tokenHash'].includes(key)) ||
          typeof client.clientId !== 'string' || !uuid.test(client.clientId) || ids.has(client.clientId) ||
          !validName(client.name) || !validBinding(client) || typeof client.tokenHash !== 'string' || !/^[a-f0-9]{64}$/.test(client.tokenHash) ||
          typeof client.createdAt !== 'string' || !Number.isFinite(Date.parse(client.createdAt))) throw Error();
        ids.add(client.clientId);
      }
      return state;
    } catch { throw new ExternalAccessError('AUTH_STATE_INVALID'); }
  }
  private persist(state: ClientState): void {
    const temporary = join(this.directory, '.pending-external-' + randomUUID());
    try {
      plainPath(this.file); mkdirSync(this.directory, { recursive: true, mode: 0o700 });
      const fd = openSync(temporary, 'wx', 0o600);
      try { writeFileSync(fd, JSON.stringify(state)); fsyncSync(fd); } finally { closeSync(fd); }
      this.beforeReplace?.(); renameWithRetry(temporary, this.file);
    } catch { throw new ExternalAccessError('WRITE_FAILED'); }
    finally { try { if (existsSync(temporary)) unlinkSync(temporary); } catch { /* Keep authorization failures fail-closed. */ } }
  }
  list(): ExternalClientInfo[] {
    return this.load().clients.map(({ tokenHash: _hash, ...client }) => ({ ...client }));
  }
  issue(value: unknown): IssuedExternalClient {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ExternalAccessError('INVALID_INPUT');
    const input = value as Record<string, unknown>;
    if (Object.keys(input).some(key => !['name', 'libraryId', 'folderId'].includes(key)) || !validName(input.name) || !validBinding(input)) throw new ExternalAccessError('INVALID_INPUT');
    const state = this.load();
    if (state.clients.length >= 32) throw new ExternalAccessError('INVALID_INPUT');
    const bytes = randomBytes(32), token = bytes.toString('base64url'); bytes.fill(0);
    const client: ExternalClientInfo = { clientId: randomUUID(), name: input.name, libraryId: input.libraryId as string, folderId: input.folderId as string | null, createdAt: new Date().toISOString() };
    this.persist({ version: 1, clients: [...state.clients, { ...client, tokenHash: createHash('sha256').update(token).digest('hex') }] });
    return { clientId: client.clientId, token, client };
  }
  revoke(clientId: string): boolean {
    if (typeof clientId !== 'string' || !uuid.test(clientId)) throw new ExternalAccessError('INVALID_INPUT');
    const state = this.load(), clients = state.clients.filter(client => client.clientId !== clientId);
    if (clients.length === state.clients.length) return false;
    this.persist({ version: 1, clients }); return true;
  }
  authenticate(clientId: unknown, token: unknown): ExternalCreateBinding | null {
    if (typeof clientId !== 'string' || !uuid.test(clientId) || typeof token !== 'string' || !/^[\w-]{43}$/.test(token)) return null;
    const client = this.load().clients.find(item => item.clientId === clientId);
    const actual = createHash('sha256').update(token).digest(), expected = client ? Buffer.from(client.tokenHash, 'hex') : Buffer.alloc(32);
    const accepted = timingSafeEqual(actual, expected);
    return accepted && client ? { libraryId: client.libraryId, folderId: client.folderId } : null;
  }
}
