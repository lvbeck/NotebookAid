import { signal } from '@angular/core';
import { thirdPartyText } from './third-party-i18n';
import type { ThirdPartyCatalog } from '../../shared/contracts';
import { EasterBridge } from './easter-bridge';
import { Component, inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { IconComponent } from './icon.component';
import { informationText, type InformationKey } from './information-i18n';
import type { Locale } from './i18n';
import { projectLicense } from './project-license';

export type InformationPage = 'license' | 'privacy' | 'about';
@Component({standalone:true,imports:[IconComponent],template:`
  <section class="app-confirm-dialog information-dialog" data-testid="information-dialog" [attr.data-page]="data.page">
    <header><h2 id="information-title">{{t(data.page)}}</h2><button class="icon-button" data-testid="information-close" [attr.aria-label]="t('close')" (click)="ref.close()"><app-icon name="X" /></button></header>
    @switch(data.page){
      @case('license'){
        <h3>{{t('project')}}</h3><pre class="license-text">{{license}}</pre>
        <h3>{{t('thirdParty')}}</h3><p>{{t('thirdPartyHint')}}</p>
        @if(catalog(); as entries){
          <div class="third-party-table"><table data-testid="third-party-components"><thead><tr><th>{{label(0)}}</th><th>{{t('version')}}</th><th>{{t('license')}}</th></tr></thead><tbody>@for(item of entries.components;track item.name+'@'+item.version){<tr><td>{{item.name}}</td><td>{{item.version}}</td><td>{{item.license}}</td></tr>}</tbody></table></div>
          <h3>{{label(3)}}</h3><ul>@for(file of entries.noticeFiles;track file){<li>{{file}}</li>}</ul>
        } @else { <p role="status">{{label(failed()?2:1)}}</p> }<button class="icon-button" data-testid="egg-opensource" [attr.aria-label]="t('project')" (click)="eggs.collect('opensource')"><app-icon name="Heart" /></button>
      }
      @case('privacy'){
        <h3>{{t('privacyTitle')}}</h3>
        @for(key of privacyKeys;track key){<p>{{t(key)}}</p>}
      }
      @case('about'){
        <div class="information-brand"><img src="assets/notebookaid-64.png" alt=""><div><h3>NotebookAid</h3><p>{{t('description')}}</p></div></div>
        <p>{{taglinePrefix()}}<button class="easter-slogan" data-testid="egg-echo" (click)="eggs.collect('echo')">{{taglineEcho()}}</button></p><dl><dt>{{t('version')}}</dt><dd data-testid="information-version">{{data.version}}</dd><dt>{{t('author')}}</dt><dd>Jin Lu</dd><dt>{{t('contact')}}</dt><dd>it@live.cn</dd></dl><p>Copyright © 2026 Jin Lu · BSD-3-Clause</p>
      }
    }
    <footer><button class="secondary" data-testid="information-dismiss" (click)="ref.close()"><app-icon name="X" />{{t('close')}}</button></footer>
  </section>`})
export class InformationDialog {
  readonly data=inject<{page:InformationPage;locale:Locale;version:string}>(DIALOG_DATA);
  readonly ref=inject(DialogRef);
  readonly eggs=inject(EasterBridge);
  readonly license=projectLicense;
  readonly privacyKeys:InformationKey[]=['privacyLocal','privacyAi','privacyCredentials','privacyBridge','privacyBackup'];
  readonly catalog=signal<ThirdPartyCatalog|null>(null);
  readonly failed=signal(false);
  label(index:0|1|2|3):string{return thirdPartyText(this.data.locale,index);}
  constructor(){if(this.data.page==='license')void window.notebookAid.thirdPartyCatalog().then(value=>this.catalog.set(value)).catch(()=>this.failed.set(true));}
  t(key:InformationKey):string{return informationText(this.data.locale,key);}
  private taglineBreak():number { const text=this.t('tagline');return Math.max(text.lastIndexOf(','),text.lastIndexOf('，'))+1; }
  taglinePrefix():string { return this.t('tagline').slice(0,this.taglineBreak()); }
  taglineEcho():string { return this.t('tagline').slice(this.taglineBreak()); }
}
