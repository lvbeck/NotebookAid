import type { BrowserWindow } from 'electron';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { onboardingText } from '../src/app/onboarding-i18n';
import { languages, regionalLocale } from '../src/app/i18n';

export async function smokeOnboarding(window:BrowserWindow,root:string):Promise<void>{
 const run=(script:string)=>window.webContents.executeJavaScript(script);
 const until=async(script:string)=>{for(let n=0;n<160;n++){if(await run(script))return;await new Promise(r=>setTimeout(r,100));}throw Error('Onboarding timeout: '+script);};
 const click=async(selector:string)=>{await until(`!!document.querySelector(${JSON.stringify(selector)})&&!document.querySelector(${JSON.stringify(selector)}).disabled`);await run(`document.querySelector(${JSON.stringify(selector)}).click()`);};
 const state=async()=>{const r=await run('window.notebookAid.library.settings({locale:null,theme:null,autosave:null})');if(!r.ok)throw Error(r.code);return r.value.global.onboarding;};
 const empty=async()=>{const r=await run('window.notebookAid.library.list()');if(!r.ok||r.value.length)throw Error('Guide created or changed notes');};
 const capture=async(name:string)=>{window.showInactive();await run('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');await new Promise(r=>setTimeout(r,180));writeFileSync(join(root,name),(await window.webContents.capturePage()).toPNG());};
 const aligned=()=>run("(()=>{const icon=document.querySelector('[data-testid=onboarding-prompt-icon]').getBoundingClientRect(),label=document.querySelector('#onboarding-prompt-title').getBoundingClientRect();return label.left>=icon.right&&Math.abs(icon.top+icon.height/2-label.top-label.height/2)<.5;})()");
 const buttonLayout=async()=>{
   const result=await run("(()=>{const buttons=[...document.querySelectorAll('.notebookaid-guide .driver-popover-footer button')];return buttons.length===2&&buttons.every(button=>{const icon=button.querySelector('svg').getBoundingClientRect(),label=button.querySelector('.onboarding-button-label').getBoundingClientRect(),rect=button.getBoundingClientRect();return Math.abs(icon.top+icon.height/2-label.top-label.height/2)<.5&&Math.abs(icon.top+icon.height/2-rect.top-rect.height/2)<.5;});})()");
   if(!result)throw Error('Guide button icons and labels misaligned: '+JSON.stringify(await run("[...document.querySelectorAll('.notebookaid-guide .driver-popover-footer button')].map(button=>({button:button.getBoundingClientRect().toJSON(),icon:button.querySelector('svg').getBoundingClientRect().toJSON(),label:button.querySelector('.onboarding-button-label').getBoundingClientRect().toJSON(),display:getComputedStyle(button).display,align:getComputedStyle(button).alignItems}))")));
   if(!await run("(()=>{const button=document.querySelector('.driver-popover-close-btn');button.focus();const style=getComputedStyle(button);return style.outlineStyle==='none'&&style.borderTopWidth==='0px';})()"))throw Error('Guide close button has an outer highlight');
 };
 const step=async(index:number)=>{await until(`document.querySelector('[data-testid=onboarding-step]')?.dataset.step==='${index}'&&!document.querySelector('.driver-popover-next-btn').disabled`);await buttonLayout();};
 await until("document.querySelector('app-root')?.dataset.ready==='true'");
 const phase=process.env['NOTEBOOKAID_GUIDE_PHASE']??'first';
 if(phase==='resume'){
   await until("!!document.querySelector('[data-testid=onboarding-prompt]')");if(!await run("document.querySelector('#onboarding-prompt-copy').textContent.includes('3／6')"))throw Error('Resume prompt lost progress');
   await click('[data-testid=onboarding-start]');await step(2);
   for(let n=2;n<6;n++){await step(n);await click('.driver-popover-next-btn');}
   await until("document.querySelector('#onboarding-prompt-title')?.textContent==='引导完成'");if(!await aligned())throw Error('Completion heading misaligned');await capture('guide-complete.png');
   await click('[data-testid=onboarding-start]');await until("document.querySelector('[data-testid=onboarding-status]')?.textContent.includes('已完成')");
   const saved=await state();if(!saved.completed||saved.step!==5)throw Error('Completion not durable');await empty();writeFileSync(join(root,'guide-resume.json'),JSON.stringify({resumeAfterRestart:true,completed:true,alignedCompletion:true,noNoteWrites:true}));return;
 }
 if(phase==='completed'||phase==='disabled'){
   await until("!!document.querySelector('[data-testid=create-note]')&&!document.querySelector('[data-testid=create-note]').disabled");await new Promise(r=>setTimeout(r,500));
   if(await run("!!document.querySelector('[data-testid=onboarding-prompt],.notebookaid-guide')"))throw Error('Guide reappeared automatically');
   await click('[data-testid=settings-tab]');await until("document.querySelector('[data-testid=onboarding-settings]').getClientRects().length>0");
   if(phase==='completed'){
     for(const language of languages){await run(`{const input=document.querySelector('[data-testid=language]');input.value=${JSON.stringify(language.code)};input.dispatchEvent(new Event('change',{bubbles:true}));}`);await until(`document.documentElement.lang===${JSON.stringify(regionalLocale(language.code))}&&!document.querySelector('[data-testid=language]').disabled`);if(!await run(`document.querySelector('[data-testid=onboarding-status]').textContent===${JSON.stringify(onboardingText(language.code,'completed'))}`))throw Error('Guide status not localized');}
     await run("{const input=document.querySelector('[data-testid=language]');input.value='zh-CN';input.dispatchEvent(new Event('change',{bubbles:true}));}");await until("!document.querySelector('[data-testid=language]').disabled");
     await click('[data-testid=onboarding-restart]');await step(0);if((await state()).completed)throw Error('Restart did not clear completion');
     await run("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}))");await until("!document.querySelector('.notebookaid-guide')");await click('[data-testid=settings-tab]');
     await click('[data-testid=onboarding-enabled]');await until("document.querySelector('[data-testid=onboarding-restart]').disabled && !document.querySelector('[data-testid=onboarding-enabled]').checked");
   }else if(!await run("!document.querySelector('[data-testid=onboarding-enabled]').checked&&document.querySelector('[data-testid=onboarding-restart]').disabled"))throw Error('Disabled state lost');
   await empty();writeFileSync(join(root,phase==='completed'?'guide-completed.json':'guide-disabled.json'),JSON.stringify({suppressedOnRestart:true,eightLanguages:phase==='completed',restartResets:phase==='completed',disabledPersists:true,noNoteWrites:true}));return;
 }
 await until("!!document.querySelector('[data-testid=onboarding-prompt]')");if(!await aligned())throw Error('Welcome heading misaligned');await capture('guide-welcome.png');
 await click('[data-testid=onboarding-later]');await click('[data-testid=settings-tab]');await until("document.querySelector('[data-testid=onboarding-settings]').getClientRects().length>0");
 await click('[data-testid=onboarding-enabled]');await until("document.querySelector('[data-testid=onboarding-restart]').disabled");await click('[data-testid=onboarding-enabled]');await until("!document.querySelector('[data-testid=onboarding-restart]').disabled");
 await click('[data-testid=onboarding-restart]');await step(0);await click('.driver-popover-next-btn');await step(1);await capture('guide-spotlight-light.png');
 await click('.driver-popover-next-btn');await step(2);
 writeFileSync(join(root,'simulate-settings-failure'),'1');await click('.driver-popover-next-btn');await until("!!document.querySelector('[data-testid=onboarding-error]')");unlinkSync(join(root,'simulate-settings-failure'));if((await state()).step!==2)throw Error('Failed write advanced progress');
 await click('[data-testid=onboarding-resume]');await step(2);
 // Native close must interrupt the guide and expose the existing safe close dialog.
 window.close();await until("!!document.querySelector('[data-testid=dialog-cancel]')&&!document.querySelector('.notebookaid-guide')");await click('[data-testid=dialog-cancel]');await until("!document.querySelector('[data-testid=app-dialog]')");
 await click('[data-testid=settings-tab]');await until("!!document.querySelector('[data-testid=onboarding-resume]')");
 await run("{const input=document.querySelector('[data-testid=theme]');input.value='dark';input.dispatchEvent(new Event('change',{bubbles:true}));}");await until("document.documentElement.dataset.theme==='dark'&&!document.querySelector('[data-testid=theme]').disabled");
 await click('[data-testid=onboarding-resume]');await step(2);await capture('guide-spotlight-dark.png');await run("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}))");await until("!document.querySelector('.notebookaid-guide')");
 await click('[data-testid=settings-tab]');await click('[data-testid=sidebar-toggle]');
 await run("{const input=document.querySelector('[data-testid=interface-zoom]');input.value='200';input.dispatchEvent(new Event('change',{bubbles:true}));}");await until("document.querySelector('[data-testid=interface-zoom]').value==='200'&&!document.querySelector('[data-testid=interface-zoom]').disabled");
 await click('[data-testid=onboarding-resume]');await step(2);
 if(!await run("(()=>{const rect=document.querySelector('.notebookaid-guide').getBoundingClientRect();return rect.left>=0&&rect.right<=innerWidth+1&&rect.top>=0&&rect.bottom<=innerHeight+1;})()"))throw Error('Guide popup exceeds zoomed viewport');
 await capture('guide-collapsed-200.png');await run("window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}))");await until("!document.querySelector('.notebookaid-guide')");
 await click('[data-testid=settings-tab]');await run("{const input=document.querySelector('[data-testid=interface-zoom]');input.value='100';input.dispatchEvent(new Event('change',{bubbles:true}));}");await until("document.querySelector('[data-testid=interface-zoom]').value==='100'&&!document.querySelector('[data-testid=interface-zoom]').disabled");
 await empty();writeFileSync(join(root,'guide-first.json'),JSON.stringify({welcome:true,alignedWelcome:true,later:true,settingsToggle:true,spotlight:true,resume:true,failedProgressPreserved:true,nativeCloseInterrupts:true,lightDark:true,collapsedZoom:true,noNoteWrites:true}));
}
