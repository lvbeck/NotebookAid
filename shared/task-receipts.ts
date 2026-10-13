export interface TasksReceipt { identity:string; fingerprint:string; operationId:string; noteId:string|null; force?:true; }
export interface TasksLedger { version:1|2; libraryId:string; rows:TasksReceipt[]; }
export function validateTasksLedger(value:unknown,libraryId:string):asserts value is TasksLedger {
 const ledger=value as TasksLedger,uuid=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i,digest=/^[a-f0-9]{64}$/;
 if(!ledger||![1,2].includes(ledger.version)||ledger.libraryId!==libraryId||!Array.isArray(ledger.rows)||ledger.rows.length>10000||ledger.rows.some(r=>!r||!digest.test(r.identity)||!digest.test(r.fingerprint)||!uuid.test(r.operationId)||(r.noteId!==null&&!uuid.test(r.noteId))||(r.force!==undefined&&(ledger.version!==2||r.force!==true)))||new Set(ledger.rows.map(r=>r.identity+r.fingerprint+(r.force?r.operationId:''))).size!==ledger.rows.length)throw Error('Invalid Tasks receipts');
}
