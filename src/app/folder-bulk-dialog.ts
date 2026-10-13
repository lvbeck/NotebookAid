import { Component, OnDestroy, inject, signal } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { FormsModule } from '@angular/forms';
import { SelectDirective } from './select.directive';
import { IconComponent } from './icon.component';
import { BatchProgressComponent } from './batch-progress.component';
import { batchText, type BatchKey } from './batch-i18n';
import { tasksError, tasksText } from './tasks-i18n';
import { translate, type Locale } from './i18n';
import type { BatchProgress, FolderBulkPreview, FolderBulkReport } from '../../shared/batch';
@Component({standalone:true,imports:[FormsModule,SelectDirective,IconComponent,BatchProgressComponent],template:`
<section class="app-confirm-dialog" data-testid="folder-bulk-dialog"><header><h2>{{b('bulkTitle')}}</h2><button class="icon-button" [disabled]="busy()" (click)="ref.close()" [attr.aria-label]="t('close')"><app-icon name="X" /></button></header><p>{{b('bulkHint')}}</p>
<label class="bulk-folder">{{label('folders')}}<select appSelect data-testid="bulk-folder" [disabled]="busy()||!!report()" [ngModel]="folderId()" (ngModelChange)="folderId.set($event);load()"><option value="">{{label('rootFolder')}}</option>@for(folder of data.folders();track folder.id){<option [value]="folder.id">{{folder.path}}</option>}</select></label>
<label class="bulk-check"><input type="checkbox" data-testid="bulk-children" [disabled]="busy()||!!report()||!folderId()" [ngModel]="children()" (ngModelChange)="children.set($event);load()">{{b('children')}}</label>
<div class="bulk-mode" role="radiogroup" [attr.aria-label]="b('bulkTitle')"><label><input type="radio" name="bulk-mode" value="trash" [disabled]="busy()||!!report()" [ngModel]="mode()" (ngModelChange)="mode.set($event);ack.set(false)">{{b('trash')}}</label><label><input type="radio" name="bulk-mode" value="delete" data-testid="bulk-delete-mode" [disabled]="busy()||!!report()" [ngModel]="mode()" (ngModelChange)="mode.set($event)">{{b('delete')}}</label></div>
@if(mode()==='delete'){<p class="warning">{{b('deleteHint')}}</p><label class="bulk-check"><input type="checkbox" data-testid="bulk-ack" [disabled]="busy()||!!report()" [ngModel]="ack()" (ngModelChange)="ack.set($event)">{{b('ack')}}</label>}
@if(preview();as p){<p data-testid="bulk-count">{{b('count').replace('{count}',p.count+'')}}</p>@if(!p.count){<p>{{b('empty')}}</p>}}
<app-batch-progress [locale]="data.locale" [value]="progress()" />
@if(report();as r){<p data-testid="bulk-report" aria-live="polite">{{b('succeeded')}}: {{r.succeeded}} · {{t('failed')}}: {{r.failed}}</p><p class="muted">{{t('backup')}}: {{r.backupPath}}</p>@for(row of r.rows;track row.id){@if(row.code){<p class="warning">{{row.id}} · {{errorText(row.code)}}</p>}}}
@if(error()){<p class="warning" role="alert">{{error()}}</p>}
<footer><button class="secondary" [disabled]="busy()" (click)="ref.close()"><app-icon name="X" />{{t(report()?'close':'cancel')}}</button>@if(!report()){<button class="primary" data-testid="bulk-confirm" [disabled]="busy()||!preview()?.count||(mode()==='delete'&&!ack())" (click)="confirm()"><app-icon name="Trash2" />{{b(mode()==='trash'?'trash':'confirmDelete')}}</button>}</footer></section>`,styles:[`.bulk-folder,.bulk-check{display:flex;align-items:center;gap:12px;margin:16px 0;flex-wrap:wrap}.bulk-mode{display:flex;gap:16px;flex-wrap:wrap}.bulk-mode label{display:flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:8px;padding:10px;background:var(--bg)}input{accent-color:var(--accent)}footer{flex-wrap:wrap}`]})
export class FolderBulkDialog implements OnDestroy {
 readonly data=inject<{locale:Locale;folderId:string|null;folders:()=>Array<{id:string;path:string}>;current:()=>boolean;prepare:()=>Promise<boolean>;refresh:()=>Promise<void>}>(DIALOG_DATA);readonly ref=inject(DialogRef);
 readonly folderId=signal(this.data.folderId??'');readonly children=signal(false);readonly mode=signal<'trash'|'delete'>('trash');readonly ack=signal(false);readonly busy=signal(false);readonly preview=signal<FolderBulkPreview|null>(null);readonly progress=signal<BatchProgress|null>(null);readonly report=signal<FolderBulkReport|null>(null);readonly error=signal('');
 private closed=false;private epoch=0;private timer=setInterval(()=>{if(!this.data.current()&&!this.busy())this.ref.close();},250);
 private unsubscribe=window.notebookAid.folderBulk.onProgress(value=>{if(value.token===this.preview()?.token&&!this.closed)this.progress.set(value);});
 constructor(){void this.load();}
 b(key:BatchKey):string{return batchText(this.data.locale,key);}t(key:Parameters<typeof tasksText>[1]):string{return tasksText(this.data.locale,key);}label(key:'folders'|'rootFolder'):string{return translate(this.data.locale,key);}errorText(code:string):string{return tasksError(this.data.locale,code);}
 async load():Promise<void>{if(this.busy())return;const epoch=++this.epoch;this.busy.set(true);this.error.set('');this.ack.set(false);const old=this.preview();this.preview.set(null);
  try{if(old)await window.notebookAid.folderBulk.cancel(old.token);const r=await window.notebookAid.folderBulk.preview(this.folderId()||null,!!this.folderId()&&this.children());if(!r.ok)throw Error(r.code);if(this.closed||epoch!==this.epoch){await window.notebookAid.folderBulk.cancel(r.value.token);return;}this.preview.set(r.value);}catch(e){if(!this.closed)this.error.set(this.errorText((e as Error).message));}finally{if(epoch===this.epoch)this.busy.set(false);}
 }
 async confirm():Promise<void>{const p=this.preview();if(!p||this.busy()||!this.data.current()||this.mode()==='delete'&&!this.ack())return;this.busy.set(true);this.error.set('');
  try{if(!await this.data.prepare())throw Error('NOTE_IN_USE');const r=await window.notebookAid.folderBulk.confirm(p.token,this.mode());if(!r.ok)throw Error(r.code);if(!this.closed)this.report.set(r.value);}catch(e){if(!this.closed)this.error.set(this.errorText((e as Error).message));}finally{await this.data.refresh();this.busy.set(false);}
 }
 ngOnDestroy():void{this.closed=true;this.epoch++;clearInterval(this.timer);this.unsubscribe();const token=this.preview()?.token;if(token)void window.notebookAid.folderBulk.cancel(token).catch(()=>{});}
}
