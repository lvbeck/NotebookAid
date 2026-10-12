const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { randomBytes, generateKeyPairSync, createHash, sign } = require('node:crypto');
const { encodeCBOR } = require('@levischuck/tiny-cbor');
const { AppPasskeys, passkeyRpId } = require('../dist/runtime/core/app-passkeys');
const b64 = bytes => Buffer.from(bytes).toString('base64url');
const hash = bytes => createHash('sha256').update(bytes).digest();
function fixture() {
  fs.mkdirSync('output/passkey-tests', { recursive: true });
  const root = fs.mkdtempSync(path.resolve('output/passkey-tests/case-'));
  const keys = generateKeyPairSync('ec', { namedCurve: 'prime256v1' }), publicKey = keys.publicKey.export({ format: 'jwk' }), id = randomBytes(32);
  const cose = Buffer.from(encodeCBOR(new Map([[1, 2], [3, -7], [-1, 1], [-2, Buffer.from(publicKey.x, 'base64url')], [-3, Buffer.from(publicKey.y, 'base64url')]])));
  const gate = new AppPasskeys(root);
  const registration = (input, flags = 0x45) => {
    const length = Buffer.alloc(2); length.writeUInt16BE(id.length);
    const auth = Buffer.concat([hash(passkeyRpId), Buffer.from([flags]), Buffer.alloc(4), Buffer.alloc(16), length, id, cose]);
    return { id: b64(id), rawId: b64(id), type: 'public-key', response: { clientDataJSON: b64(input.clientDataJSON), attestationObject: b64(encodeCBOR(new Map([['fmt', 'none'], ['attStmt', new Map()], ['authData', auth]]))) }, clientExtensionResults: {} };
  };
  const assertion = (input, count = 1, flags = 5, rp = passkeyRpId) => {
    const counter = Buffer.alloc(4); counter.writeUInt32BE(count);
    const auth = Buffer.concat([hash(rp), Buffer.from([flags]), counter]);
    return { id: b64(id), rawId: b64(id), type: 'public-key', response: { clientDataJSON: b64(input.clientDataJSON), authenticatorData: b64(auth), signature: b64(sign('sha256', Buffer.concat([auth, hash(input.clientDataJSON)]), keys.privateKey)), userHandle: input.userId }, clientExtensionResults: {} };
  };
  return { root, gate, registration, assertion };
}
test('Passkey registration, restart gate, signed unlock, counter and explicit disable', async () => {
  const f = fixture();
  await f.gate.finish(f.registration(f.gate.begin('create')));
  const gate = new AppPasskeys(f.root); assert.equal(gate.unlocked, false);
  const response = f.assertion(gate.begin('get')); await gate.finish(response); assert.equal(gate.unlocked, true);
  gate.lock(); await assert.rejects(gate.finish(response)); assert.equal(gate.unlocked, false);
  await assert.rejects(gate.finish(f.assertion(gate.begin('get'), 1))); assert.equal(gate.unlocked, false);
  await gate.finish(f.assertion(gate.begin('get'), 2)); gate.disable(); assert.equal(new AppPasskeys(f.root).enabled, false);
  assert.equal(fs.readFileSync(path.join(f.root, 'app-passkeys.json'), 'utf8').includes('PRIVATE'), false);
});
test('Passkey rejects missing user verification, wrong origin/RP/user and forged signatures', async () => {
  const f = fixture(); await assert.rejects(f.gate.finish(f.registration(f.gate.begin('create'), 0x41))); assert.equal(f.gate.enabled, false);
  await f.gate.finish(f.registration(f.gate.begin('create'))); f.gate.lock();
  for (const mutate of [
    (r) => { r.response.signature = b64(randomBytes(64)); },
    (r) => { r.response.userHandle = b64(randomBytes(32)); },
    (r) => { const json = JSON.parse(Buffer.from(r.response.clientDataJSON, 'base64url')); json.origin = 'https://evil.test'; r.response.clientDataJSON = b64(JSON.stringify(json)); }
  ]) { const response = f.assertion(f.gate.begin('get')); mutate(response); await assert.rejects(f.gate.finish(response)); assert.equal(f.gate.unlocked, false); }
  await assert.rejects(f.gate.finish(f.assertion(f.gate.begin('get'), 1, 1)));
  await assert.rejects(f.gate.finish(f.assertion(f.gate.begin('get'), 1, 5, 'other.test')));
  assert.equal(f.gate.unlocked, false);
});
test('locking invalidates a signature verification already in progress', async () => {
  const f = fixture(); await f.gate.finish(f.registration(f.gate.begin('create'))); f.gate.lock();
  const promise = f.gate.finish(f.assertion(f.gate.begin('get'))); f.gate.lock(); await assert.rejects(promise); assert.equal(f.gate.unlocked, false);
});
