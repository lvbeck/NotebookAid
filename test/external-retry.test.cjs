const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { NoteLibrary } = require('../dist/runtime/core/library.js');
const { ExternalNoteService } = require('../dist/runtime/core/external-notes.js');
const { ExternalClients } = require('../dist/runtime/core/external-clients.js');
const { ExternalAccessService } = require('../dist/runtime/core/external-access.js');
const { startExternalEndpoint } = require('../dist/runtime/desktop/external-endpoint.js');
const { externalAccessHost } = require('../dist/runtime/desktop/external-access.js');
const { externalCreate, externalCreateWithUnlock } = require('../dist/runtime/desktop/external-client.js');
function directory() { const root = path.resolve('output/external-retry-tests'); fs.mkdirSync(root, { recursive: true }); return fs.mkdtempSync(path.join(root, 'case-')); }
const request = libraryId => ({ libraryId, requestId: randomUUID(), title: 'Synthetic retry title', body: 'Synthetic retry body\n中文 📝' });
for (const stage of ['journal', 'revision', 'head', 'index']) test(`external create retry recovers after process exit at ${stage}`, () => {
  const root = directory(); let library = new NoteLibrary(root, undefined, 'create'); const libraryId = library.libraryId; library.close();
  fs.writeFileSync(path.join(root, 'synthetic-crash-fixture'), 'synthetic');
  const requestId = randomUUID();
  const child = spawnSync(process.execPath, [path.resolve('test/external-create-crash-worker.cjs'), root, stage, libraryId, requestId], { encoding: 'utf8', timeout: 15000 });
  assert.equal(child.status, 75); assert.equal(fs.readFileSync(path.join(root, 'crash-stage.txt'), 'utf8'), stage);
  library = new NoteLibrary(root, undefined, 'existing');
  try {
    const events = []; library.onChange(value => events.push(value));
    const before = library.list().length;
    assert.equal(before, ['head', 'index'].includes(stage) ? 1 : 0);
    const service = new ExternalNoteService(() => ({ library, appUnlocked: true, busy: false }), () => ({ libraryId, folderId: null }));
    const input = { libraryId, requestId, title: 'Synthetic crash title', body: 'Synthetic crash body\n中文 📝' };
    const result = service.create(input), retry = service.create(input);
    assert.equal(result.ok, true); assert.equal(retry.value.noteId, result.value.noteId); assert.equal(library.list().length, 1);
    assert.equal(library.read(result.value.noteId).body, input.body); assert.equal(events.length, before ? 0 : 1);
  } finally { library.close(); }
});
test('unexpected post-commit exception is uncertain and explicit replay does not create a second note', async () => {
  const root = directory(), library = new NoteLibrary(path.join(root, 'library'), undefined, 'create'), clients = new ExternalClients(root);
  const credential = clients.issue({ name: 'Synthetic retry', libraryId: library.libraryId, folderId: null });
  const service = new ExternalAccessService(clients, () => ({ library, appUnlocked: true, busy: false }));
  let calls = 0, first = true;
  const endpoint = await startExternalEndpoint(root, value => { calls++; const result = service.request(value); if (first) { first = false; throw Error('Synthetic lost response'); } return result; });
  try {
    const input = request(library.libraryId);
    // A rejected response has no authority to claim the already committed note was not saved.
    assert.equal((await externalCreate(root, credential, input)).code, 'COMMIT_STATUS_UNKNOWN'); assert.equal(library.list().length, 1); assert.equal(calls, 1);
    const result = await externalCreate(root, credential, input); assert.equal(result.ok, true); assert.equal(library.list().length, 1); assert.equal(calls, 2);
    assert.equal((await externalCreate(root, credential, { ...input, body: 'Changed retry' })).code, 'INVALID_INPUT'); assert.equal(library.list().length, 1);
  } finally { endpoint.close(); library.close(); }
});
test('actual dropped pipe reply resolves immediately and replays after endpoint restart', async () => {
  const root = directory(), library = new NoteLibrary(path.join(root, 'library'), undefined, 'create'), clients = new ExternalClients(root);
  const credential = clients.issue({ name: 'Synthetic dropped reply', libraryId: library.libraryId, folderId: null });
  const service = new ExternalAccessService(clients, () => ({ library, appUnlocked: true, busy: false }));
  let endpoint = await startExternalEndpoint(root, value => { const result = service.request(value); endpoint.close(); return result; });
  try {
    const input = request(library.libraryId), started = Date.now();
    assert.equal((await externalCreateWithUnlock(root, credential, input)).code, 'COMMIT_STATUS_UNKNOWN'); assert(Date.now() - started < 5000); assert.equal(library.list().length, 1);
    await new Promise(resolve => setImmediate(resolve));
    endpoint = await startExternalEndpoint(root, value => service.request(value));
    const replay = await externalCreateWithUnlock(root, credential, input); assert.equal(replay.ok, true); assert.equal(library.list().length, 1); assert.equal(library.read(replay.value.noteId).body, input.body);
  } finally { endpoint.close(); library.close(); }
});
test('authentication retry preserves the input and credential snapshot despite caller mutation', async () => {
  const root = directory(), library = new NoteLibrary(path.join(root, 'library'), undefined, 'create'); let locked = false, release;
  const host = await externalAccessHost(root, () => ({ library, appUnlocked: !locked, busy: false }), async () => { await new Promise(resolve => { release = resolve; }); locked = false; });
  const credential = host.issue({ name: 'Synthetic snapshot', libraryId: library.libraryId, folderId: null }); await host.start(); locked = true;
  try {
    const input = request(library.libraryId), original = { ...input }, identity = { ...credential };
    const pending = externalCreateWithUnlock(root, identity, input);
    for (let i = 0; !release && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal(typeof release, 'function'); input.requestId = randomUUID(); input.body = 'Changed while authenticating'; identity.token = 'invalid'; release();
    const result = await pending; assert.equal(result.ok, true); assert.equal(result.value.requestId, original.requestId);
    assert.equal(library.read(result.value.noteId).body, original.body); assert.equal(library.list().length, 1);
  } finally { host.close(); library.close(); }
});
test('saved/indexed distinction, Markdown literals and retry changes stay authoritative', async () => {
  const root = directory(); let fail = false;
  const library = new NoteLibrary(path.join(root, 'library'), stage => { if (fail && stage === 'index') throw Error('Synthetic index failure'); }, 'create');
  const host = await externalAccessHost(root, () => ({ library, appUnlocked: true, busy: false }));
  const credential = host.issue({ name: 'Synthetic format', libraryId: library.libraryId, folderId: null }); await host.start();
  try {
    const input = { ...request(library.libraryId), body: '# Literal title\n\n<script>literal</script>\n\n- [ ] task', format: 'markdown' }; fail = true;
    const first = await externalCreateWithUnlock(root, credential, input); assert.equal(first.ok, true); assert.equal(first.value.saved, true); assert.equal(first.value.indexed, false);
    assert.equal(library.read(first.value.noteId).body, input.body);
    for (const changed of [{ title: 'Changed' }, { format: 'text' }, { body: 'Changed' }]) assert.equal((await externalCreateWithUnlock(root, credential, { ...input, ...changed })).code, 'INVALID_INPUT');
    assert.equal((await externalCreateWithUnlock(root, credential, input)).value.noteId, first.value.noteId); assert.equal(library.list().length, 1);
    const second = await externalCreateWithUnlock(root, credential, { ...input, requestId: randomUUID(), format: 'text' }); assert.equal(second.value.format, 'text'); assert.equal(library.list().length, 2);
  } finally { host.close(); library.close(); }
});
