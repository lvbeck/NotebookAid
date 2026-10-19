const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const { generateKeyPairSync, createHash, randomBytes, sign } = require('node:crypto');
const { encodeCBOR } = require('@levischuck/tiny-cbor');
const { passkeyRpId } = require('../dist/runtime/core/app-passkeys.js');
const hash = bytes => createHash('sha256').update(bytes).digest(), b64 = bytes => Buffer.from(bytes).toString('base64url');
async function fixture() {
  const root = path.resolve('output/passkey-background-tests'); fs.mkdirSync(root, { recursive: true }); const directory = fs.mkdtempSync(path.join(root, 'case-'));
  const windows = [], calls = []; let mode = 'success', counter = 0;
  const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' }), jwk = pair.publicKey.export({ format: 'jwk' }), id = randomBytes(32);
  class Owner {
    constructor(options) { this.options = options; this.destroyed = false; windows.push(this); }
    getNativeWindowHandle() { const bytes = Buffer.alloc(8); bytes.writeBigUInt64LE(123n); return bytes; }
    isDestroyed() { return this.destroyed; }
    destroy() { this.destroyed = true; }
  }
  function spawn(executable, args, options) {
    const child = new EventEmitter(); child.stdin = new PassThrough(); child.stdout = new PassThrough(); child.stderr = new PassThrough(); let json = '', killed = false;
    child.kill = () => { killed = true; queueMicrotask(() => child.emit('close', 1)); };
    child.stdin.on('data', chunk => { json += chunk.toString(); });
    child.stdin.on('finish', () => queueMicrotask(() => {
      const input = JSON.parse(json); calls.push({ input, options });
      if (mode === 'hang' || killed) return;
      let response;
      if (mode === 'cancel') response = { error: '0x800704C7' };
      else if (mode === 'unsupported') response = { error: 'UNSUPPORTED' };
      else {
        const count = Buffer.alloc(4); count.writeUInt32BE(++counter);
        const auth = Buffer.concat([hash(passkeyRpId), Buffer.from([5]), count]);
        response = { id: b64(id), rawId: b64(id), type: 'public-key', response: { clientDataJSON: b64(input.clientDataJSON), authenticatorData: b64(auth), signature: b64(mode === 'forged' ? randomBytes(64) : sign('sha256', Buffer.concat([auth, hash(input.clientDataJSON)]), pair.privateKey)), userHandle: input.userId }, clientExtensionResults: {} };
      }
      child.stdout.write(JSON.stringify(response)); child.emit('close', 0);
    }));
    return child;
  }
  const filename = path.resolve('dist/runtime/desktop/passkeys.js'), loaded = new Module(filename, module); loaded.filename = filename; loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = loaded.require.bind(loaded);
  loaded.require = name => name === 'electron' ? { app: { isPackaged: false, getAppPath: () => process.cwd() }, BrowserWindow: Owner } : name === 'node:child_process' ? { spawn } : original(name);
  loaded._compile(fs.readFileSync(filename, 'utf8'), filename);
  const client = loaded.exports.passkeyClient(directory), gate = client.gate;
  const cose = encodeCBOR(new Map([[1, 2], [3, -7], [-1, 1], [-2, Buffer.from(jwk.x, 'base64url')], [-3, Buffer.from(jwk.y, 'base64url')]]));
  const length = Buffer.alloc(2); length.writeUInt16BE(id.length); const input = gate.begin('create');
  const auth = Buffer.concat([hash(passkeyRpId), Buffer.from([0x45]), Buffer.alloc(4), Buffer.alloc(16), length, id, cose]);
  await gate.finish({ id: b64(id), rawId: b64(id), type: 'public-key', response: { clientDataJSON: b64(input.clientDataJSON), attestationObject: b64(encodeCBOR(new Map([['fmt', 'none'], ['attStmt', new Map()], ['authData', auth]]))) }, clientExtensionResults: {} }); gate.lock();
  return { client, gate, windows, calls, mode: value => { mode = value; } };
}
test('background Passkey uses an empty hidden native owner and a verified assertion', { skip: process.platform !== 'win32' }, async () => {
  const f = await fixture(); await f.client.unlockBackground(new AbortController().signal);
  assert.equal(f.gate.unlocked, true); assert.equal(f.windows.length, 1); assert.equal(f.windows[0].options.show, false); assert.equal(f.windows[0].options.webPreferences.nodeIntegration, false); assert.equal(f.windows[0].destroyed, true);
  assert.equal(f.calls[0].input.action, 'get'); assert.equal(f.calls[0].input.window, '123'); assert.equal(f.calls[0].options.windowsHide, true);
  assert.equal(JSON.parse(f.calls[0].input.clientDataJSON).type, 'webauthn.get');
  await f.client.unlockBackground(new AbortController().signal); assert.equal(f.calls.length, 1);
});
test('background cancellation, unavailable helper and forged assertions leave the gate locked', { skip: process.platform !== 'win32' }, async () => {
  for (const mode of ['cancel', 'unsupported', 'forged']) {
    const f = await fixture(); f.mode(mode);
    await assert.rejects(f.client.unlockBackground(new AbortController().signal));
    assert.equal(f.gate.unlocked, false); assert.equal(f.windows[0].destroyed, true);
  }
});
test('background abort kills only its own helper and prevents a second native prompt', { skip: process.platform !== 'win32' }, async () => {
  const f = await fixture(); f.mode('hang'); const controller = new AbortController();
  const pending = f.client.unlockBackground(controller.signal); await new Promise(resolve => setImmediate(resolve));
  await assert.rejects(f.client.unlockBackground(new AbortController().signal), { message: 'PASSKEY_BUSY' }); assert.equal(f.windows.length, 1);
  controller.abort(); await assert.rejects(pending); assert.equal(f.gate.unlocked, false); assert.equal(f.windows[0].destroyed, true);
});
test('native authentication deadline closes its helper and leaves the app locked', { skip: process.platform !== 'win32' }, async t => {
  const f = await fixture(); f.mode('hang');
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const pending = f.client.unlockBackground(new AbortController().signal);
  const rejected = assert.rejects(pending, { message: 'PASSKEY_TIMEOUT' });
  t.mock.timers.tick(135000); await rejected;
  assert.equal(f.gate.unlocked, false); assert.equal(f.windows[0].destroyed, true);
});
