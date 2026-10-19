const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { randomUUID } = require('node:crypto');
const { once } = require('node:events');
const { ExternalClients } = require('../dist/runtime/core/external-clients.js');
const { ExternalAccessService } = require('../dist/runtime/core/external-access.js');
const { NoteLibrary } = require('../dist/runtime/core/library.js');
const { externalAccessHost } = require('../dist/runtime/desktop/external-access.js');
const { externalCreate } = require('../dist/runtime/desktop/external-client.js');
const { startExternalEndpoint } = require('../dist/runtime/desktop/external-endpoint.js');
const { ExternalFrameDecoder, encodeExternalFrame, maxExternalFrameBytes } = require('../dist/runtime/desktop/external-framing.js');
function home() { const root = path.resolve('output/external-access-tests'); fs.mkdirSync(root, { recursive: true }); return fs.mkdtempSync(path.join(root, 'case-')); }
const binding = () => ({ name: 'Synthetic client', libraryId: randomUUID(), folderId: null });
function fixture() {
  const directory = home(), library = new NoteLibrary(path.join(directory, 'library'), undefined, 'create');
  const state = { library, appUnlocked: true, busy: false }, clients = new ExternalClients(directory);
  const credential = clients.issue({ ...binding(), libraryId: library.libraryId });
  let calls = 0;
  const service = new ExternalAccessService(clients, () => { calls++; return state; });
  const params = overrides => ({ libraryId: library.libraryId, requestId: randomUUID(), title: 'Synthetic title', body: 'Synthetic body', ...overrides });
  const envelope = overrides => ({ protocolVersion: 1, method: 'create', clientId: credential.clientId, token: credential.token, params: params(), ...overrides });
  return { directory, library, state, clients, credential, service, params, envelope, calls: () => calls, close: () => library.close() };
}
test('client grants default to empty without creating state and disclose credentials only once', () => {
  const directory = home(), clients = new ExternalClients(directory);
  assert.deepEqual(clients.list(), []); assert.equal(fs.existsSync(path.join(directory, 'external-clients.json')), false);
  const first = clients.issue(binding()), second = clients.issue(binding());
  const content = fs.readFileSync(path.join(directory, 'external-clients.json'), 'utf8');
  assert.equal(content.includes(first.token) || content.includes(second.token), false);
  assert.equal(JSON.stringify(clients.list()).includes('token'), false);
  assert.equal(clients.authenticate(first.clientId, second.token), null);
  assert.equal(clients.authenticate(second.clientId, first.token), null);
  assert.deepEqual(new ExternalClients(directory).authenticate(first.clientId, first.token), { libraryId: first.client.libraryId, folderId: null });
  assert.equal(clients.revoke(first.clientId), true); assert.equal(clients.revoke(first.clientId), false);
  assert.equal(new ExternalClients(directory).authenticate(first.clientId, first.token), null);
  assert.equal(clients.authenticate(second.clientId, second.token)?.libraryId, second.client.libraryId);
});
test('atomic issue and revoke failures preserve the existing authorization state', () => {
  const directory = home(), clients = new ExternalClients(directory), first = clients.issue(binding());
  const previous = fs.readFileSync(path.join(directory, 'external-clients.json'), 'utf8');
  const failed = new ExternalClients(directory, () => { throw Error('Synthetic fault'); });
  assert.throws(() => failed.issue(binding()), { message: 'WRITE_FAILED' });
  assert.throws(() => failed.revoke(first.clientId), { message: 'WRITE_FAILED' });
  assert.equal(fs.readFileSync(path.join(directory, 'external-clients.json'), 'utf8'), previous);
  assert.equal(fs.readdirSync(directory).some(name => name.startsWith('.pending-external-')), false);
  assert.equal(clients.authenticate(first.clientId, first.token)?.libraryId, first.client.libraryId);
});
test('corrupt, oversized, duplicate and unknown authorization fields fail closed without replacement', () => {
  for (const kind of ['json', 'size', 'duplicate', 'extra', 'hash']) {
    const directory = home(), clients = new ExternalClients(directory); clients.issue(binding());
    const file = path.join(directory, 'external-clients.json'), state = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (kind === 'duplicate') state.clients.push(state.clients[0]);
    if (kind === 'extra') state.clients[0].permissions = ['read'];
    if (kind === 'hash') state.clients[0].tokenHash = 'invalid';
    const content = kind === 'json' ? '{' : kind === 'size' ? ' '.repeat(128 * 1024 + 1) : JSON.stringify(state);
    fs.writeFileSync(file, content);
    assert.throws(() => new ExternalClients(directory), { message: 'AUTH_STATE_INVALID' });
    assert.throws(() => clients.issue(binding()), { message: 'AUTH_STATE_INVALID' });
    assert.equal(fs.readFileSync(file, 'utf8'), content);
  }
});
test('invalid client setup and over-capacity grants are rejected', () => {
  const clients = new ExternalClients(home());
  for (const value of [null, [], {}, { ...binding(), name: '' }, { ...binding(), name: 'bad\nname' }, { ...binding(), path: 'ignored' }, { ...binding(), folderId: '..' }]) assert.throws(() => clients.issue(value), { message: 'INVALID_INPUT' });
  for (let i = 0; i < 32; i++) clients.issue(binding());
  assert.throws(() => clients.issue(binding()), { message: 'INVALID_INPUT' });
});
test('authorization storage rejects linked directories without changing the target', () => {
  const directory = home(), target = path.join(directory, 'target'), linked = path.join(directory, 'linked');
  fs.mkdirSync(target); const clients = new ExternalClients(target); clients.issue(binding());
  const file = path.join(target, 'external-clients.json'), before = fs.readFileSync(file, 'utf8');
  fs.symlinkSync(target, linked, 'junction');
  assert.throws(() => new ExternalClients(linked), { message: 'AUTH_STATE_INVALID' });
  assert.equal(fs.readFileSync(file, 'utf8'), before);
});
test('unauthenticated requests cannot inspect host state or grant themselves privileges', () => {
  const f = fixture();
  try {
    for (const input of [null, [], {}, f.envelope({ token: 'invalid' }), f.envelope({ method: 'issue' }), f.envelope({ method: 'read' }), f.envelope({ protocolVersion: 2 }), f.envelope({ appUnlocked: true }), f.envelope({ binding: { libraryId: f.library.libraryId } })]) assert.equal(f.service.request(input).code, 'ACCESS_DENIED');
    assert.equal(f.calls(), 0); assert.equal(f.library.list().length, 0);
    f.state.appUnlocked = false;
    assert.equal(f.service.request(f.envelope()).code, 'APP_LOCKED');
    assert.equal(f.service.request(f.envelope({ token: 'invalid' })).code, 'ACCESS_DENIED');
  } finally { f.close(); }
});
test('each request rechecks persisted scope and revocation before the single-writer core', () => {
  const f = fixture();
  try {
    const folderId = randomUUID(); f.library.editOrganization({ kind: 'folder', id: folderId, name: 'Synthetic inbox', expectedVersion: 0 });
    const second = f.clients.issue({ name: 'Second client', libraryId: f.library.libraryId, folderId });
    const scoped = params => f.envelope({ clientId: second.clientId, token: second.token, params });
    const input = f.params(); const result = f.service.request(scoped(input));
    assert.equal(result.ok, true); assert.equal(result.value.folderId, folderId);
    assert.equal(f.service.request(scoped(input)).value.noteId, result.value.noteId);
    assert.equal(f.service.request(scoped(f.params({ folderId: null }))).code, 'ACCESS_DENIED');
    assert.equal(f.service.request(scoped(f.params({ libraryId: randomUUID() }))).code, 'LIBRARY_CHANGED');
    assert.equal(f.service.request(scoped(f.params({ clientType: 'owner' }))).code, 'INVALID_INPUT');
    new ExternalClients(f.directory).revoke(second.clientId);
    assert.equal(f.service.request(scoped(f.params())).code, 'ACCESS_DENIED');
    assert.equal(f.service.request(f.envelope()).ok, true); assert.equal(f.library.list().length, 2);
  } finally { f.close(); }
});
test('framing supports fragmented UTF-8 and the escaped 2 MiB body limit', () => {
  const input = { body: '中文 📝' }, frame = encodeExternalFrame(input), decoder = new ExternalFrameDecoder();
  for (let i = 0; i < frame.length - 1; i++) assert.equal(decoder.push(frame.subarray(i, i + 1)), undefined);
  assert.deepEqual(decoder.push(frame.subarray(-1)), input);
  assert.throws(() => decoder.push(frame));
  const large = { body: '\u0001'.repeat(2 * 1024 * 1024) }, encoded = encodeExternalFrame(large);
  assert.equal(new ExternalFrameDecoder().push(encoded).body.length, large.body.length);
});
test('framing rejects oversized declarations, invalid UTF-8 and extra frames', () => {
  for (const size of [0, 1, maxExternalFrameBytes + 1, 0xffffffff]) { const header = Buffer.alloc(4); header.writeUInt32LE(size); assert.throws(() => new ExternalFrameDecoder().push(header)); }
  const invalid = Buffer.from([2, 0, 0, 0, 0xff, 0xff]); assert.throws(() => new ExternalFrameDecoder().push(invalid));
  const frame = encodeExternalFrame({ ok: true }); assert.throws(() => new ExternalFrameDecoder().push(Buffer.concat([frame, frame])));
});
test('host defaults off, owner setup checks live state, and endpoint grants cannot self-issue', async () => {
  const directory = home(), library = new NoteLibrary(path.join(directory, 'library'), undefined, 'create');
  const state = { library, appUnlocked: true, busy: false }, host = await externalAccessHost(directory, () => state);
  try {
    assert.equal(fs.existsSync(path.join(directory, 'external-runtime.json')), false);
    state.appUnlocked = false; assert.throws(() => host.issue(binding()), { message: 'APP_LOCKED' });
    state.appUnlocked = true; state.busy = true; assert.throws(() => host.issue(binding()), { message: 'LIBRARY_IN_USE' });
    state.busy = false; assert.throws(() => host.issue(binding()), { message: 'LIBRARY_CHANGED' });
    assert.throws(() => host.issue({ ...binding(), libraryId: library.libraryId, folderId: randomUUID() }), { message: 'INVALID_INPUT' });
    const credential = host.issue({ ...binding(), libraryId: library.libraryId }); await host.start();
    const input = { libraryId: library.libraryId, requestId: randomUUID(), title: 'Synthetic pipe', body: 'a'.repeat(96 * 1024) };
    const result = await externalCreate(directory, credential, input); assert.equal(result.ok, true); assert.equal(library.read(result.value.noteId).body, input.body);
    const descriptor = fs.readFileSync(path.join(directory, 'external-runtime.json'), 'utf8'); assert.equal(descriptor.includes(credential.token), false);
    await assert.rejects(startExternalEndpoint(directory, () => ({ ok: false, code: 'ACCESS_DENIED' })));
    assert.equal(fs.readFileSync(path.join(directory, 'external-runtime.json'), 'utf8'), descriptor);
    assert.equal((await externalCreate(directory, { ...credential, token: 'invalid' }, input)).code, 'ACCESS_DENIED');
    state.appUnlocked = false; assert.equal((await externalCreate(directory, credential, input)).code, 'APP_LOCKED');
    state.appUnlocked = true; host.revoke(credential.clientId);
    assert.equal((await externalCreate(directory, credential, input)).code, 'ACCESS_DENIED');
    assert.equal(library.list().length, 1);
  } finally { host.close(); library.close(); }
  assert.equal(fs.existsSync(path.join(directory, 'external-runtime.json')), false);
});
test('revocation applies to a request whose frame was incomplete at revoke time', async () => {
  const f = fixture(), host = await externalAccessHost(f.directory, () => f.state);
  let socket;
  try {
    const runtime = JSON.parse(fs.readFileSync(path.join(f.directory, 'external-runtime.json'), 'utf8'));
    socket = net.createConnection(runtime.address); await once(socket, 'connect');
    const frame = encodeExternalFrame(f.envelope()); socket.write(frame.subarray(0, 12));
    host.revoke(f.credential.clientId);
    const response = new Promise((resolve, reject) => { const decoder = new ExternalFrameDecoder(); socket.on('data', chunk => { try { const value = decoder.push(chunk); if (value !== undefined) resolve(value); } catch (error) { reject(error); } }); socket.on('error', reject); });
    socket.write(frame.subarray(12)); assert.equal((await response).code, 'ACCESS_DENIED');
    assert.equal(f.library.list().length, 0);
  } finally { socket?.destroy(); host.close(); f.close(); }
});
test('client refuses malformed or unrelated receipts and distinguishes an unavailable host', async () => {
  const directory = home(), params = { libraryId: randomUUID(), requestId: randomUUID(), title: 'Synthetic', body: 'Synthetic' };
  const credential = { clientId: randomUUID(), token: 'a'.repeat(43) };
  assert.equal((await externalCreate(directory, credential, params)).code, 'BACKGROUND_UNAVAILABLE');
  let reply = { ok: true, value: { libraryId: params.libraryId, requestId: params.requestId, noteId: randomUUID(), folderId: null, format: 'text', version: 1, saved: true, indexed: false } };
  const endpoint = await startExternalEndpoint(directory, () => reply);
  try {
    assert.equal((await externalCreate(directory, credential, params)).value.indexed, false);
    reply.value.requestId = randomUUID();
    assert.equal((await externalCreate(directory, credential, params)).code, 'COMMIT_STATUS_UNKNOWN');
    reply = { ok: false, code: 'Synthetic unexpected detail' };
    assert.equal((await externalCreate(directory, credential, params)).code, 'COMMIT_STATUS_UNKNOWN');
    reply = { ok: false, code: 'ACCESS_DENIED', details: 'Synthetic extra field' };
    assert.equal((await externalCreate(directory, credential, params)).code, 'COMMIT_STATUS_UNKNOWN');
  } finally { endpoint.close(); }
});
