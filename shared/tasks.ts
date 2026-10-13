export interface TaskPreviewRow {
 index:number; title:string; description:string; fields:Record<string,string>; warnings:string[];
 disposition:'new'|'duplicate'|'changed'|'legacy'|'invalid'; error?:string;
}
export interface TasksPreview { token:string; file:string; libraryId:string; rows:TaskPreviewRow[]; ignored:number; }
export interface TasksReport { imported:number; converted:number; skipped:number; failed:number; invalid:number; unselected:number; backupPath:string|null; rows:Array<{index:number; outcome:'imported'|'converted'|'skipped'|'failed'; code?:string}>; }
export type TasksResult<T>={ok:true;value:T}|{ok:false;code:string};
export interface TasksApi {
 preview():Promise<TasksResult<TasksPreview|null>>;
 confirm(token:string,indices:number[],folderId?:string|null,force?:boolean):Promise<TasksResult<TasksReport>>;
 cancel(token:string):Promise<void>;
 onProgress(callback:(progress:import('./batch').BatchProgress)=>void):()=>void;
}
