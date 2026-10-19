const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { NoteLibrary } = require('../dist/runtime/core/library.js');
const { ExternalNoteService } = require('../dist/runtime/core/external-notes.js');
const { maxExternalNoteBodyBytes, maxExternalNoteTitleLength } = require('../dist/runtime/shared/external-notes.js');

function fixture(fault) {
  const root = path.resolve('output/external-note-tests'); fs.mkdirSync(root, { recursive: true });
  const directory = fs.mkdtempSync(path.join(root, 'case-'));
  let library = new NoteLibrary(directory, fault, 'create');
  const state = { library, appUnlocked: true, busy: false };
  let binding = { libraryId: library.libraryId, folderId: null };
  const service = new ExternalNoteService(() => state, () => binding);
  return {
    directory, library, state, service,
    request: overrides => ({ libraryId: library.libraryId, requestId: randomUUID(), title: 'Synthetic title', body: 'Synthetic body', ...overrides }),
    bind: value => { binding = value; },
    reopen: () => { library.close(); library = new NoteLibrary(directory, undefined, 'existing'); state.library = library; return library; },
    close: () => library.close()
  };
}

test('external create preserves text and Markdown, and returns only a bounded receipt', () => {
  const f = fixture();
  try {
    for (const format of [undefined, 'markdown']) {
      const input = f.request({ title: '\u4e2d\u6587 title', body: '# Unicode\n\n\u6b63\u6587 \ud83d\udcdd', ...(format ? { format } : {}) });
      const result = f.service.create(input); assert.equal(result.ok, true);
      assert.equal(result.value.saved, true); assert.equal(result.value.format, format ?? 'text');
      assert.equal(result.value.requestId, input.requestId);
      const note = f.library.read(result.value.noteId); assert.equal(note.body, input.body); assert.equal(note.title, input.title);
      assert.equal(note.primaryFormat, format ?? 'text');
      assert.equal(result.value.libraryId, f.library.libraryId);
      assert(!JSON.stringify(result).includes(input.title)); assert(!JSON.stringify(result).includes(input.body));
      assert.deepEqual(Object.keys(result.value).sort(), ['folderId', 'format', 'indexed', 'libraryId', 'noteId', 'requestId', 'saved', 'version'].sort());
    }
  } finally { f.close(); }
});

test('external create writes only to its trusted bound folder', () => {
  const f = fixture();
  try {
    const folderId = randomUUID(), other = randomUUID();
    f.library.editOrganization({ kind: 'folder', id: folderId, name: 'Inbox', expectedVersion: 0 });
    f.bind({ libraryId: f.library.libraryId, folderId });
    const result = f.service.create(f.request()); assert.equal(result.ok, true);
    assert.equal(f.library.read(result.value.noteId).folderId, folderId);
    for (const attempted of [null, other]) assert.equal(f.service.create(f.request({ folderId: attempted })).code, 'ACCESS_DENIED');
    assert.equal(f.library.list().length, 1);
    f.bind({ libraryId: f.library.libraryId, folderId: other });
    assert.equal(f.service.create(f.request()).code, 'INVALID_INPUT');
    assert.equal(f.library.list().length, 1);
  } finally { f.close(); }
});

test('external create fails closed when binding, host state or target changes', () => {
  const f = fixture();
  try {
    const input = f.request(), binding = { libraryId: f.library.libraryId, folderId: null };
    f.bind(null); assert.equal(f.service.create(input).code, 'ACCESS_DENIED');
    f.bind(binding); f.state.appUnlocked = false; assert.equal(f.service.create(input).code, 'APP_LOCKED');
    f.state.appUnlocked = true; f.state.busy = true; assert.equal(f.service.create(input).code, 'LIBRARY_IN_USE');
    f.state.busy = false; f.state.library = null; assert.equal(f.service.create(input).code, 'BACKGROUND_UNAVAILABLE');
    f.state.library = f.library;
    assert.equal(f.service.create({ ...input, libraryId: randomUUID() }).code, 'LIBRARY_CHANGED');
    f.bind({ ...binding, libraryId: randomUUID() }); assert.equal(f.service.create(input).code, 'LIBRARY_CHANGED');
    assert.equal(f.library.list().length, 0);
    const other = fixture();
    try {
      f.bind(binding); f.state.library = other.library;
      assert.equal(f.service.create(input).code, 'LIBRARY_CHANGED'); assert.equal(other.library.list().length, 0);
    } finally { other.close(); f.state.library = f.library; }
    assert.equal(f.service.create(input).ok, true);
    f.bind(null); assert.equal(f.service.create(f.request()).code, 'ACCESS_DENIED');
    assert.equal(f.library.list().length, 1);
  } finally { f.close(); }
});

