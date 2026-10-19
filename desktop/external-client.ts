import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createConnection } from 'node:net';
import { plainPath } from '../core/library-import';
import { bridgeEndpoint } from './bridge-endpoint';
import { encodeExternalFrame, ExternalFrameDecoder } from './external-framing';
import { externalAuthenticationTimeoutMs, type ExternalClientCredential, type ExternalAccessResult } from '../shared/external-access';
import type { ExternalCreateRequest, ExternalCreateResult } from '../shared/external-notes';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const errors = new Set(['TARGET_NOT_EMPTY', 'PATH_OVERLAP', 'PATH_LINKED', 'RESTORE_TARGET_INVALID', 'RESTORE_FAILED_ROLLED_BACK', 'RESTORE_ROLLBACK_FAILED', 'RESTORE_INTERRUPTED', 'DISK_FULL', 'ACCESS_DENIED', 'PASSWORD_POLICY', 'BAD_CREDENTIAL', 'NOTEBOOK_LOCKED', 'ENCRYPTED_NOTES_REMAIN', 'INVALID_INPUT', 'WRITE_FAILED', 'INTEGRITY_CHECK_FAILED', 'VERSION_CONFLICT', 'SESSION_EXPIRED', 'NOTE_IN_USE', 'LIBRARY_IN_USE', 'NOT_FOUND_OR_UNAVAILABLE', 'COMMIT_STATUS_UNKNOWN', 'DUPLICATE_LIBRARY', 'LIBRARY_ID_MISMATCH', 'REGISTRY_INVALID', 'UNSUPPORTED_LIBRARY', 'CURRENT_LIBRARY', 'INVALID_DELTA', 'UNSUPPORTED_DELTA', 'CANCELLED', 'APP_LOCKED', 'BACKGROUND_UNAVAILABLE', 'LIBRARY_CHANGED']);
for (const code of ['PASSKEY_CANCELLED', 'PASSKEY_TIMEOUT', 'PASSKEY_UNAVAILABLE', 'PASSKEY_BUSY']) errors.add(code);
function receipt(value: unknown, params: ExternalCreateRequest): ExternalCreateResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error();
  const result = value as Record<string, unknown>;
  if (result.ok === false && Object.keys(result).length === 2 && typeof result.code === 'string' && errors.has(result.code)) return result as unknown as ExternalCreateResult;
  const item = result.value as Record<string, unknown> | null;
  if (result.ok !== true || Object.keys(result).length !== 2 || !item || typeof item !== 'object' || Array.isArray(item) ||
    Object.keys(item).length !== 8 || Object.keys(item).some(key => !['libraryId', 'requestId', 'noteId', 'folderId', 'format', 'version', 'saved', 'indexed'].includes(key)) ||
    item.libraryId !== params.libraryId || item.requestId !== params.requestId || typeof item.noteId !== 'string' || !uuid.test(item.noteId) ||
    item.folderId !== null && (typeof item.folderId !== 'string' || !uuid.test(item.folderId)) ||
    params.folderId !== undefined && item.folderId !== params.folderId || item.format !== (params.format ?? 'text') ||
    !Number.isSafeInteger(item.version) || (item.version as number) < 1 || item.saved !== true || typeof item.indexed !== 'boolean') throw Error();
  return result as unknown as ExternalCreateResult;
}

async function exchange(directory: string, credential: ExternalClientCredential, params: ExternalCreateRequest, unlock: boolean, signal?: AbortSignal): Promise<ExternalAccessResult> {
  if (signal?.aborted) return { ok: false, code: 'CANCELLED' };
  let address: string;
  try {
    const file = join(directory, 'external-runtime.json'); plainPath(file);
    if (!existsSync(file) || !lstatSync(file).isFile() || lstatSync(file).size > 4096) throw Error('DESCRIPTOR_FILE');
    const runtime = JSON.parse(readFileSync(file, 'utf8'));
    const expected = bridgeEndpoint(join(directory, 'external-notes')).address;
    if (runtime.protocolVersion !== 1 || runtime.address !== expected || !Number.isSafeInteger(runtime.pid) || runtime.pid < 1) throw Error('DESCRIPTOR_FIELDS');
    address = expected;
  } catch { return { ok: false, code: 'BACKGROUND_UNAVAILABLE' }; }
  let frame: Buffer;
  try { frame = encodeExternalFrame({ protocolVersion: 1, method: unlock ? 'unlock' : 'create', clientId: credential.clientId, token: credential.token, params }); }
  catch { return { ok: false, code: 'INVALID_INPUT' }; }
  return new Promise(resolve => {
    const socket = createConnection(address), decoder = new ExternalFrameDecoder(); let finished = false, sent = false;
    const unavailable = (): ExternalAccessResult => ({ ok: false, code: sent && !unlock ? 'COMMIT_STATUS_UNKNOWN' : 'BACKGROUND_UNAVAILABLE' });
    const timer = setTimeout(() => finish({ ok: false, code: unlock ? 'PASSKEY_TIMEOUT' : sent ? 'COMMIT_STATUS_UNKNOWN' : 'BACKGROUND_UNAVAILABLE' }), unlock ? externalAuthenticationTimeoutMs + 5000 : 15000);
    const abort = () => finish({ ok: false, code: unlock ? 'PASSKEY_CANCELLED' : sent ? 'COMMIT_STATUS_UNKNOWN' : 'CANCELLED' });
    function finish(result: ExternalAccessResult) { if (finished) return; finished = true; clearTimeout(timer); signal?.removeEventListener('abort', abort); socket.destroy(); resolve(result); }
    signal?.addEventListener('abort', abort, { once: true });
    socket.on('error', () => finish(unavailable()));
    socket.on('end', () => finish(unavailable()));
    socket.on('connect', () => { sent = true; socket.write(frame); });
    socket.on('data', chunk => {
      try {
        const result = decoder.push(chunk);
        if (result !== undefined) {
          if (unlock && result && typeof result === 'object' && Object.keys(result).length === 2 && (result as any).ok === true && (result as any).unlocked === true) finish({ ok: true, unlocked: true });
          else { const parsed = receipt(result, params); if (unlock && parsed.ok) throw Error(); finish(parsed); }
        }
      } catch { finish(unavailable()); }
    });
  });
}

export async function externalCreate(directory: string, credential: ExternalClientCredential, params: ExternalCreateRequest): Promise<ExternalCreateResult> {
  return await exchange(directory, credential, params, false) as ExternalCreateResult;
}
export async function externalCreateWithUnlock(directory: string, credential: ExternalClientCredential, params: ExternalCreateRequest, signal?: AbortSignal): Promise<ExternalCreateResult> {
  const result = await exchange(directory, credential, params, false, signal) as ExternalCreateResult;
  if (result.ok || result.code !== 'APP_LOCKED') return result;
  const authentication = await exchange(directory, credential, params, true, signal);
  if (!authentication.ok) return authentication;
  return await exchange(directory, credential, params, false, signal) as ExternalCreateResult;
}
