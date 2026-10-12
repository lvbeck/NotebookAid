import { existsSync, mkdirSync, lstatSync, readFileSync, writeFileSync, copyFileSync, renameSync, readdirSync, rmdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { plainPath } from './library-import';
const names = ['settings.json','libraries.json','backups.json','app-passkeys.json','library-location.json','notifications.sqlite','notifications.sqlite-wal','notifications.sqlite-shm','settings-legacy.t03c-backup.json','library-location.json.t03b-backup','t02-probe.sqlite','t02-probe.sqlite-wal','t02-probe.sqlite-shm'];
const digest = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');
/** Copy application state atomically; keep all notebooks and legacy state at their existing paths. */
export function migrateAppData(appData: string, running: (pid: number) => boolean): string {
  const legacy = join(appData, 'NotebookAid-T02'), parent = join(appData, 'NotebookAid'), target = join(parent, 'state');
  plainPath(appData); if (existsSync(target)) { plainPath(target); if (!lstatSync(target).isDirectory()) throw Error('APP_DATA_TARGET_INVALID'); if (readdirSync(target).length) {
    const marker = join(target,'migration.json');
    if (existsSync(marker)) {
      plainPath(marker); const state = JSON.parse(readFileSync(marker,'utf8'));
      if (state.version !== 1 || !Array.isArray(state.files) || state.files.some((name: unknown) => typeof name !== 'string' || !names.includes(name))) throw Error('APP_DATA_MIGRATION_INCOMPLETE');
      for (const name of ['settings.json','libraries.json','app-passkeys.json']) if (state.files.includes(name)) { const file = join(target,name); if (!existsSync(file)) throw Error('APP_DATA_MIGRATION_INCOMPLETE'); plainPath(file); }
    } else if (existsSync(join(legacy,'app-passkeys.json')) && !existsSync(join(target,'app-passkeys.json'))) throw Error('APP_DATA_MIGRATION_INCOMPLETE');
    if (!['migration.json','settings.json','app-passkeys.json','libraries.json'].some(name => existsSync(join(target,name)))) throw Error('APP_DATA_TARGET_CONFLICT'); return target;
  } }
  if (!existsSync(legacy)) { mkdirSync(target, { recursive: true }); return target; }
  plainPath(legacy); if (!lstatSync(legacy).isDirectory()) throw Error('APP_DATA_SOURCE_INVALID');
  const idle = () => { const runtime = join(legacy,'bridge-runtime.json'); if (existsSync(runtime)) { plainPath(runtime); const state = JSON.parse(readFileSync(runtime,'utf8')); if (!Number.isSafeInteger(state.pid) || state.pid < 1 || running(state.pid)) throw Error('LEGACY_APP_RUNNING'); } };
  idle(); mkdirSync(parent, { recursive: true }); plainPath(parent);
  const stage = join(parent, 'state-migration-' + randomUUID()); mkdirSync(stage);
  const hashes: Record<string,string> = {};
  for (const name of names) { const source = join(legacy,name); if (!existsSync(source)) continue; plainPath(source); if (!lstatSync(source).isFile()) throw Error('APP_DATA_SOURCE_INVALID'); hashes[name] = digest(source); const destination = join(stage,name.replace('t02-probe.sqlite','probe.sqlite')); copyFileSync(source,destination); if (digest(destination) !== hashes[name]) throw Error('APP_DATA_COPY_FAILED'); }
  idle(); for (const [name,hash] of Object.entries(hashes)) if (digest(join(legacy,name)) !== hash) throw Error('APP_DATA_CHANGED');
  writeFileSync(join(stage,'migration.json'),JSON.stringify({version:1,source:legacy,files:Object.keys(hashes),completedAt:new Date().toISOString()}),{flag:'wx'});
  if (existsSync(target)) { if (readdirSync(target).length) throw Error('APP_DATA_TARGET_CONFLICT'); rmdirSync(target); }
  renameSync(stage,target); return target;
}
