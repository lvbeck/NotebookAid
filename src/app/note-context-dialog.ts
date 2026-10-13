import { Component, inject } from '@angular/core';
import { DIALOG_DATA,DialogRef } from '@angular/cdk/dialog';
import { FormsModule } from '@angular/forms';
import { SelectDirective } from './select.directive';
import { IconComponent } from './icon.component';
import { contextText,type ContextKey } from './context-i18n';
import { translate,type Locale } from './i18n';
import type { Tag } from '../../shared/organization';
export interface NoteContextData {action:'rename'|'move'|'tags';locale:Locale;title:string;folderId:string|null;tagIds:string[];folders:{id:string;path:string}[];tags:Tag[];}
@Component({standalone:true,imports:[FormsModule,SelectDirective,IconComponent],template:`
 <section class="app-confirm-dialog note-context-dialog" data-testid="note-context-dialog"><header><h2 id="note-context-title">{{t(data.action)}}</h2><button class="icon-button" [attr.aria-label]="t('cancel')" (click)="ref.close()"><app-icon name="X" /></button></header>
 @switch(data.action){
 @case('rename'){<label>{{t('title')}}<input data-testid="context-title" [(ngModel)]="title" maxlength="300" (keydown.enter)="save()"></label>}
 @case('move'){<label>{{t('folder')}}<select appSelect data-testid="context-folder" [(ngModel)]="folder"><option value="">{{unfiled}}</option>@for(row of data.folders;track row.id){<option [value]="row.id">{{row.path}}</option>}</select></label>}
 @case('tags'){@if(!data.tags.length){<p>{{t('noTags')}}</p>}@for(tag of data.tags;track tag.id){<label class="setting-row"><span><app-icon name="Tag" [style.color]="tag.color" />{{tag.name}}</span><input type="checkbox" [attr.data-context-tag]="tag.id" [checked]="data.tagIds.includes(tag.id)||selected.has(tag.id)" [disabled]="data.tagIds.includes(tag.id)" (change)="toggle(tag.id)"></label>}}
 }
 <footer><button class="secondary" data-testid="context-cancel" (click)="ref.close()"><app-icon name="X" />{{t('cancel')}}</button><button class="primary" data-testid="context-save" [disabled]="!valid()" (click)="save()"><app-icon name="Check" />{{t('save')}}</button></footer></section>`})
export class NoteContextDialog {
 readonly data=inject<NoteContextData>(DIALOG_DATA);readonly ref=inject(DialogRef);
 title=this.data.title;folder=this.data.folderId??'';selected=new Set<string>();readonly unfiled=translate(this.data.locale,'rootFolder');
 t(key:ContextKey):string{return contextText(this.data.locale,key);}
 toggle(id:string):void{this.selected.has(id)?this.selected.delete(id):this.selected.add(id);}
 valid():boolean{return this.data.action==='rename'?!!this.title.trim()&&this.title.length<=300&&!this.title.includes('\0'):this.data.action==='tags'?this.selected.size>0:true;}
 save():void{if(this.valid())this.ref.close(this.data.action==='rename'?this.title.trim():this.data.action==='move'?this.folder:[...this.selected]);}
}
