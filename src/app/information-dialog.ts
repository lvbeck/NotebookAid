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
        <ul>@for(file of notices;track file){<li>{{file}}</li>}</ul>
      }
      @case('privacy'){
        <h3>{{t('privacyTitle')}}</h3>
        @for(key of privacyKeys;track key){<p>{{t(key)}}</p>}
      }
      @case('about'){
        <div class="information-brand"><img src="assets/notebookaid-64.png" alt=""><div><h3>NotebookAid</h3><p>{{t('description')}}</p></div></div>
        <p>{{t('tagline')}}</p><dl><dt>{{t('version')}}</dt><dd data-testid="information-version">{{data.version}}</dd><dt>{{t('author')}}</dt><dd>Jin Lu</dd><dt>{{t('contact')}}</dt><dd>it@live.cn</dd></dl><p>Copyright © 2026 Jin Lu · BSD-3-Clause</p>
      }
    }
    <footer><button class="secondary" data-testid="information-dismiss" (click)="ref.close()"><app-icon name="X" />{{t('close')}}</button></footer>
  </section>`})
export class InformationDialog {
  readonly data=inject<{page:InformationPage;locale:Locale;version:string}>(DIALOG_DATA);
  readonly ref=inject(DialogRef);
  readonly license=projectLicense;
  readonly privacyKeys:InformationKey[]=['privacyLocal','privacyAi','privacyCredentials','privacyBridge','privacyBackup'];
  readonly notices=['NotebookAid-LICENSE.txt','renderer-THIRD-PARTY-LICENSES.txt','CDK-LICENSE.txt','DRIVER-JS-LICENSE.txt','ICAL-LICENSE.txt','PARSE5-LICENSE.txt','MARKED-LICENSE.txt','JOSE-LICENSE.txt'];
  t(key:InformationKey):string{return informationText(this.data.locale,key);}
}
