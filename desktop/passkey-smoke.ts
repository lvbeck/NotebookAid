import type { BrowserWindow } from 'electron';
import { generateKeyPairSync, createHash, randomBytes, sign } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { encodeCBOR } from '@levischuck/tiny-cbor';
import { AppPasskeys, passkeyRpId } from '../core/app-passkeys';

/** Virtual authenticator for isolated self-tests only; it never handles user credentials. */
export async function smokePasskey(window: BrowserWindow, directory: string, gate: AppPasskeys): Promise<void> {
  const run = (script: string) => window.webContents.executeJavaScript(script);
  const until = async (script: string) => { for (let i = 0; i < 150; i++) { if (!window.webContents.isLoadingMainFrame() && await run(script)) return; await new Promise(resolve => setTimeout(resolve, 100)); } throw Error('Passkey UI timeout: ' + script); };
  const b64 = (value: Uint8Array | string) => Buffer.from(value).toString('base64url'), hash = (value: string | Buffer) => createHash('sha256').update(value).digest();
  await until("document.querySelector('app-root')?.dataset.ready==='true'");
  if (window.getTitle() !== 'NotebookAid') throw Error('Unexpected application window title');
  const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' }), jwk = pair.publicKey.export({ format: 'jwk' }), id = randomBytes(32), length = Buffer.alloc(2); length.writeUInt16BE(id.length);
  const publicKey = encodeCBOR(new Map<number, number | Uint8Array>([[1, 2], [3, -7], [-1, 1], [-2, Buffer.from(jwk.x!, 'base64url')], [-3, Buffer.from(jwk.y!, 'base64url')]]));
  const input = gate.begin('create');
  const auth = Buffer.concat([hash(passkeyRpId), Buffer.from([0x45]), Buffer.alloc(4), Buffer.alloc(16), length, id, publicKey]);
  const attestation = encodeCBOR(new Map<string, any>([['fmt', 'none'], ['attStmt', new Map()], ['authData', auth]]));
  await gate.finish({ id: b64(id), rawId: b64(id), type: 'public-key', response: { clientDataJSON: b64(input.clientDataJSON), attestationObject: b64(attestation) }, clientExtensionResults: {} });
  gate.lock(); window.webContents.reload();
  await until("!!document.querySelector('[data-testid=passkey-screen]')");
  if (window.getTitle() !== 'NotebookAid') throw Error('Unexpected locked window title');
  if (await run("!!document.querySelector('.ql-editor')")) throw Error('Editor loaded behind application gate');
  const blocked = await run("window.notebookAid.library.list().then(()=>false,()=>true)"); if (!blocked) throw Error('Locked application IPC allowed note access');
  if (!await run("window.notebookAid.writing.request({action:'prepare',input:{}}).then(()=>false,()=>true)")) throw Error('Locked application allowed writing IPC');
  if(!await run("window.notebookAid.tasks.preview().then(()=>false,()=>true)"))throw Error('Locked application allowed Tasks IPC');
  if(!await run("window.notebookAid.folderBulk.preview(null,false).then(()=>false,()=>true)"))throw Error('Locked application allowed folder bulk IPC');
  if (!await run("window.notebookAid.ai.request({action:'state'}).then(()=>false,()=>true)")) throw Error('Locked application allowed AI access');
  await window.webContents.capturePage().then(image => writeFileSync(join(directory, 'passkey-gate.png'), image.toPNG()));
  // Verify a real P-256 assertion in the main process, not a renderer unlock flag.
  const request = gate.begin('get'), assertion = Buffer.concat([hash(passkeyRpId), Buffer.from([5]), Buffer.from([0, 0, 0, 1])]);
  await gate.finish({ id: b64(id), rawId: b64(id), type: 'public-key', response: { clientDataJSON: b64(request.clientDataJSON), authenticatorData: b64(assertion), signature: b64(sign('sha256', Buffer.concat([assertion, hash(request.clientDataJSON)]), pair.privateKey)), userHandle: request.userId }, clientExtensionResults: {} });
  const blockedNavigation = new Promise<boolean>(resolve => window.webContents.once('will-navigate', event => resolve(event.defaultPrevented)));
  await run("location.assign(location.href + '?untrusted=1')");
  if (!await blockedNavigation) throw Error('Application navigation restriction was relaxed');
  await run('location.reload()'); await until("document.querySelector('app-root')?.dataset.ready==='true'");
  if (!(await run('window.notebookAid.library.list()')).ok) throw Error('Verified Passkey did not restore IPC');
  gate.disable();
  writeFileSync(join(directory, 'passkey-report.json'), JSON.stringify({ applicationGate: true, blockedNoteIpc: true, virtualSignedUnlock: true, rendererReloadAfterUnlock: true, untrustedNavigationBlocked: true, physicalDeviceTested: false }));
}
