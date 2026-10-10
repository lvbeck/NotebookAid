import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { ProbeResult } from '../shared/contracts';

export function runSqliteProbe(directory: string): ProbeResult {
  mkdirSync(directory, { recursive: true });
  const database = new DatabaseSync(join(directory, 't02-probe.sqlite'));
  try {
    database.exec('CREATE TABLE IF NOT EXISTS probe (id INTEGER PRIMARY KEY CHECK (id = 1), value TEXT NOT NULL, writes INTEGER NOT NULL) STRICT');
    database.prepare('INSERT INTO probe VALUES (1, ?, 1) ON CONFLICT(id) DO UPDATE SET value = excluded.value, writes = writes + 1')
      .run('NotebookAid · 中文 SQLite 往返测试');
    const row = database.prepare('SELECT value, writes FROM probe WHERE id = 1').get() as { value: string; writes: number };
    const version = database.prepare('SELECT sqlite_version() AS version').get() as { version: string };
    const integrity = database.prepare('PRAGMA integrity_check').get() as { integrity_check: string };
    return { ...row, sqliteVersion: version.version, integrity: integrity.integrity_check };
  } finally { database.close(); }
}
