import { Component, Input } from '@angular/core';
import type { BatchProgress } from '../../shared/batch';
import type { Locale } from './i18n';
import { batchText } from './batch-i18n';
@Component({selector:'app-batch-progress',standalone:true,template:`
@if(value;as p){<section class="batch-progress" data-testid="batch-progress" [attr.data-phase]="p.phase"><div class="batch-line"><strong>{{label()}}</strong><span>{{p.phase==='backup'?'':percent()+'%'}}</span></div><div class="batch-track" [class.indeterminate]="p.phase==='backup'" role="progressbar" [attr.aria-label]="label()" [attr.aria-valuemin]="0" [attr.aria-valuemax]="p.total" [attr.aria-valuenow]="p.phase==='backup'?null:p.processed"><div [style.width.%]="p.phase==='backup'?30:percent()"></div></div><p>{{count()}}</p></section>}`,styles:[`.batch-progress{border-top:1px solid var(--line);padding-top:16px;margin-top:16px}.batch-line{display:flex;justify-content:space-between;gap:12px;font-variant-numeric:tabular-nums}.batch-track{height:8px;border-radius:8px;background:var(--surface-soft,var(--line));overflow:hidden;margin:12px 0}.batch-track>div{height:100%;background:var(--accent);border-radius:8px}.indeterminate>div{animation:batch-move 1.2s ease-in-out infinite}.batch-progress p{color:var(--muted);font-variant-numeric:tabular-nums}@keyframes batch-move{from{transform:translateX(-110%)}to{transform:translateX(440%)}}@media(prefers-reduced-motion:reduce){.indeterminate>div{animation:none;width:100%!important;opacity:.4}}`]})
export class BatchProgressComponent {
 @Input() value:BatchProgress|null=null;@Input() locale:Locale='zh-CN';
 label():string{return batchText(this.locale,this.value?.phase==='backup'?'backupPhase':this.value?.phase==='done'?'donePhase':'processPhase');}
 percent():number{return this.value?.total?Math.round(this.value.processed/this.value.total*100):0;}
 count():string{return batchText(this.locale,'processed').replace('{done}',String(this.value?.processed??0)).replace('{total}',String(this.value?.total??0));}
}
