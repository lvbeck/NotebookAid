import { EasterBridge } from './easter-bridge';
import { Component, Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { DIALOG_DATA, Dialog, DialogRef } from '@angular/cdk/dialog';
import { firstValueFrom } from 'rxjs';
import { driver, type Driver, type DriveStep } from 'driver.js';
import { createElement, ChevronLeft, ChevronRight, Check, X } from 'lucide';
import { defaultOnboarding, type OnboardingState } from '../../shared/onboarding';
import { Preferences } from './preferences';
import { IconComponent } from './icon.component';
import { onboardingText, type OnboardingKey } from './onboarding-i18n';
import type { Locale } from './i18n';

interface PromptData { kind: 'welcome' | 'done'; locale: Locale; step: number; started: boolean; }
interface GuideContext { prepare(): void; settings(): void; available(): boolean; }
@Component({ standalone:true, imports:[IconComponent], template:`
  <section class="app-confirm-dialog onboarding-prompt" data-testid="onboarding-prompt">
    <header><span class="dialog-symbol" data-testid="onboarding-prompt-icon"><app-icon [name]="data.kind === 'done' ? 'CircleCheck' : 'Sparkles'" /></span><h2 id="onboarding-prompt-title">{{ t(data.kind === 'done' ? 'doneLabel' : 'title') }}</h2><button class="icon-button" data-testid="onboarding-prompt-close" [attr.aria-label]="t('close')" (click)="ref.close()"><app-icon name="X" /></button></header>
    <h3>{{ t(data.kind === 'done' ? 'doneTitle' : data.started ? 'resumeTitle' : 'welcome') }}</h3><p id="onboarding-prompt-copy">{{ t(data.kind === 'done' ? 'doneHint' : data.started ? 'resumeHint' : 'welcomeHint') }}</p>
    <footer>@if(data.kind === 'welcome'){<button class="secondary" data-testid="onboarding-later" (click)="ref.close()"><app-icon name="X" />{{ t('later') }}</button>}<button class="primary" data-testid="onboarding-start" (click)="ref.close(true)"><app-icon [name]="data.kind === 'done' ? 'Settings' : 'ChevronRight'" />{{ t(data.kind === 'done' ? 'settings' : data.started ? 'resume' : 'start') }}</button></footer>
  </section>` })
export class OnboardingPrompt {
  readonly data = inject<PromptData>(DIALOG_DATA);
  readonly ref = inject(DialogRef);
  t(key: OnboardingKey): string { return onboardingText(this.data.locale,key,this.data.step); }
}

@Injectable({providedIn:'root'})
export class Onboarding implements OnDestroy {
  private readonly prefs = inject(Preferences);
  private readonly dialogs = inject(Dialog);
  readonly active = signal(false);
  readonly busy = signal(false);
  readonly error = signal(false);
  private readonly eggs = inject(EasterBridge);
  readonly state = computed(() => this.prefs.state().global.onboarding ?? defaultOnboarding);
  private context?: GuideContext;
  private tour?: Driver;
  private prompt?: DialogRef<boolean>;
  private opening = false;
  private offered = false;
  private epoch = 0;
  private focus?: HTMLElement;
  private readonly stopDialog = this.dialogs.afterOpened.subscribe(() => { if (!this.opening && this.active()) this.stop(); });
  t(key: OnboardingKey): string { return onboardingText(this.prefs.locale(),key,this.state().step); }
  attach(context: GuideContext): void { this.context=context; }
  offer(): void {
    if(this.offered || this.active() || this.busy() || !this.prefs.ready() || !this.context?.available())return;
    const state=this.state();
    this.offered=true;
    if(state.enabled&&!state.completed)void this.welcome();
  }
  private async showPrompt(kind:PromptData['kind']):Promise<boolean>{
    this.opening=true;
    try {
      this.prompt=this.dialogs.open<boolean>(OnboardingPrompt,{data:{kind,locale:this.prefs.locale(),step:this.state().step,started:this.state().started},ariaLabelledBy:'onboarding-prompt-title',ariaDescribedBy:'onboarding-prompt-copy',panelClass:'app-dialog-panel',backdropClass:'app-dialog-backdrop',width:'460px',maxWidth:'calc(100vw - 32px)',autoFocus:'[data-testid=onboarding-start]',restoreFocus:true});
    } finally {this.opening=false;}
    const answer=await firstValueFrom(this.prompt.closed);this.prompt=undefined;return answer===true;
  }
  private async welcome():Promise<void>{
    const epoch=++this.epoch;this.active.set(true);
    const accepted=await this.showPrompt('welcome');
    if(epoch!==this.epoch)return;
    this.active.set(false);
    if(accepted)await this.begin(false);
  }
  private async persist(next:OnboardingState):Promise<boolean>{
    await this.prefs.update({onboarding:next},false);
    const saved=JSON.stringify(this.state())===JSON.stringify(next)&&!this.prefs.error();this.error.set(!saved);return saved;
  }
  async enable(enabled:boolean):Promise<void>{
    if(this.busy()||this.active())return;
    this.busy.set(true);this.offered=true;
    try {await this.persist({...this.state(),enabled});} finally {this.busy.set(false);}
  }
  async begin(restart:boolean):Promise<void>{
    if(this.busy()||this.active()||!this.state().enabled||!this.context?.available()||this.dialogs.openDialogs.length)return;
    const epoch=++this.epoch;this.offered=true;this.busy.set(true);this.active.set(true);this.error.set(false);this.focus=document.activeElement instanceof HTMLElement?document.activeElement:undefined;
    try {
      await this.prefs.idle();
      const state={...this.state(),started:true,completed:false,step:restart?0:this.state().step};
      if(!await this.persist(state)||epoch!==this.epoch){if(epoch===this.epoch){this.stop();this.context?.settings();}return;}
      this.context.prepare();
      await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
      if(epoch!==this.epoch)return;
      this.tour=driver({animate:false,stagePadding:6,stageRadius:9,overlayOpacity:.54,overlayClickBehavior:'none',disableActiveInteraction:true,allowKeyboardControl:false,showProgress:true,showButtons:['previous','next','close'],popoverClass:'notebookaid-guide',closeBtnLabel:this.t('close'),steps:this.steps(),onPopoverRender:popover=>{
        const heading=document.createElement('div');heading.className='onboarding-step-heading';popover.progress.textContent=this.t('progress');heading.append(popover.progress,popover.closeButton);popover.wrapper.prepend(heading);
        popover.wrapper.dataset['testid']='onboarding-step';popover.wrapper.dataset['step']=String(this.state().step);
        const label=(text:string)=>{const span=document.createElement('span');span.className='onboarding-button-label';span.textContent=text;return span;};
        popover.previousButton.replaceChildren(createElement(ChevronLeft,{'aria-hidden':'true'}),label(this.t('previous')));
        popover.nextButton.replaceChildren(label(this.t(this.state().step===5?'finish':'next')),createElement(this.state().step===5?Check:ChevronRight,{'aria-hidden':'true'}));
        popover.closeButton.replaceChildren(createElement(X,{'aria-hidden':'true'}));popover.closeButton.setAttribute('aria-label',this.t('close'));popover.nextButton.focus({preventScroll:true});
      },onNextClick:()=>{void this.move(1);},onPrevClick:()=>{void this.move(-1);},onDoneClick:()=>{void this.finish();},onCloseClick:()=>{this.stop();},onDestroyStarted:()=>{this.stop();}});
      this.tour.drive(state.step);
    } catch {this.error.set(true);this.stop();this.context?.settings();}
    finally {this.busy.set(false);}
  }
  private steps():DriveStep[]{
    const entries:[string,OnboardingKey,OnboardingKey][]=[['[data-testid=libraries-tab]','notebookTitle','notebookHint'],['[data-testid=create-note]','newTitle','newHint'],['.note-list','listTitle','listHint'],['.editor-heading','saveTitle','saveHint'],['[data-testid=organization-tab]','organizeTitle','organizeHint'],['[data-testid=settings-tab]','settingsTitle','settingsHint']];
    return entries.map(([selector,title,description])=>{const target=document.querySelector(selector);const visible=target?.getClientRects().length?target:title==='saveTitle'?document.querySelector('[data-testid=editor-empty]'):null;return{...(visible?.getClientRects().length?{element:visible}:{}),popover:{title:this.t(title),description:this.t(description),side:'right',align:'start'}};});
  }
  private buttons(disabled:boolean):void {document.querySelectorAll<HTMLButtonElement>('.notebookaid-guide button').forEach(button=>button.disabled=disabled || button.classList.contains('driver-popover-prev-btn') && this.state().step===0);}
  private async move(direction:-1|1):Promise<void>{
    if(this.busy()||!this.tour?.isActive())return;
    if(direction===1&&this.state().step===5){await this.finish();return;}
    const step=Math.max(0,Math.min(5,this.state().step+direction));if(step===this.state().step)return;
    const epoch=this.epoch;this.busy.set(true);this.buttons(true);
    try {if(await this.persist({...this.state(),step})&&epoch===this.epoch)this.tour?.moveTo(step);}
    finally {this.busy.set(false);this.buttons(false);if(this.error()&&epoch===this.epoch){this.stop();this.context?.settings();}}
  }
  private async finish():Promise<void>{
    if(this.busy())return;
    const epoch=this.epoch;this.busy.set(true);this.buttons(true);
    try {
      if(!await this.persist({...this.state(),started:true,completed:true,step:5})||epoch!==this.epoch)return;
      this.tour?.destroy();this.tour=undefined;
      const accepted=await this.showPrompt('done');
      if(epoch===this.epoch){this.active.set(false);if(accepted)this.context?.settings(); void this.eggs.collect('explorer');}
    } finally {this.busy.set(false);if(this.error()&&epoch===this.epoch){this.stop();this.context?.settings();}}
  }
  stop():void{this.epoch++;this.tour?.destroy();this.tour=undefined;this.prompt?.close();this.prompt=undefined;this.active.set(false);const focus=this.focus;this.focus=undefined;requestAnimationFrame(()=>{if(!this.active()&&!this.dialogs.openDialogs.length){const target=focus?.isConnected&&focus.getClientRects().length?focus:document.querySelector<HTMLElement>('[data-testid=settings-tab]');target?.focus({preventScroll:true});}});}
  private readonly keydown=(event:KeyboardEvent)=>{
    if(!this.tour?.isActive())return;
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();if(!this.busy())this.stop();}
    else if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();if(!event.repeat&&!event.isComposing)void this.move(event.key==='ArrowLeft'?-1:1);}
  };
  constructor(){window.addEventListener('keydown',this.keydown,true);}
  ngOnDestroy():void{this.stop();this.stopDialog.unsubscribe();window.removeEventListener('keydown',this.keydown,true);}
}
