import { BrowserWindow } from 'electron';
import { generateKeyPairSync, createHash, randomBytes, sign } from 'node:crypto';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { encodeCBOR } from '@levischuck/tiny-cbor';
import { AppPasskeys, passkeyRpId } from '../core/app-passkeys';
import type { ExternalNoteContext } from '../core/external-notes';
import { externalAccessHost } from './external-access';
import { assertProbeHome } from './mcp-probe';

/** Isolated virtual authenticator; no system credential or native UI is used. */
export async function startExternalBackgroundSmoke(workspace: string, directory: string, context: () => ExternalNoteContext, gate: AppPasskeys, stop: () => void) {
  assertProbeHome(workspace, directory);
  if (gate.enabled) throw Error('FRESH_PASSKEY_FIXTURE_REQUIRED');
  let mode = 'success', delay = 0, prompts = 0, busy = false, counter = 0;
  const b64 = (value: Uint8Array | string) => Buffer.from(value).toString('base64url');
  const hash = (value: string | Buffer) => createHash('sha256').update(value).digest();
  const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' }), jwk = pair.publicKey.export({ format: 'jwk' }), id = randomBytes(32);
  const host = await externalAccessHost(directory, () => { const state = context(); return { ...state, busy: busy || state.busy }; }, async signal => {
    prompts++;
    try {
      await new Promise<void>((resolve, reject) => {
        const abort = () => { clearTimeout(timer); reject(Error('PASSKEY_CANCELLED')); };
        const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, delay);
        signal.addEventListener('abort', abort, { once: true }); if (signal.aborted) abort();
      });
      if (mode !== 'success') throw Error(mode === 'timeout' ? 'PASSKEY_TIMEOUT' : 'PASSKEY_CANCELLED');
      const input = gate.begin('get'), count = Buffer.alloc(4); count.writeUInt32BE(++counter);
      const auth = Buffer.concat([hash(passkeyRpId), Buffer.from([5]), count]);
      await gate.finish({ id: b64(id), rawId: b64(id), type: 'public-key', response: { clientDataJSON: b64(input.clientDataJSON), authenticatorData: b64(auth), signature: b64(sign('sha256', Buffer.concat([auth, hash(input.clientDataJSON)]), pair.privateKey)), userHandle: input.userId }, clientExtensionResults: {} });
    } catch (error) { gate.lock(); throw error; }
  });
  const library = context().library!;
  const credentials = [host.issue({ name: 'Synthetic background client', libraryId: library.libraryId, folderId: null }), host.issue({ name: 'Synthetic Codex background', libraryId: library.libraryId, folderId: null })];
  await host.start();
  const input = gate.begin('create'), length = Buffer.alloc(2); length.writeUInt16BE(id.length);
  const cose = encodeCBOR(new Map<number, number | Uint8Array>([[1, 2], [3, -7], [-1, 1], [-2, Buffer.from(jwk.x!, 'base64url')], [-3, Buffer.from(jwk.y!, 'base64url')]]));
  const auth = Buffer.concat([hash(passkeyRpId), Buffer.from([0x45]), Buffer.alloc(4), Buffer.alloc(16), length, id, cose]);
  await gate.finish({ id: b64(id), rawId: b64(id), type: 'public-key', response: { clientDataJSON: b64(input.clientDataJSON), attestationObject: b64(encodeCBOR(new Map<string, any>([['fmt', 'none'], ['attStmt', new Map()], ['authData', auth]]))) }, clientExtensionResults: {} });
  gate.lock();
  process.stdout.write(JSON.stringify({ type: 'external-background-ready', credentials, windowCount: BrowserWindow.getAllWindows().length }) + '\n');
  const commandFile = join(directory, 'external-test-command.json');
  const timer = setInterval(() => {
    if (!existsSync(commandFile)) return;
    let requestId: unknown;
    try {
      const command = JSON.parse(readFileSync(commandFile, 'utf8')); unlinkSync(commandFile); requestId = command.id;
      if (command.action === 'mode') { mode = command.mode; delay = command.delay; }
      else if (command.action === 'lock') gate.lock();
      else if (command.action === 'busy') busy = command.busy;
      else if (command.action === 'revoke') host.revoke(command.clientId);
      else if (command.action === 'status') { /* Publish only synthetic counters below. */ }
      else if (command.action === 'stop') { clearInterval(timer); host.close(); stop(); return; }
      else throw Error();
      writeFileSync(join(directory, 'external-test-result.json'), JSON.stringify({ id: requestId, ok: true, unlocked: gate.unlocked, prompts, windowCount: BrowserWindow.getAllWindows().length }));
    } catch { writeFileSync(join(directory, 'external-test-result.json'), JSON.stringify({ id: requestId, ok: false })); }
  }, 25);
}
