import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BrowserWindow } from 'electron';

export async function smokeEaster(window: BrowserWindow, root: string, requests: string[]): Promise<void> {
  const run=async(code:string)=>{try{return await window.webContents.executeJavaScript(code,true);}catch(error){throw Error(String(error)+' · '+code);}};
  const until=async(code:string)=>{for(let i=0;i<250;i++){if(await run(code))return;await new Promise(r=>setTimeout(r,60));}throw Error('Easter timeout: '+code);};
  const click=async(selector:string)=>{await until(`!!document.querySelector(${JSON.stringify(selector)})&&!document.querySelector(${JSON.stringify(selector)}).disabled`);await run(`document.querySelector(${JSON.stringify(selector)}).closest('button,input,select')?.focus();document.querySelector(${JSON.stringify(selector)}).dispatchEvent(new MouseEvent('click',{bubbles:true}))`);};
  const state=async()=>{const result=await run('window.notebookAid.library.settings({locale:null,theme:null,autosave:null})');if(!result.ok)throw Error(result.code);return result.value.global.easterEggs;};
  const close=async()=>{await click('[data-testid=easter-close]');await until("!document.querySelector('[data-testid=easter-dialog]')");};
  const information=async(page:string)=>{await click('[data-testid=application-menu]');await click(`[data-testid=menu-${page}]`);await until(`document.querySelector('[data-testid=information-dialog]')?.dataset.page==='${page}'`);};
  const discovery=async(id:string)=>{await until("document.querySelector('[data-testid=easter-dialog]')?.dataset.mode==='discovery'");if(!(await state()).found.includes(id))throw Error('Missing persisted egg '+id);await close();};
  await until("document.querySelector('app-root')?.dataset.ready==='true'&&!document.querySelector('[data-testid=create-note]')?.disabled");
  window.show();
  await until('!document.hidden');
  await new Promise(r=>setTimeout(r,250));
  const initialResources=[...requests];
  if(await run("!!document.querySelector('.preview-banner')"))throw Error('Development banner is still visible');
  if(process.env['NOTEBOOKAID_EASTER_MOTION']==='1'){
    window.webContents.debugger.attach('1.3');
    await window.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await click('[data-testid=settings-tab]');await click('[data-testid=easter-reduced]');
    await until("!document.querySelector('[data-testid=easter-reduced]').checked&&!document.querySelector('[data-testid=easter-reduced]').disabled");
    await click('[data-testid=easter-collection]');await click('[data-testid=easter-replay]');await new Promise(r=>setTimeout(r,350));
    if(await run("!!document.querySelector('[data-testid=easter-celebration] canvas')"))throw Error('System reduced motion animated');
    const resources=[...requests];await close();
    await window.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
    await click('[data-testid=easter-collection]');await click('[data-testid=easter-replay]');await until("!!document.querySelector('[data-testid=easter-celebration] canvas')");
    await until("!document.querySelector('[data-testid=easter-celebration] canvas')&&!document.querySelector('[data-testid=easter-skip]')");await close();
    await click('[data-testid=easter-collection]');await click('[data-testid=easter-replay]');await until("!!document.querySelector('[data-testid=easter-celebration] canvas')");
    await run("document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',keyCode:27,bubbles:true,cancelable:true}))");await until("!document.querySelector('[data-testid=easter-dialog]')&&!document.querySelector('[data-testid=easter-celebration] canvas')");
    await click('[data-testid=easter-collection]');await click('[data-testid=easter-reset]');await click('[data-testid=easter-reset-confirm]');
    await until("document.querySelectorAll('.egg-card.locked').length===6");if((await state()).found.length)throw Error('Confirmed reset failed');
    await close();window.webContents.debugger.detach();
    writeFileSync(join(root,'easter-motion.json'),JSON.stringify({systemReduced:true,automaticEnd:true,escapeRemovedCanvas:true,confirmedReset:true,initialResources,reducedResources:resources,finalResources:[...requests]}));return;
  }
  if(process.argv.includes('--self-test-reopen')){
    if((await state()).found.length!==6||!(await state()).celebrated)throw Error('Progress lost after restart');
    if(await run("!!document.querySelector('[data-testid=easter-dialog]')"))throw Error('Celebration repeated on restart');
    writeFileSync(join(root,'easter-reopen.json'),JSON.stringify({durable:true,noAutomaticReplay:true,initialResources}));return;
  }
  await click('[data-testid=sidebar-toggle]');
  await click('[data-testid=egg-hello]');await click('[data-testid=egg-hello]');await new Promise(r=>setTimeout(r,100));
  if((await state())?.found.includes('hello')||await run("!!document.querySelector('[data-testid=easter-dialog]')"))throw Error('Hello collected before the third activation');
  if(!await run("document.querySelector('[data-testid=egg-hello]').tagName==='BUTTON'&&document.querySelector('[data-testid=egg-hello]').tabIndex===0"))throw Error('Sidebar logo is not keyboard accessible');
  await click('[data-testid=egg-hello]');await discovery('hello');
  if(!await run("document.activeElement?.dataset.testid==='egg-hello'"))throw Error('Discovery did not restore focus');
  await click('[data-testid=sidebar-toggle]');await information('about');
  if(await run("!!document.querySelector('[data-testid=information-dialog] [data-testid=egg-hello]')"))throw Error('Old About discovery entry remains');
  await click('[data-testid=egg-echo]');await discovery('echo');await click('[data-testid=information-close]');
  await click('[data-testid=settings-tab]');await click('[data-testid=settings-library]');await click('[data-testid=egg-dawn]');await discovery('dawn');
  for(const theme of ['light','system','dark']){
    await run(`{const input=document.querySelector('[data-testid=theme]');input.value='${theme}';input.dispatchEvent(new Event('change',{bubbles:true}));}`);
    await until(`document.querySelector('[data-select-trigger=theme] [data-theme-icon]')?.dataset.themeIcon==='${theme}'&&!document.querySelector('[data-testid=theme]').disabled`);
  }
  await click('[data-select-trigger=theme] [data-theme-icon]');await discovery('moon');
  await click('[data-testid=settings-global]');await until("!!document.querySelector('[data-testid=easter-settings]')");
  await click('[data-testid=egg-explorer]');await discovery('explorer');
  await information('license');await click('[data-testid=egg-opensource]');
  await until("document.querySelector('[data-testid=easter-dialog]')?.dataset.mode==='celebrate'");
  await until("!!document.querySelector('[data-testid=easter-celebration] canvas')");
  writeFileSync(join(root,'easter-celebrate.png'),(await window.webContents.capturePage()).toPNG());
  await click('[data-testid=easter-skip]');await until("!document.querySelector('[data-testid=easter-celebration] canvas')&&!document.querySelector('[data-testid=easter-skip]')");
  await click('[data-testid=easter-return]');
  if(await run("document.querySelectorAll('.egg-card:not(.locked)').length")!==6)throw Error('Collection incomplete');
  if(!await run("(()=>{const icons=document.querySelectorAll('.egg-card svg');return icons[0].querySelectorAll('path').length===3&&icons[0].querySelector('circle')?.getAttribute('r')==='2'&&icons[1].querySelectorAll('path').length===4&&icons[1].querySelector('circle')?.getAttribute('r')==='2'&&icons[4].querySelector('circle')?.getAttribute('r')==='10'&&icons[4].querySelectorAll('path').length===1&&icons[5].querySelectorAll('path').length===1&&!icons[5].querySelector('circle');})()"))throw Error('Collection icons differ from the approved preview');
  await run('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');await new Promise(r=>setTimeout(r,150));
  writeFileSync(join(root,'easter-collection.png'),(await window.webContents.capturePage()).toPNG());await close();await click('[data-testid=information-close]');
  await click('[data-testid=easter-reduced]');await until("document.querySelector('[data-testid=easter-reduced]').checked&&!document.querySelector('[data-testid=easter-reduced]').disabled");
  await click('[data-testid=easter-collection]');await click('[data-testid=easter-replay]');await new Promise(r=>setTimeout(r,350));
  if(await run("!!document.querySelector('[data-testid=easter-celebration] canvas')"))throw Error('Reduced motion animated');await close();
  await click('[data-testid=easter-enabled]');await until("!document.querySelector('[data-testid=easter-enabled]').checked&&!document.querySelector('[data-testid=easter-enabled]').disabled");
  if((await state()).found.length!==6)throw Error('Disable cleared progress');
  await click('[data-select-trigger=theme] [data-theme-icon]');await until("!!document.querySelector('.select-menu')");await run("document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',keyCode:27,bubbles:true,cancelable:true}))");await until("!document.querySelector('.select-menu')");
  for(let i=0;i<3;i++)await click('[data-testid=egg-hello]');await new Promise(r=>setTimeout(r,200));
  if(await run("!!document.querySelector('[data-testid=easter-dialog]')"))throw Error('Disabled discovery appeared');
  await click('[data-testid=easter-enabled]');await until("!document.querySelector('[data-testid=easter-enabled]').disabled");
  await click('[data-testid=easter-collection]');await click('[data-testid=easter-reset]');await close();
  if((await state()).found.length!==6)throw Error('Cancelled reset lost progress');
  const finalResources=[...requests];
  writeFileSync(join(root,'easter-report.json'),JSON.stringify({naturalDiscoveries:6,helloSidebarThree:true,helloNativeButton:true,collapsedSidebar:true,oldAboutEntryRemoved:true,themeIcons:true,skipRemovedCanvas:true,reducedMotion:true,disabledRetainsProgress:true,cancelledReset:true,focusRestored:true,initialResources,finalResources}));
}
