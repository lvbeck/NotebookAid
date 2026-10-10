const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { NotificationStore, NotificationInputError } = require('../dist/runtime/core/notifications.js');
function location() { const root = path.resolve('output/notification-tests'); fs.mkdirSync(root, { recursive: true }); return path.join(fs.mkdtempSync(path.join(root, 'case-')), 'notifications.sqlite'); }

test('notification history retains exactly the latest 100 records across restarts', () => {
  const file = location(); let time = 100000; let store = new NotificationStore(file, () => time++);
  try {
    const ids = [];
    for (let n = 0; n < 110; n++) ids.push(store.publish({ code: 'saveSuccess', operation: 'save' }).record.id);
    const state = store.state(); assert.equal(state.records.length, 100); assert.equal(state.records[0].id, ids[109]); assert.equal(state.records[99].id, ids[10]);
    store.read(ids[109]); store.position('top-left'); store.close(); store = new NotificationStore(file);
    assert.equal(store.state().position, 'top-left'); assert.equal(store.state().records[0].read, true);
    store.remove(ids[109]); assert.equal(store.state().records.length, 99); store.read(null); assert.ok(store.state().records.every(item => item.read));
    store.clear(); assert.equal(store.state().records.length, 0); assert.equal(store.state().position, 'top-left');
  } finally { store.close(); }
  const db = new DatabaseSync(file); assert.equal(db.prepare('SELECT count(*) AS n FROM notifications').get().n, 0); db.close();
});

test('repeated failures aggregate by operation and library, reset unread, and stop after success or timeout', () => {
  let time = 100000; const store = new NotificationStore(location(), () => time); const libraryId = randomUUID();
  const input = { code: 'operationFailed', operation: 'save', libraryId, errorCode: 'WRITE_FAILED' };
  try {
    const first = store.publish(input).record; store.read(first.id); time += 100;
    const second = store.publish(input); assert.equal(second.merged, true); assert.equal(second.record.id, first.id); assert.equal(second.record.count, 2); assert.equal(second.record.read, false);
    assert.equal(store.publish({ ...input, libraryId: randomUUID() }).merged, false);
    assert.equal(store.publish({ ...input, operation: 'rebuild' }).merged, false);
    store.publish({ code: 'saveSuccess', operation: 'save', libraryId }); assert.equal(store.publish(input).merged, false);
    time += 10000; assert.equal(store.publish(input).merged, false);
  } finally { store.close(); }
});

test('success is read by default, including merged and legacy records, while other types remain unread', () => {
  const file = location(); let store = new NotificationStore(file, () => 100000);
  try {
    const success = store.publish({ code: 'saveSuccess', operation: 'save' }).record;
    assert.equal(success.read, true);
    store.publish({ code: 'settingsSaved', operation: 'settings' });
    const merged = store.publish({ code: 'settingsSaved', operation: 'settings' });
    assert.equal(merged.merged, true); assert.equal(merged.record.read, true);
    for (const code of ['libraryOpened', 'savedIndexPending', 'operationFailed']) {
      assert.equal(store.publish({ code, operation: 'open' }).record.read, false);
    }
    store.close();
    const db = new DatabaseSync(file);
    try {
      assert.equal(db.prepare('SELECT is_read FROM notifications WHERE id=?').get(success.id).is_read, 1);
      db.prepare('UPDATE notifications SET is_read=0 WHERE id=?').run(success.id);
    } finally { db.close(); }
    store = new NotificationStore(file);
    assert.equal(store.state().records.find(item => item.id === success.id).read, true);
    assert.equal(store.state().records.filter(item => !item.read).length, 3);
    store.read(null); assert.ok(store.state().records.every(item => item.read));
  } finally { store.close(); }
});

test('untrusted notification fields and arbitrary private text cannot enter history', () => {
  const store = new NotificationStore(location());
  try {
    for (const value of [null, [], {}, { code: '__proto__', operation: 'save' }, { code: 'saveSuccess', operation: 'private text' }, { code: 'saveSuccess', operation: 'save', body: 'PRIVATE NOTE' }, { code: 'operationFailed', operation: 'save', errorCode: 'API TOKEN' }, { code: 'saveSuccess', operation: 'save', libraryId: 'C:\\Private' }]) assert.throws(() => store.publish(value), NotificationInputError);
    assert.throws(() => store.position('javascript:alert(1)'), NotificationInputError);
    assert.throws(() => store.remove("' OR 1=1"), NotificationInputError);
    assert.throws(() => store.read(undefined), NotificationInputError);
    assert.equal(store.state().records.length, 0);
  } finally { store.close(); }
});

test('a failed notification transaction preserves records and corrupt files are not replaced', () => {
  const file = location(); const store = new NotificationStore(file);
  try {
    const original = store.publish({ code: 'saveSuccess', operation: 'save' }).record;
    const db = new DatabaseSync(file); db.exec("CREATE TRIGGER fail_insert BEFORE INSERT ON notifications BEGIN SELECT RAISE(ABORT, 'Test failure'); END"); db.close();
    assert.throws(() => store.publish({ code: 'rebuildSuccess', operation: 'rebuild' })); assert.equal(store.state().records[0].id, original.id);
  } finally { store.close(); }
  const corrupt = location(); const contents = Buffer.from('Invalid database fixture'); fs.writeFileSync(corrupt, contents);
  assert.throws(() => new NotificationStore(corrupt)); assert.deepEqual(fs.readFileSync(corrupt), contents);
});
