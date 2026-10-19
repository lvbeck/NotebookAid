import type { BrowserWindow } from 'electron';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { loginStartupText } from '../src/app/login-startup-i18n';
import { skinName } from '../shared/notebook-skin';
import type { Locale } from '../src/app/i18n';
export async function smokeLoginStartup(window: BrowserWindow, directory: string): Promise<void> {
  const run=(script:string)=>window.webContents.executeJavaScript(script);
  const until=async(script:string)=>{for(let i=0;i<200;i++){if(await run(script))return;await new Promise(resolve=>setTimeout(resolve,80));}throw Error('Startup settings timeout: '+script);};
  const click=async(selector:string)=>{await until('!!document.querySelector('+JSON.stringify(selector)+') && !document.querySelector('+JSON.stringify(selector)+').disabled');await run('document.querySelector('+JSON.stringify(selector)+').click()');};
  await click('[data-testid=settings-tab]');
  await until('!!document.querySelector("[data-testid=login-startup-enabled]") && !document.querySelector("[data-testid=login-startup-enabled]").disabled');
  if(!await run('!document.querySelector("[data-testid=login-startup-enabled]").checked && document.querySelector("[data-testid=login-startup-background]").checked && document.querySelector("[data-testid=login-startup-window]").disabled'))throw Error('Incorrect startup defaults');
  if(!await run('document.querySelector("[data-testid=basic-settings]").nextElementSibling.dataset.testid === "startup-settings" && document.querySelector("[data-testid=startup-settings]").nextElementSibling.dataset.testid === "interface-settings"'))throw Error('Incorrect settings order');
  if(!await run('(()=>{const group=document.querySelector(".login-startup-modes");return group.getBoundingClientRect().top-group.previousElementSibling.getBoundingClientRect().bottom>=15;})()'))throw Error('Startup mode spacing is missing');
  await click('[data-testid=login-startup-enabled]');
  await until('!document.querySelector("[data-testid=login-startup-window]").disabled');
  await click('[data-testid=login-startup-window]');
  await until('document.querySelector("[data-testid=login-startup-window]").checked && !document.querySelector("[data-testid=login-startup-enabled]").disabled');
  writeFileSync(join(directory,'simulate-settings-failure'),'1');
  await click('[data-testid=login-startup-background]');
  await until('!!document.querySelector("[data-testid=settings-error]") && document.querySelector("[data-testid=login-startup-window]").checked && !document.querySelector("[data-testid=login-startup-background]").checked');
  unlinkSync(join(directory,'simulate-settings-failure'));
  const result=await run('window.notebookAid.library.settings({locale:null,theme:null,autosave:null})');
  if(result.value.global.loginStartup.mode!=='window')throw Error('Window mode did not persist');
  for(const locale of ['en','de','fr','it','es','pt-PT','zh-CN','zh-TW','ja','ko'] as Locale[]){
    await run('document.querySelector("[data-testid=language]").value='+JSON.stringify(locale)+';document.querySelector("[data-testid=language]").dispatchEvent(new Event("change",{bubbles:true}))');
    await until('document.querySelector("[data-testid=startup-settings] h2").textContent==='+JSON.stringify(loginStartupText(locale,'title')));
    if(!skinName(locale,0))throw Error('Missing skin translation');
  }
  await run('document.querySelector("[data-testid=language]").value="zh-CN";document.querySelector("[data-testid=language]").dispatchEvent(new Event("change",{bubbles:true}))');
  await until('document.querySelector("[data-testid=startup-settings] h2").textContent==="启动设置"');
  window.showInactive();await run('document.querySelector("[data-testid=startup-settings]").scrollIntoView({block:"center"})');await new Promise(resolve=>setTimeout(resolve,250));writeFileSync(join(directory,'startup-settings.png'),(await window.webContents.capturePage()).toPNG());
  await click('[data-testid=login-startup-enabled]');
  await until('document.querySelector("[data-testid=login-startup-window]").disabled && document.querySelector("[data-testid=login-startup-background]").checked');
  const state=await run('window.notebookAid.library.settings({locale:null,theme:null,autosave:null})');
  if(state.value.global.loginStartup!==undefined)throw Error('Disabled startup preference remains');
  writeFileSync(join(directory,'login-startup-report.json'),JSON.stringify({defaultOff:true,defaultBackground:true,disabledControls:true,windowModePersisted:true,failedModeRestored:true,disabledRemoved:true,correctOrder:true,modeSpacing:true,locales:10,osRegistrationSimulated:true}));
}
