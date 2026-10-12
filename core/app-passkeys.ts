import { verifyRegistrationResponse, verifyAuthenticationResponse, type RegistrationResponseJSON, type AuthenticationResponseJSON } from '@simplewebauthn/server';
import { randomBytes, randomUUID } from 'node:crypto';
import { closeSync, existsSync, fsyncSync, lstatSync, openSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const passkeyRpId = 'notebookaid.local';
export const passkeyOrigin = 'https://' + passkeyRpId;
type RecordKey = { id: string; publicKey: string; counter: number };
type State = { version: 1; userId: string; credentials: RecordKey[] };
export class AppPasskeys {
  private state: State;
  private readonly file: string;
  private pending: { challenge: string; action: 'create' | 'get'; expires: number } | null = null;
  private epoch = 0;
  unlocked: boolean;
  constructor(directory: string) {
    this.file = join(directory, 'app-passkeys.json');
    this.state = { version: 1, userId: randomBytes(32).toString('base64url'), credentials: [] };
    if (existsSync(this.file)) {
      if (lstatSync(this.file).isSymbolicLink() || statSync(this.file).size > 65536) throw Error('INVALID_PASSKEY_STATE');
      const state = JSON.parse(readFileSync(this.file, 'utf8')) as State;
      if (state.version !== 1 || typeof state.userId !== 'string' || !/^[\w-]{43}$/.test(state.userId) || !Array.isArray(state.credentials) || state.credentials.length > 10 || state.credentials.some(key => !key || typeof key.id !== 'string' || !/^[\w-]{1,2048}$/.test(key.id) || !/^[\w-]{1,4096}$/.test(key.publicKey) || !Number.isSafeInteger(key.counter) || key.counter < 0)) throw Error('INVALID_PASSKEY_STATE');
      this.state = state;
    }
    this.unlocked = !this.enabled;
  }
  get enabled(): boolean { return this.state.credentials.length > 0; }
  get count(): number { return this.state.credentials.length; }
  private persist(state: State): void {
    const temp = this.file + '.pending-' + randomUUID(), fd = openSync(temp, 'wx');
    try { writeFileSync(fd, JSON.stringify(state)); fsyncSync(fd); } finally { closeSync(fd); }
    renameSync(temp, this.file); this.state = state;
  }
  begin(action: 'create' | 'get'): { rpId: string; userId: string; clientDataJSON: string } {
    if (action === 'create' && (!this.unlocked || this.count >= 10)) throw Error('APP_LOCKED');
    this.epoch++;
    const challenge = randomBytes(32).toString('base64url'); this.pending = { action, challenge, expires: Date.now() + 130000 };
    return { rpId: passkeyRpId, userId: this.state.userId, clientDataJSON: JSON.stringify({ type: action === 'create' ? 'webauthn.create' : 'webauthn.get', challenge, origin: passkeyOrigin, crossOrigin: false }) };
  }
  cancel(): void { this.epoch++; this.pending = null; }
  lock(): void { this.cancel(); this.unlocked = !this.enabled; }
  async finish(response: RegistrationResponseJSON | AuthenticationResponseJSON): Promise<void> {
    const pending = this.pending, epoch = this.epoch; this.pending = null;
    if (!pending || pending.expires < Date.now()) throw Error('PASSKEY_EXPIRED');
    if (pending.action === 'create') {
      const result = await verifyRegistrationResponse({ response: response as RegistrationResponseJSON, expectedChallenge: pending.challenge, expectedOrigin: passkeyOrigin, expectedRPID: passkeyRpId, requireUserVerification: true, supportedAlgorithmIDs: [-7] });
      if (!result.verified || epoch !== this.epoch) throw Error('PASSKEY_FAILED');
      const credential = result.registrationInfo.credential;
      if (this.state.credentials.some(key => key.id === credential.id)) throw Error('DUPLICATE_PASSKEY');
      this.persist({ ...this.state, credentials: [...this.state.credentials, { id: credential.id, publicKey: Buffer.from(credential.publicKey).toString('base64url'), counter: credential.counter }] });
    } else {
      const record = this.state.credentials.find(key => key.id === response.id);
      const assertion = response as AuthenticationResponseJSON;
      if (!record || assertion.response.userHandle !== this.state.userId) throw Error('UNKNOWN_PASSKEY');
      const result = await verifyAuthenticationResponse({ response: assertion, expectedChallenge: pending.challenge, expectedOrigin: passkeyOrigin, expectedRPID: passkeyRpId, requireUserVerification: true, credential: { id: record.id, publicKey: Buffer.from(record.publicKey, 'base64url'), counter: record.counter } });
      if (!result.verified || epoch !== this.epoch) throw Error('PASSKEY_FAILED');
      this.persist({ ...this.state, credentials: this.state.credentials.map(key => key.id === record.id ? { ...key, counter: result.authenticationInfo.newCounter } : key) });
      this.unlocked = true;
    }
  }
  disable(): void { if (!this.unlocked) throw Error('APP_LOCKED'); this.persist({ ...this.state, credentials: [] }); this.unlocked = true; }
}
