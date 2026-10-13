import { randomUUID, createHash } from 'node:crypto';
import { basename, dirname, join } from 'node:path';
import { NoteLibrary, LibraryError } from './library';
import { createBackup } from './backups';
import type { BatchProgress, FolderBulkReport } from '../shared/batch';

export interface FolderBulkPlan { library: NoteLibrary; folderId: string | null; includeChildren: boolean; hash: string; notes: Array<{id: string; version: number}>; }
function state(library: NoteLibrary): string { return createHash('sha256').update(JSON.stringify([library.organization().version, library.list().map(note => [note.id,note.version,note.deletedAt,note.folderId])])).digest('hex'); }
function unlocked(library: NoteLibrary): void { if (library.status().security?.configured && !library.status().security?.unlocked) throw new LibraryError('NOTEBOOK_LOCKED'); }
export function planFolderBulk(library: NoteLibrary, folderId: unknown, includeChildren: unknown): FolderBulkPlan {
  unlocked(library);if(library.status().issues.length||library.status().pendingRecovery)throw new LibraryError('INTEGRITY_CHECK_FAILED');
  if (typeof includeChildren !== 'boolean' || (folderId !== null && (typeof folderId !== 'string' || !library.organization().folders.some(folder => folder.id === folderId)))) throw new LibraryError('INVALID_INPUT');
  const folders = new Set<string | null>([folderId as string | null]);
  if (includeChildren && folderId !== null) for (let i=0;i<16;i++) for (const folder of library.organization().folders) if (folders.has(folder.parentId)) folders.add(folder.id);
  const notes=library.list().filter(note=>!note.deletedAt&&folders.has(note.folderId)).map(note=>({id:note.id,version:note.version}));
  if(notes.length>10000)throw new LibraryError('INVALID_INPUT');
  return {library,folderId:folderId as string|null,includeChildren,hash:state(library),notes};
}
export async function executeFolderBulk(plan: FolderBulkPlan, mode: unknown, progress: (value: Omit<BatchProgress,'token'>)=>void, guard: ()=>void): Promise<FolderBulkReport> {
  const library=plan.library;unlocked(library);
  if(!['trash','delete'].includes(mode as string))throw new LibraryError('INVALID_INPUT');
  if(state(library)!==plan.hash)throw new LibraryError('VERSION_CONFLICT');
  library.assertNotesAvailable(plan.notes.map(note=>note.id));
  if(!plan.notes.length)throw new LibraryError('INVALID_INPUT');
  const report:FolderBulkReport={succeeded:0,failed:0,backupPath:'',rows:[]};
  const emit=(phase:BatchProgress['phase'])=>progress({phase,processed:report.rows.length,total:plan.notes.length,succeeded:report.succeeded,skipped:0,failed:report.failed});
  guard();emit('backup');await new Promise<void>(resolve=>setImmediate(resolve));guard();
  if(state(library)!==plan.hash)throw new LibraryError('VERSION_CONFLICT');
  report.backupPath=createBackup(library.path,join(dirname(library.path),basename(library.path)+'.folder-backups')).path;
  emit('process');await new Promise<void>(resolve=>setImmediate(resolve));
  if(state(library)!==plan.hash)throw new LibraryError('VERSION_CONFLICT');
  for(const item of plan.notes){
    guard();unlocked(library);
    try {
      const trashed=library.trash(item.id,item.version,randomUUID());
      if(mode==='delete')library.purge(item.id,trashed.note.version,randomUUID());
      report.succeeded++;report.rows.push({id:item.id});
    }catch(error){report.failed++;report.rows.push({id:item.id,code:error instanceof LibraryError?error.code:'WRITE_FAILED'});}
    emit('process');await new Promise<void>(resolve=>setImmediate(resolve));
  }
  emit('done');return report;
}
