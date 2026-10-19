const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { randomUUID } = require('node:crypto');
const { ExternalClients } = require('../dist/runtime/core/external-clients.js');
const { ExternalBackground } = require('../dist/runtime/core/external-background.js');
const { NoteLibrary } = require('../dist/runtime/core/library.js');
const { externalAccessHost } = require('../dist/runtime/desktop/external-access.js');
const { externalCreateWithUnlock, externalCreate } = require('../dist/runtime/desktop/external-client.js');
function fixture() {
  const root = path.resolve('output/external-background-tests'); fs.mkdirSync(root, { recursive: true });
  const directory = fs.mkdtempSync(path.join(root, 'case-')), library = new NoteLibrary(path.join(directory, 'library'), undefined, 'create');
  const state = { library, appUnlocked: false, busy: false }, clients = new ExternalClients(directory);
  const credential = clients.issue({ name: 'Synthetic client', libraryId: library.libraryId, folderId: null });
  const params = { libraryId: library.libraryId, requestId: randomUUID(), title: 'Synthetic auth', body: 'Synthetic body' };
  const input = overrides => ({ protocolVersion: 1, method: 'unlock', clientId: credential.clientId, token: credential.token, params, ...overrides });
  const lifetime = () => { const controller = new AbortController(); let waits = 0; return { controller, signal: controller.signal, authenticationWaiting: () => { waits++; }, waits: () => waits }; };
  return { directory, library, clients, state, credential, params, input, lifetime, close: () => library.close() };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
test('authentication rejects invalid authority and malformed scope before prompting', async () => {
  const f = fixture(); let prompts = 0;
  const service = new ExternalBackground(f.clients, () => f.state, async () => { prompts++; });
  try {
    for (const input of [f.input({ token: 'invalid' }), f.input({ owner: true }), f.input({ params: { ...f.params, path: '..' } }), f.input({ params: { ...f.params, libraryId: randomUUID() } }), f.input({ params: { ...f.params, folderId: randomUUID() } })]) assert.equal((await service.request(input, f.lifetime())).ok, false);
    f.state.busy = true; assert.equal((await service.request(f.input(), f.lifetime())).code, 'LIBRARY_IN_USE');
    assert.equal(prompts, 0); assert.equal(f.library.list().length, 0);
  } finally { service.close(); f.close(); }
});
test('concurrent requests share one authentication and authentication never creates notes', async () => {
  const f = fixture(); let prompts = 0, release;
  const service = new ExternalBackground(f.clients, () => f.state, async () => { prompts++; await new Promise(resolve => { release = resolve; }); f.state.appUnlocked = true; });
  try {
    const a = f.lifetime(), b = f.lifetime();
    const one = service.request(f.input(), a), two = service.request(f.input({ params: { ...f.params, requestId: randomUUID() } }), b);
    await tick(); assert.equal(prompts, 1); assert.equal(a.waits(), 1); assert.equal(b.waits(), 1); release();
    assert.deepEqual(await one, { ok: true, unlocked: true }); assert.deepEqual(await two, { ok: true, unlocked: true });
    assert.equal(f.library.list().length, 0);
    const created = await service.request(f.input({ method: 'create' }), f.lifetime()); assert.equal(created.ok, true);
    const retry = await service.request(f.input({ method: 'create' }), f.lifetime()); assert.equal(retry.value.noteId, created.value.noteId);
    assert.equal(f.library.list().length, 1);
  } finally { service.close(); f.close(); }
});
test('successful authentication rechecks revocation, target, busy state, lock and notebook password', async () => {
  for (const mode of ['revoke', 'target', 'busy', 'relock', 'missing', 'password']) {
    const f = fixture(); let release; const second = mode === 'target' ? new NoteLibrary(path.join(f.directory, 'other'), undefined, 'create') : null;
    if (mode === 'password') await f.library.securityCommand({ action: 'setup', password: 'Synthetic password 123!' });
    if (mode === 'password') f.library.lockSecurity();
    const service = new ExternalBackground(f.clients, () => f.state, async () => { await new Promise(resolve => { release = resolve; }); f.state.appUnlocked = mode !== 'relock'; });
    try {
      const pending = service.request(f.input(), f.lifetime()); await tick();
      if (mode === 'revoke') f.clients.revoke(f.credential.clientId);
      if (mode === 'target') f.state.library = second;
      if (mode === 'busy') f.state.busy = true;
      if (mode === 'missing') f.state.library = null;
      release();
      const codes = { revoke: 'ACCESS_DENIED', target: 'LIBRARY_CHANGED', busy: 'LIBRARY_IN_USE', relock: 'APP_LOCKED', missing: 'BACKGROUND_UNAVAILABLE', password: 'NOTEBOOK_LOCKED' };
      assert.equal((await pending).code, codes[mode]); assert.equal(f.library.list().length, 0);
    } finally { service.close(); second?.close(); f.close(); }
  }
});
test('cancel, timeout and unavailable outcomes do not create or repeatedly prompt on the same request', async () => {
  for (const code of ['PASSKEY_CANCELLED', 'PASSKEY_TIMEOUT', 'PASSKEY_UNAVAILABLE', 'PASSKEY_BUSY']) {
    const f = fixture(); let prompts = 0;
    const service = new ExternalBackground(f.clients, () => f.state, async () => { prompts++; throw Error(code); });
    try {
      assert.equal((await service.request(f.input(), f.lifetime())).code, code);
      assert.equal((await service.request(f.input(), f.lifetime())).code, code);
      assert.equal(prompts, 1); assert.equal(f.state.appUnlocked, false); assert.equal(f.library.list().length, 0);
    } finally { service.close(); f.close(); }
  }
});
test('one disconnect preserves the shared prompt; last disconnect aborts authentication', async () => {
  const f = fixture(); let cancelled = false;
  const service = new ExternalBackground(f.clients, () => f.state, signal => new Promise((_, reject) => signal.addEventListener('abort', () => { cancelled = true; reject(Error('PASSKEY_CANCELLED')); }, { once: true })));
  try {
    const a = f.lifetime(), b = f.lifetime();
    const one = service.request(f.input(), a), two = service.request(f.input({ params: { ...f.params, requestId: randomUUID() } }), b);
    await tick(); a.controller.abort(); assert.equal((await one).code, 'PASSKEY_CANCELLED'); assert.equal(cancelled, false);
    b.controller.abort(); assert.equal((await two).code, 'PASSKEY_CANCELLED'); await tick(); assert.equal(cancelled, true); assert.equal(f.library.list().length, 0);
  } finally { service.close(); f.close(); }
});
test('host shutdown aborts pending authentication and rejects later requests', async () => {
  const f = fixture(); let aborted = false;
  const service = new ExternalBackground(f.clients, () => f.state, signal => new Promise((_, reject) => signal.addEventListener('abort', () => { aborted = true; reject(Error('PASSKEY_CANCELLED')); })));
  try {
    const pending = service.request(f.input(), f.lifetime()); await tick(); service.close();
    assert.equal((await pending).ok, false); assert.equal(aborted, true);
    assert.equal((await service.request(f.input({ method: 'create' }), f.lifetime())).code, 'BACKGROUND_UNAVAILABLE');
  } finally { f.close(); }
});
test('transport creates once after shared authentication and respects cancellation without creation', async () => {
  const f = fixture(); let prompts = 0, release;
  const host = await externalAccessHost(f.directory, () => f.state, async signal => { prompts++; await new Promise((resolve, reject) => { release = resolve; signal.addEventListener('abort', () => reject(Error('PASSKEY_CANCELLED')), { once: true }); }); f.state.appUnlocked = true; });
  try {
    const one = externalCreateWithUnlock(f.directory, f.credential, f.params), two = externalCreateWithUnlock(f.directory, f.credential, f.params);
    for (let i = 0; !release && i < 50; i++) await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(prompts, 1); release();
    const [a, b] = await Promise.all([one, two]); assert.equal(a.ok, true); assert.equal(b.ok, true); assert.equal(a.value.noteId, b.value.noteId); assert.equal(f.library.list().length, 1);
    f.state.appUnlocked = false; release = undefined;
    const controller = new AbortController(), other = { ...f.params, requestId: randomUUID() };
    const pending = externalCreateWithUnlock(f.directory, f.credential, other, controller.signal);
    for (let i = 0; !release && i < 50; i++) await new Promise(resolve => setTimeout(resolve, 10));
    controller.abort(); assert.equal((await pending).code, 'PASSKEY_CANCELLED');
    await tick(); assert.equal(f.library.list().length, 1);
  } finally { host.close(); f.close(); }
  assert.equal((await externalCreate(f.directory, f.credential, f.params)).code, 'BACKGROUND_UNAVAILABLE');
});
