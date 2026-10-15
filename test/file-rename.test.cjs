const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), { randomUUID } = require('node:crypto');
const { NoteLibrary } = require('../dist/runtime/core/library');
const { renameWithRetry } = require('../dist/runtime/core/file-rename');
const root = () => { fs.mkdirSync('output/rename-tests', { recursive: true }); return fs.mkdtempSync(path.resolve('output/rename-tests/case-')); };

test('Windows temporary revision and head rename failures publish exactly one durable note', { skip: process.platform !== 'win32' }, () => {
  const directory = root(), lib = new NoteLibrary(directory, undefined, 'create'), rename = fs.renameSync;
  let stageFailures = 0, headFailures = 0;
  try {
    fs.renameSync = (source, target) => {
      if (source.startsWith(directory + path.sep)) {
        if (path.basename(source).startsWith('stage-') && stageFailures++ < 2) throw Object.assign(new Error('Fixture busy revision'), { code: 'EPERM' });
        if (path.basename(target) === 'head.json' && headFailures++ < 1) throw Object.assign(new Error('Fixture busy head'), { code: 'EBUSY' });
      }
      return rename(source, target);
    };
    const operation = randomUUID(), note = lib.create(operation).note;
    assert.equal(stageFailures, 3); assert.equal(headFailures, 2);
    assert.deepEqual(lib.create(operation).note, note);
    assert.equal(lib.list().length, 1); assert.equal(note.version, 1);
    fs.renameSync = rename; lib.close();
    const reopened = new NoteLibrary(directory, undefined, 'existing');
    try { assert.deepEqual(reopened.read(note.id), note); assert.equal(reopened.status().pendingRecovery, 0); } finally { reopened.close(); }
  } finally { fs.renameSync = rename; lib.close(); }
});

test('Windows persistent revision lock fails after bounded retries and preserves the saved note and recovery journal', { skip: process.platform !== 'win32' }, () => {
  const directory = root(), lib = new NoteLibrary(directory, undefined, 'create'), rename = fs.renameSync;
  const note = lib.create(randomUUID()).note, session = lib.begin(note.id, 'test'), operation = randomUUID();
  const headFile = path.join(directory, 'notes', note.id, 'head.json'), before = fs.readFileSync(headFile);
  let attempts = 0;
  try {
    fs.renameSync = (source, target) => {
      if (source.startsWith(directory + path.sep) && path.basename(source).startsWith('stage-')) { attempts++; throw Object.assign(new Error('Fixture persistent lock'), { code: 'EPERM' }); }
      return rename(source, target);
    };
    assert.throws(() => lib.save({ noteId: note.id, token: session.token, generation: session.generation, expectedVersion: note.version, operationId: operation, title: 'Changed', body: 'Changed' }, 'test'), error => error.code === 'WRITE_FAILED');
    assert.equal(attempts, 6); assert.deepEqual(fs.readFileSync(headFile), before); assert.deepEqual(lib.read(note.id), note);
    assert.ok(fs.existsSync(path.join(directory, 'recovery', operation + '.json')));
    fs.renameSync = rename; lib.close();
    const reopened = new NoteLibrary(directory, undefined, 'existing');
    try { assert.deepEqual(reopened.read(note.id), note); assert.ok(reopened.status().pendingRecovery > 0); } finally { reopened.close(); }
  } finally { fs.renameSync = rename; lib.close(); }
});

test('rename does not retry other errors or remove an existing destination', () => {
  const directory = root(), source = path.join(directory, 'source'), target = path.join(directory, 'target'), rename = fs.renameSync;
  fs.writeFileSync(source, 'Source'); fs.writeFileSync(target, 'Destination');
  try {
    for (const code of ['EACCES', 'ENOSPC', 'EEXIST']) {
      let attempts = 0;
      fs.renameSync = () => { attempts++; throw Object.assign(new Error('Fixture permanent error'), { code }); };
      assert.throws(() => renameWithRetry(source, target), error => error.code === code);
      assert.equal(attempts, 1); assert.equal(fs.readFileSync(source, 'utf8'), 'Source'); assert.equal(fs.readFileSync(target, 'utf8'), 'Destination');
    }
  } finally { fs.renameSync = rename; }
});

test('closing a notebook twice releases its writer lock without masking an earlier error', () => {
  const directory = root(), lib = new NoteLibrary(directory), original = new Error('Fixture original failure');
  assert.throws(() => { try { lib.close(); throw original; } finally { lib.close(); } }, error => error === original);
  const reopened = new NoteLibrary(directory, undefined, 'existing'); reopened.close(); reopened.close();
});