test('external create validates actual inputs and rejects client-supplied authority', () => {
  const f = fixture();
  try {
    const input = f.request();
    for (const invalid of [null, [], {}, Object.create(input), { ...input, requestId: '../../note' },
      { ...input, title: '  ' }, { ...input, title: 'bad\nname' }, { ...input, title: 'x'.repeat(maxExternalNoteTitleLength + 1) },
      { ...input, body: '\0' }, { ...input, body: 3 }, { ...input, format: 'html' }, { ...input, format: 'delta' },
      { ...input, title: 'Broken \uD800' }, { ...input, body: '\uDC00' },
      { ...input, path: 'C:\\private' }, { ...input, appUnlocked: true }, { ...input, binding: { folderId: null } },
      { ...input, folderId: '../other' }]) assert.equal(f.service.create(invalid).code, 'INVALID_INPUT');
    assert.equal(f.library.list().length, 0);
  } finally { f.close(); }
});

test('external create enforces UTF-8 byte limits without truncating valid content', () => {
  const f = fixture();
  try {
    const body = '\u4e2d'.repeat(Math.floor(maxExternalNoteBodyBytes / 3)) + 'aa';
    assert.equal(Buffer.byteLength(body), maxExternalNoteBodyBytes);
    const created = f.service.create(f.request({ body })); assert.equal(created.ok, true);
    assert.equal(f.library.read(created.value.noteId).body, body);
    assert.equal(f.service.create(f.request({ body: body + 'x' })).code, 'INVALID_INPUT');
    assert.equal(f.library.list().length, 1);
  } finally { f.close(); }
});

test('external create reuses durable operation IDs without duplicate events or notes', () => {
  const f = fixture();
  try {
    const input = f.request(), events = []; f.library.onChange(value => events.push(value));
    const first = f.service.create(input), retry = f.service.create({ ...input, format: 'text', folderId: null });
    assert.equal(first.ok, true); assert.deepEqual(retry, first); assert.equal(events.length, 1);
    assert.equal(f.service.create({ ...input, body: 'Different content' }).code, 'INVALID_INPUT');
    const reopened = f.reopen();
    assert.deepEqual(f.service.create(input), first); assert.equal(reopened.list().length, 1);
  } finally { f.close(); }
});

test('external create keeps committed content successful when only the index fails', () => {
  let fail = false;
  const f = fixture(stage => { if (fail && stage === 'index') throw Error('Synthetic index failure'); });
  try {
    fail = true; const input = f.request(), result = f.service.create(input);
    assert.equal(result.ok, true); assert.equal(result.value.saved, true); assert.equal(result.value.indexed, false);
    assert.equal(f.library.read(result.value.noteId).body, input.body);
    assert.equal(f.service.create(input).value.noteId, result.value.noteId);
    const reopened = f.reopen(); assert.equal(reopened.list().length, 1); assert.equal(reopened.read(result.value.noteId).body, input.body);
  } finally { f.close(); }
});

test('external create refuses failed writes and redacts exceptions and paths', () => {
  let fail = false;
  const f = fixture(stage => { if (fail && stage === 'journal') throw Error('Synthetic credential and C:\\private\\path'); });
  try {
    fail = true; const result = f.service.create(f.request());
    assert.deepEqual(result, { ok: false, code: 'WRITE_FAILED' }); assert.equal(f.library.list().length, 0);
    for (const [code, expected] of [['ENOSPC', 'DISK_FULL'], ['EACCES', 'ACCESS_DENIED'], ['OTHER', 'WRITE_FAILED']]) {
      const service = new ExternalNoteService(() => { throw Object.assign(Error('Synthetic secret'), { code }); }, () => ({ libraryId: f.library.libraryId, folderId: null }));
      assert.deepEqual(service.create(f.request()), { ok: false, code: expected });
    }
  } finally { f.close(); }
});

test('external create preserves an existing desktop edit session and single-writer ownership', () => {
  const f = fixture();
  try {
    const previous = f.library.create(randomUUID(), { title: 'Existing', body: 'Existing body', primaryFormat: 'text' }).note;
    const session = f.library.begin(previous.id, 'desktop');
    assert.equal(f.service.create(f.request()).ok, true);
    assert.equal(f.library.read(previous.id).body, 'Existing body');
    assert.throws(() => new NoteLibrary(f.directory, undefined, 'existing'), error => error.code === 'LIBRARY_IN_USE');
    const saved = f.library.save({ noteId: previous.id, token: session.token, generation: session.generation, operationId: randomUUID(), expectedVersion: previous.version, title: 'Edited', body: 'Desktop draft' }, 'desktop');
    assert.equal(saved.note.body, 'Desktop draft'); f.library.end(session.token, session.generation, 'desktop');
    assert.equal(f.library.list().length, 2);
  } finally { f.close(); }
});

test('application Passkey state cannot bypass a locked notebook password', async () => {
  const f = fixture();
  try {
    await f.library.securityCommand({ action: 'setup', password: 'Synthetic password 12345' });
    f.library.lockSecurity();
    assert.equal(f.service.create(f.request()).code, 'NOTEBOOK_LOCKED');
    f.state.appUnlocked = false; assert.equal(f.service.create(f.request()).code, 'APP_LOCKED');
    f.state.appUnlocked = true; assert.equal(f.service.create(f.request()).code, 'NOTEBOOK_LOCKED');
    assert.equal(f.library.list().length, 0);
    await f.library.securityCommand({ action: 'unlock', credential: 'Synthetic password 12345' });
    assert.equal(f.service.create(f.request()).ok, true);
  } finally { f.close(); }
});
