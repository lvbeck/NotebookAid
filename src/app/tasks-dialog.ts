import { BatchProgressComponent } from './batch-progress.component';
import { batchText,type BatchKey } from './batch-i18n';
import type { BatchProgress } from '../../shared/batch';
import { Component, OnDestroy, inject, signal } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { SelectDirective } from './select.directive';
import { FormsModule } from '@angular/forms';
import { translate } from './i18n';
import { IconComponent } from './icon.component';
import { tasksError, tasksText } from './tasks-i18n';
import type { Locale } from './i18n';
import type { TasksPreview, TasksReport, TaskPreviewRow } from '../../shared/tasks';
@Component({standalone:true,imports:[IconComponent,FormsModule,SelectDirective,BatchProgressComponent],template:`
<section class="app-confirm-dialog tasks-dialog" data-testid="tasks-dialog"><header><h2>{{t('title')}}</h2><button class="icon-button" [disabled]="busy()" (click)="ref.close()" [attr.aria-label]="t('close')"><app-icon name="X" /></button></header>
<p>{{t('hint')}}</p><p class="muted">{{b('schemaHint')}}</p><label class="task-folder"><span>{{folderLabel()}}</span><select appSelect [attr.aria-label]="folderLabel()" data-testid="tasks-folder" [disabled]="busy()||!!report()" [ngModel]="folderId()" (ngModelChange)="folderId.set($event)"><option value="">{{unfiledLabel()}}</option>@for(folder of data.folders();track folder.id){<option [value]="folder.id">{{folder.path}}</option>}</select></label><p class="muted">{{t('mapping')}}</p>
@if(preview();as p){<p>{{p.file}} · {{t('ignored')}}: {{p.ignored}}</p>@if(!p.rows.length){<p>{{t('empty')}}</p>}
@if(!report()){<label class="task-force"><input type="checkbox" data-testid="tasks-force" [disabled]="busy()" [ngModel]="force()" (ngModelChange)="toggleForce($event)">{{b('force')}}</label>@if(force()){<p class="warning">{{b('forceHint')}}</p>}}
<div class="task-rows">@for(row of p.rows;track row.index){<article [attr.data-task-index]="row.index"><label class="task-selection"><input type="checkbox" [checked]="selected().has(row.index)" [disabled]="busy()||!!report()||row.disposition==='invalid'||(row.disposition==='duplicate'&&!force())" (change)="toggle(row.index)" [attr.aria-label]="t('select')+': '+row.title"><strong>{{row.title||'VTODO '+(row.index+1)}}</strong><span class="muted">{{force()&&row.disposition!=='invalid'?b('forceRow'):row.disposition==='legacy'?b('legacy'):t(row.disposition)}}</span></label>
@if(row.error){<p class="warning">{{errorText(row.error)}}</p>}@for(warning of row.warnings;track warning){<p class="warning">{{errorText(warning)}}</p>}
<details><summary>DESCRIPTION / STATUS / PRIORITY / DTSTART / DUE</summary><pre>{{row.description}}</pre>@for(field of fields(row);track field[0]){<p><strong>{{field[0].toUpperCase()}}</strong>: {{field[1]}}</p>}</details></article>}</div>}
<app-batch-progress [locale]="data.locale" [value]="progress()" />
@if(report();as r){<h3>{{t('report')}}</h3><p data-testid="tasks-report">{{t('imported')}}: {{r.imported}} · {{b('converted')}}: {{r.converted}} · {{t('skipped')}}: {{r.skipped}} · {{t('failed')}}: {{r.failed}} · {{t('invalid')}}: {{r.invalid}}</p>@if(r.backupPath){<p class="muted">{{t('backup')}}: {{r.backupPath}}</p>}@for(row of r.rows;track row.index){@if(row.code){<p class="warning">{{row.index+1}}: {{errorText(row.code)}}</p>}}}
@if(error()){<p role="alert" class="warning" data-testid="tasks-error">{{error()}}</p>}
<footer><button class="secondary" [disabled]="busy()" (click)="ref.close()"><app-icon name="X" />{{t(report()?'close':'cancel')}}</button>@if(!report()){<button class="secondary" [disabled]="busy()" data-testid="tasks-choose" (click)="load()"><app-icon name="FileInput" />{{t('choose')}}</button><button class="primary" data-testid="tasks-confirm" [disabled]="busy()||!preview()||!selected().size" (click)="confirm()"><app-icon name="Check" />{{t('confirm')}}</button>}</footer></section>`,styles:[`.tasks-dialog{max-height:85vh;overflow:auto}.task-rows{max-height:40vh;overflow:auto}.task-rows article{border:1px solid var(--line);border-radius:8px;padding:12px;margin:8px 0}.task-selection{display:flex;align-items:center;gap:10px}.task-selection input{accent-color:var(--accent);width:16px;height:16px;flex-shrink:0}.task-selection .muted{margin-left:auto}pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:160px;overflow:auto}details p{overflow-wrap:anywhere}.task-force{display:flex;align-items:center;gap:10px;margin:16px 0}.task-force input{accent-color:var(--accent)}.task-folder{display:flex;align-items:center;gap:12px;margin:20px 0}.task-folder select{min-width:180px;max-width:100%}footer{flex-wrap:wrap}`]})
export class TasksDialog implements OnDestroy {
 readonly data=inject<{locale:Locale;folders:()=>Array<{id:string;path:string}>;current:()=>boolean;refresh:()=>Promise<void>}>(DIALOG_DATA);readonly ref=inject(DialogRef);
 readonly preview=signal<TasksPreview|null>(null);readonly selected=signal(new Set<number>());readonly busy=signal(false);readonly error=signal('');readonly report=signal<TasksReport|null>(null);readonly progress=signal<BatchProgress|null>(null);
 private unsubscribe=window.notebookAid.tasks.onProgress(value=>{if(value.token===this.preview()?.token&&!this.closed)this.progress.set(value);});
 private closed=false;private epoch=0;private timer=setInterval(()=>{if(!this.data.current())this.ref.close();},250);
 readonly folderId=signal('');readonly force=signal(false);
 toggleForce(value:boolean):void{this.force.set(value);this.selected.update(previous=>{const next=new Set(previous);for(const row of this.preview()?.rows??[])if(row.disposition==='duplicate'){if(value)next.add(row.index);else next.delete(row.index);}return next;});}
 folderLabel():string{return translate(this.data.locale,'folders');}
 unfiledLabel():string{return translate(this.data.locale,'rootFolder');}
 b(key:BatchKey):string{return batchText(this.data.locale,key);}
 t(key:Parameters<typeof tasksText>[1]):string{return tasksText(this.data.locale,key);}
 errorText(code:string):string{return tasksError(this.data.locale,code);}
 fields(row:TaskPreviewRow):[string,string][]{return Object.entries(row.fields);}
 toggle(index:number):void{this.selected.update(previous=>{const next=new Set(previous);if(next.has(index))next.delete(index);else next.add(index);return next;});}
 async load():Promise<void>{if(this.busy())return;this.busy.set(true);this.error.set('');const epoch=++this.epoch;
  try{const old=this.preview();if(old)await window.notebookAid.tasks.cancel(old.token);this.force.set(false);this.preview.set(null);this.progress.set(null);this.selected.set(new Set());const result=await window.notebookAid.tasks.preview();
   if(this.closed||epoch!==this.epoch||!this.data.current()){if(result.ok&&result.value)await window.notebookAid.tasks.cancel(result.value.token);return;}
   if(!result.ok)throw Error(result.code);if(result.value){this.preview.set(result.value);this.selected.set(new Set(result.value.rows.filter(r=>r.disposition!=='invalid'&&r.disposition!=='duplicate').map(r=>r.index)));}
  }catch(e){if(!this.closed)this.error.set(this.errorText((e as Error).message));}finally{if(epoch===this.epoch)this.busy.set(false);}
 }
 async confirm():Promise<void>{const p=this.preview();if(!p||this.busy()||!this.data.current())return;this.busy.set(true);this.error.set('');
  try{const result=await window.notebookAid.tasks.confirm(p.token,[...this.selected()],this.folderId()||null,this.force());if(!result.ok)throw Error(result.code);if(!this.closed){this.report.set(result.value);await this.data.refresh();}}
  catch(e){if(!this.closed)this.error.set(this.errorText((e as Error).message));}finally{this.busy.set(false);}
 }
 ngOnDestroy():void{this.closed=true;this.epoch++;clearInterval(this.timer);this.unsubscribe();const token=this.preview()?.token;if(token)void window.notebookAid.tasks.cancel(token).catch(()=>{});}
}
