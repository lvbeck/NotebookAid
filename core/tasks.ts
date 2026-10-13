import type ICALModule from 'ical.js' with { 'resolution-mode':'import' };
const ICAL=require('ical.js') as typeof ICALModule;
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, openSync, writeFileSync, fsyncSync, closeSync, renameSync, unlinkSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { NoteLibrary, LibraryError } from './library';
import { plainPath } from './library-import';
import { createBackup } from './backups';
import { taskFieldNames, type TaskSource } from '../shared/task-source';
import {validateTasksLedger,type TasksLedger as Ledger,type TasksReceipt as Receipt} from '../shared/task-receipts';
import type { BatchProgress } from '../shared/batch';
import type { TaskPreviewRow, TasksReport } from '../shared/tasks';

export class TasksError extends Error { constructor(readonly code:string){super(code);} }
function fail(code:string):never{throw new TasksError(code);}
const hash=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
const fields=taskFieldNames;
interface Task extends TaskPreviewRow { identity?:string; fingerprint?:string; body?:string; source?:TaskSource; legacyBody?:string; legacyId?:string; legacyVersion?:number; }
export interface TasksPlan { library:NoteLibrary; path:string; fileHash:string; targetHash:string; ledger:Ledger; pruned:boolean; tasks:Task[]; ignored:number; }
function bytes(path:string,max:number):Buffer{
 plainPath(path);try{const info=lstatSync(path);if(!info.isFile())fail('ICS_SOURCE_UNAVAILABLE');if(info.size>max)fail('ICS_TOO_LARGE');const value=readFileSync(path);if(value.length>max)fail('ICS_TOO_LARGE');return value;}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')fail('ICS_SOURCE_UNAVAILABLE');throw e;}
}
function ledger(library:NoteLibrary):Ledger {
 const path=join(library.path,'tasks-imports.json');if(!existsSync(path))return{version:1,libraryId:library.libraryId,rows:[]};
 try{const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes(path,4*1024*1024))) as Ledger;
  validateTasksLedger(value,library.libraryId);return value;
 }catch{fail('ICS_RECEIPTS_INVALID');}
}
function saveLedger(library:NoteLibrary,value:Ledger):void{
 if(value.rows.length>10000)fail('ICS_RECEIPTS_FULL');const path=join(library.path,'tasks-imports.json');plainPath(path);
 const temp=join(library.path,'.tasks-import-'+randomUUID()+'.tmp');const fd=openSync(temp,'wx');
 try{writeFileSync(fd,JSON.stringify(value));fsyncSync(fd);}finally{closeSync(fd);}
 try{renameSync(temp,path);}catch(e){try{unlinkSync(temp);}catch{/* Preserve the original receipts. */}throw e;}
}
function date(property:InstanceType<typeof ICAL.Property>):string {
 const value=String(property.jCal[3]),dateOnly=property.type==='date';
 const pattern=dateOnly?/^(\d{4})-(\d{2})-(\d{2})$/:/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(Z)?$/;
 const m=value.match(pattern);if(!m)fail('ICS_INVALID_DATE');const y=+m[1],month=+m[2],d=+m[3];
 const check=new Date(0);check.setUTCFullYear(y,month-1,d);if(y<1||month<1||month>12||d<1||check.getUTCFullYear()!==y||check.getUTCMonth()!==month-1||check.getUTCDate()!==d||!dateOnly&&(+m[4]>23||+m[5]>59||+m[6]>60))fail('ICS_INVALID_DATE');
 const tz=property.getParameter('tzid');if(tz&&(dateOnly||m[7]))fail('ICS_INVALID_DATE');if(tz&&(typeof tz!=='string'||tz.length>200||/[\r\n\0]/.test(tz)))fail('ICS_INVALID_DATE');
 const range=property.getParameter('range');if(range&&range!=='THISANDFUTURE')fail('ICS_INVALID_FIELD');
 return value+(dateOnly?' [DATE]':tz?' [TZID='+tz+']':m[7]?' [UTC]':' [FLOATING]')+(range?' [RANGE='+range+']':'');
}
export function parseTasks(buffer:Buffer):{tasks:Task[];ignored:number} {
 if(buffer.length>2*1024*1024)fail('ICS_TOO_LARGE');let text:string;try{const unfolded=Buffer.from(buffer.toString('latin1').replace(/\r?\n[ \t]/g,''),'latin1');text=new TextDecoder('utf-8',{fatal:true}).decode(unfolded);}catch{fail('ICS_INVALID_ENCODING');}
 if(text.includes('\0'))fail('ICS_INVALID_FILE');text=text.replace(/^\uFEFF/,'');
 const lines=text.replace(/\r\n/g,'\n').split('\n'),stack:string[]=[];
 for(const line of lines){if(line.length>65536)fail('ICS_TOO_LARGE');if(/^[ \t]/.test(line))continue;const begin=/^BEGIN:([A-Z0-9-]+)$/i.exec(line),end=/^END:([A-Z0-9-]+)$/i.exec(line);if(begin){stack.push(begin[1].toUpperCase());if(stack.length>16)fail('ICS_INVALID_FILE');}if(end&&stack.pop()!==end[1].toUpperCase())fail('ICS_INVALID_FILE');}
 if(stack.length||!/^BEGIN:VCALENDAR\r?$/im.test(text)||!/^END:VCALENDAR\r?\n?$/im.test(text))fail('ICS_INVALID_FILE');
 let calendar:InstanceType<typeof ICAL.Component>;try{const parsed=ICAL.parse(text);if(!Array.isArray(parsed)||parsed[0]!=='vcalendar')throw Error();calendar=new ICAL.Component(parsed);}catch{fail('ICS_INVALID_FILE');}
 if(String(calendar.getFirstPropertyValue('version'))!=='2.0')fail('ICS_INVALID_FILE');
 const components=calendar.getAllSubcomponents('vtodo');if(components.length>500)fail('ICS_TOO_LARGE');
 const identities=new Set<string>(),tasks:Task[]=components.map((component,index)=>{
  const task:Task={index,title:'',description:'',fields:{},warnings:[],disposition:'new'};
  try{
   for(const name of ['uid','summary','description',...fields])if(!['rdate','exdate','categories'].includes(name)&&component.getAllProperties(name).length>1)fail('ICS_DUPLICATE_FIELD');
   const uid=component.getFirstPropertyValue('uid');if(typeof uid!=='string'||!uid.trim()||uid.length>1024||/[\r\n\0]/.test(uid))fail('ICS_MISSING_UID');
   for(const name of ['summary','description'])if(component.hasProperty(name)&&component.getFirstProperty(name)!.type!=='text')fail('ICS_INVALID_FIELD');
   const title=component.getFirstPropertyValue('summary');task.title=typeof title==='string'&&title.trim()?title.trim():'Untitled task';if(task.title.length>300)fail('ICS_INVALID_FIELD');if(!title)task.warnings.push('ICS_MISSING_TITLE');
   const description=component.getFirstPropertyValue('description');task.description=typeof description==='string'?description:'';
   if(task.description.length>100000)fail('ICS_TOO_LARGE');
   for(const name of fields){const properties=component.getAllProperties(name);if(!properties.length)continue;
    task.fields[name]=properties.map(property=>['dtstart','due','completed','recurrence-id','created','last-modified'].includes(name)?date(property):['rdate','exdate'].includes(name)?property.toICALString():property.toICALString().slice(property.toICALString().indexOf(':')+1)).join('\n');
    if(task.fields[name].length>10000)fail('ICS_TOO_LARGE');
   }
   if(component.hasProperty('status')&&!['NEEDS-ACTION','IN-PROCESS','COMPLETED','CANCELLED'].includes(task.fields['status']))fail('ICS_INVALID_FIELD');
   for(const [name,max]of [['priority',9],['percent-complete',100],['sequence',2147483647]] as const)if(component.hasProperty(name)&&(!/^\d+$/.test(task.fields[name])||+task.fields[name]>max))fail('ICS_INVALID_FIELD');
   const start=component.getFirstProperty('dtstart'),due=component.getFirstProperty('due');if(start&&due&&(start.type!==due.type||start.getParameter('tzid')===due.getParameter('tzid')&&String(start.jCal[3]).endsWith('Z')===String(due.jCal[3]).endsWith('Z')&&String(due.jCal[3])<String(start.jCal[3])))fail('ICS_INVALID_DATE');
   if(component.hasProperty('duration')){const duration=component.getFirstPropertyValue('duration');if(due||!start||!(duration instanceof ICAL.Duration)||duration.toSeconds()<0)fail('ICS_INVALID_FIELD');}
   if(component.hasProperty('rrule')||component.hasProperty('rdate')||component.hasProperty('exdate'))task.warnings.push('ICS_RECURRENCE_PRESERVED');
   if(component.hasProperty('recurrence-id'))task.warnings.push('ICS_EXCEPTION_PRESERVED');
   if(component.getAllSubcomponents().length||component.getAllProperties().some(p=>!['uid','summary','description','dtstamp',...fields].includes(p.name)))task.warnings.push('ICS_UNSUPPORTED_FIELDS');
   if(Object.values(task.fields).some(v=>v.includes('[TZID=')))task.warnings.push('ICS_TIMEZONE_PRESERVED');
   const identity=hash(JSON.stringify([uid,task.fields['recurrence-id']??'']));if(identities.has(identity))fail('ICS_DUPLICATE_UID');identities.add(identity);
   const canonical=JSON.stringify([task.title,task.description,task.fields]);task.identity=identity;task.fingerprint=hash(canonical);
   task.legacyBody=(task.description?task.description+'\n\n':'')+'ICS task\nUID: '+uid+'\n'+Object.entries(task.fields).map(([key,value])=>key.toUpperCase()+': '+value).join('\n');
   task.body=task.description;task.source={version:1,uid,fields:structuredClone(task.fields)};
   if(task.body.includes('\0')||task.title.includes('\0')||Buffer.byteLength(task.body)>2*1024*1024)fail('ICS_INVALID_FIELD');
  }catch(e){task.disposition='invalid';task.error=e instanceof TasksError?e.code:'ICS_INVALID_FIELD';delete task.identity;delete task.fingerprint;delete task.body;delete task.source;delete task.legacyBody;}
  return task;
 });
 return{tasks,ignored:calendar.getAllSubcomponents().filter(c=>!['vtodo','vtimezone'].includes(c.name)).length};
}
function state(library:NoteLibrary):string{return hash(JSON.stringify([library.libraryId,library.organization().version,library.list().map(n=>[n.id,n.version,n.deletedAt,n.encrypted]),ledger(library)]));}
export function planTasks(library:NoteLibrary,path:string):TasksPlan {
 if(library.status().security?.configured&&!library.status().security?.unlocked)throw new LibraryError('NOTEBOOK_LOCKED');const source=bytes(path,2*1024*1024),parsed=parseTasks(source),receipts=ledger(library);
 const liveRows=receipts.rows.filter(r=>!r.noteId||existsSync(join(library.path,'notes',r.noteId))),pruned=liveRows.length!==receipts.rows.length;receipts.rows=liveRows;
 for(const task of parsed.tasks)if(task.identity){const prior=receipts.rows.filter(r=>r.identity===task.identity);const receipt=prior.slice().reverse().find(r=>r.fingerprint===task.fingerprint&&r.noteId);if(receipt){task.disposition='duplicate';try{const note=library.read(receipt.noteId!);if(!note.taskSource&&!note.deletedAt&&note.primaryFormat==='text'&&note.body===task.legacyBody){task.disposition='legacy';task.legacyId=note.id;task.legacyVersion=note.version;}}catch{/* Preserve unavailable legacy notes. */}}else if(prior.some(r=>r.fingerprint===task.fingerprint&&r.force&&!r.noteId)){task.disposition='duplicate';task.warnings.push('ICS_FORCE_PENDING');}else if(prior.some(r=>r.fingerprint!==task.fingerprint))task.disposition='changed';}
 return{library,path,fileHash:hash(source),targetHash:state(library),ledger:receipts,pruned,...parsed};
}
export function tasksRows(plan:TasksPlan):TaskPreviewRow[]{return plan.tasks.map(({identity,fingerprint,body,source,legacyBody,legacyId,legacyVersion,...row})=>structuredClone(row));}
function* steps(plan:TasksPlan,indices:number[],folderId:unknown=null,owner?:string,force:unknown=false):Generator<Omit<BatchProgress,'token'>,TasksReport> {
 const library=plan.library;if(library.status().issues.length||library.status().pendingRecovery)throw new LibraryError('INTEGRITY_CHECK_FAILED');if(library.status().security?.configured&&!library.status().security?.unlocked)throw new LibraryError('NOTEBOOK_LOCKED');
 if(typeof force!=='boolean')fail('INVALID_INPUT');
 if(!Array.isArray(indices)||!indices.length||indices.length>500||new Set(indices).size!==indices.length||indices.some(i=>!Number.isInteger(i)||!plan.tasks[i]||plan.tasks[i].disposition==='invalid'))fail('INVALID_INPUT');
 if(hash(bytes(plan.path,2*1024*1024))!==plan.fileHash||state(library)!==plan.targetHash)fail('VERSION_CONFLICT');
 if(folderId!==null&&(typeof folderId!=='string'||!library.organization().folders.some(folder=>folder.id===folderId)))fail('INVALID_INPUT');
 const selected=indices.map(i=>plan.tasks[i]),invalid=plan.tasks.filter(t=>t.disposition==='invalid').length,report:TasksReport={imported:0,converted:0,skipped:0,failed:0,invalid,unselected:plan.tasks.length-invalid-selected.length,backupPath:null,rows:[]};
 const progress=(phase:BatchProgress['phase']):Omit<BatchProgress,'token'>=>({phase,processed:report.rows.length,total:selected.length,succeeded:report.imported+report.converted,skipped:report.skipped,failed:report.failed});
 if(plan.pruned||force||selected.some(t=>t.disposition!=='duplicate')){yield progress('backup');if(hash(bytes(plan.path,2*1024*1024))!==plan.fileHash||state(library)!==plan.targetHash)fail('VERSION_CONFLICT');report.backupPath=createBackup(library.path,join(dirname(library.path),basename(library.path)+'.tasks-backups')).path;library.enableTaskSources();if(plan.pruned)saveLedger(library,plan.ledger);}
 yield progress('process');
 for(const task of selected){if(!force&&task.disposition==='duplicate'){report.skipped++;report.rows.push({index:task.index,outcome:'skipped'});yield progress('process');continue;}
  try{
   if(!force&&task.disposition==='legacy'){library.migrateTaskSource(task.legacyId!,task.legacyVersion!,task.source!,task.legacyBody!,task.description,randomUUID(),owner);report.converted++;report.rows.push({index:task.index,outcome:'converted'});yield progress('process');continue;}
   let receipt=force?plan.ledger.rows.slice().reverse().find(r=>r.identity===task.identity&&r.fingerprint===task.fingerprint&&r.force&&!r.noteId):plan.ledger.rows.find(r=>r.identity===task.identity&&r.fingerprint===task.fingerprint&&!r.force);
   if(!receipt){receipt={identity:task.identity!,fingerprint:task.fingerprint!,operationId:randomUUID(),noteId:null,...(force?{force:true as const}:{})};if(force)plan.ledger.version=2;plan.ledger.rows.push(receipt);saveLedger(library,plan.ledger);}
   const result=library.create(receipt.operationId,{primaryFormat:'text',title:task.title,body:task.body!,folderId:folderId as string|null},task.source);receipt.noteId=result.note.id;saveLedger(library,plan.ledger);
   report.imported++;report.rows.push({index:task.index,outcome:'imported'});
  }catch(e){report.failed++;report.rows.push({index:task.index,outcome:'failed',code:e instanceof TasksError||e instanceof LibraryError?e.code:'WRITE_FAILED'});}
  yield progress('process');
 }
 yield progress('done');return report;
}
export function executeTasks(plan:TasksPlan,indices:number[],folderId:unknown=null,force:unknown=false):TasksReport {const iterator=steps(plan,indices,folderId,undefined,force);let next=iterator.next();while(!next.done)next=iterator.next();return next.value;}
export async function executeTasksAsync(plan:TasksPlan,indices:number[],folderId:unknown,owner:string,progress:(value:Omit<BatchProgress,'token'>)=>void,guard:()=>void,force:unknown=false):Promise<TasksReport>{const iterator=steps(plan,indices,folderId,owner,force);let next;do{guard();next=iterator.next();if(!next.done){progress(next.value);await new Promise<void>(resolve=>setImmediate(resolve));}}while(!next.done);return next.value;}

