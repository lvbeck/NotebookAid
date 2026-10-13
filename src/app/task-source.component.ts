import { Component, Input } from '@angular/core';
import type { TaskSource } from '../../shared/task-source';
import type { Locale } from './i18n';
import { batchText } from './batch-i18n';
import { IconComponent } from './icon.component';
@Component({selector:'app-task-source',standalone:true,imports:[IconComponent],template:`
@if(value;as source){<details class="task-source" open data-testid="task-source"><summary><span><app-icon name="FileText" />{{label('source')}}</span><span class="muted"><app-icon name="LockKeyhole" />{{label('readonly')}}</span></summary><dl><div class="task-uid"><dt>UID</dt><dd>{{source.uid}}</dd></div>@for(field of fields();track field[0]){<div><dt>{{field[0].toUpperCase()}}</dt><dd>{{field[1]}}</dd></div>}</dl></details>}`,styles:[`.task-source{border-top:1px solid var(--line);margin-top:18px;padding:14px 0}.task-source summary,.task-source summary span{display:flex;align-items:center;gap:8px}.task-source summary{justify-content:space-between;cursor:pointer}.task-source dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 24px}.task-source .task-uid{grid-column:1/-1}dt{color:var(--muted);font-size:12px}dd{margin:4px 0 0;white-space:pre-wrap;overflow-wrap:anywhere;user-select:text}@media(max-width:600px){.task-source dl{grid-template-columns:1fr}}`]})
export class TaskSourceComponent {
 @Input() value:TaskSource|undefined;@Input() locale:Locale='zh-CN';
 label(key:'source'|'readonly'):string{return batchText(this.locale,key);}
 fields():[string,string][]{return Object.entries(this.value?.fields??{});}
}
