import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { notificationTypes, notificationPositions, notificationOperations, notificationErrorCodes } from '../shared/notifications';
import type { NotificationInput, NotificationRecord, NotificationState, NotificationPosition } from '../shared/notifications';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class NotificationInputError extends Error {}
function requireValid(condition: unknown): asserts condition { if (!condition) throw new NotificationInputError('Invalid notification input'); }
function validateInput(value: unknown): asserts value is NotificationInput {
  requireValid(value && typeof value === 'object' && !Array.isArray(value));
  const input = value as NotificationInput;
  requireValid(Object.keys(input).every(key => ['code', 'operation', 'libraryId', 'errorCode'].includes(key)));
  requireValid(typeof input.code === 'string' && Object.hasOwn(notificationTypes, input.code));
  requireValid(notificationOperations.includes(input.operation));
  requireValid(input.libraryId == null || (typeof input.libraryId === 'string' && uuid.test(input.libraryId)));
  requireValid(input.errorCode == null || notificationErrorCodes.includes(input.errorCode));
}

export class NotificationStore {
  private readonly db: DatabaseSync;
  constructor(path: string, private readonly now = Date.now) {
    this.db = new DatabaseSync(path);
    try {
      this.db.exec('PRAGMA busy_timeout=1000; PRAGMA synchronous=FULL;');
      const version = this.db.prepare('PRAGMA user_version').get()!['user_version'];
      if (version !== 0 && version !== 1) throw new Error('Unsupported notification schema');
      this.db.exec(`BEGIN IMMEDIATE;
        CREATE TABLE IF NOT EXISTS notifications (
          sequence INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE,
          code TEXT NOT NULL, operation TEXT NOT NULL, library_id TEXT, error_code TEXT,
          created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, count INTEGER NOT NULL, is_read INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS preferences (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        PRAGMA user_version=1;
        COMMIT;`);
    } catch (error) { this.db.close(); throw error; }
  }
  private record(row: Record<string, unknown>): NotificationRecord {
    const input = { code: row['code'], operation: row['operation'], libraryId: row['library_id'], errorCode: row['error_code'] };
    validateInput(input);
    requireValid(typeof row['id'] === 'string' && uuid.test(row['id']));
    requireValid(Number.isSafeInteger(row['count']) && Number(row['count']) > 0);
    requireValid(Number.isSafeInteger(row['created_at']) && Number.isSafeInteger(row['updated_at']));
    return { ...input, id: row['id'], type: notificationTypes[input.code], createdAt: Number(row['created_at']), updatedAt: Number(row['updated_at']), count: Number(row['count']), read: notificationTypes[input.code] === 'success' || row['is_read'] === 1 };
  }
  state(): NotificationState {
    const position = this.db.prepare("SELECT value FROM preferences WHERE key='position'").get()?.['value'];
    return {
      records: this.db.prepare('SELECT * FROM notifications ORDER BY updated_at DESC, sequence DESC LIMIT 100').all().map(row => this.record(row)),
      position: notificationPositions.includes(position as NotificationPosition) ? position as NotificationPosition : 'bottom-right'
    };
  }
  publish(input: unknown): { state: NotificationState; record: NotificationRecord; merged: boolean } {
    validateInput(input);
    return this.transaction(() => {
      const now = this.now();
      const previous = this.db.prepare('SELECT * FROM notifications WHERE operation=? AND library_id IS ? ORDER BY updated_at DESC, sequence DESC LIMIT 1').get(input.operation, input.libraryId ?? null);
      const merged = !!previous && previous['code'] === input.code && previous['error_code'] === (input.errorCode ?? null) &&
        now >= Number(previous['updated_at']) && now - Number(previous['updated_at']) < 10000 &&
        (notificationTypes[input.code] === 'error' || input.code === 'settingsSaved');
      const id = merged ? String(previous!['id']) : randomUUID();
      const isRead = notificationTypes[input.code] === 'success' ? 1 : 0;
      if (merged) this.db.prepare('UPDATE notifications SET updated_at=?, count=count+1, is_read=? WHERE id=?').run(now, isRead, id);
      else this.db.prepare('INSERT INTO notifications(id,code,operation,library_id,error_code,created_at,updated_at,count,is_read) VALUES(?,?,?,?,?,?,?,1,?)').run(id, input.code, input.operation, input.libraryId ?? null, input.errorCode ?? null, now, now, isRead);
      this.db.exec('DELETE FROM notifications WHERE id NOT IN (SELECT id FROM notifications ORDER BY updated_at DESC, sequence DESC LIMIT 100)');
      const state = this.state();
      return { state, record: state.records.find(item => item.id === id)!, merged };
    });
  }
  read(id: unknown): NotificationState {
    requireValid(id === null || (typeof id === 'string' && uuid.test(id)));
    return this.transaction(() => {
      if (id === null) this.db.exec('UPDATE notifications SET is_read=1');
      else this.db.prepare('UPDATE notifications SET is_read=1 WHERE id=?').run(id);
      return this.state();
    });
  }
  remove(id: unknown): NotificationState {
    requireValid(typeof id === 'string' && uuid.test(id));
    return this.transaction(() => { this.db.prepare('DELETE FROM notifications WHERE id=?').run(id); return this.state(); });
  }
  clear(): NotificationState { return this.transaction(() => { this.db.exec('DELETE FROM notifications'); return this.state(); }); }
  position(value: unknown): NotificationState {
    requireValid(notificationPositions.includes(value as NotificationPosition));
    return this.transaction(() => {
      this.db.prepare("INSERT INTO preferences(key,value) VALUES('position',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(value as string);
      return this.state();
    });
  }
  private transaction<T>(action: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = action(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  close(): void { this.db.close(); }
}
