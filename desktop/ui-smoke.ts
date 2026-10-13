import type { BrowserWindow } from 'electron';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { regionalLocale, translations, type Locale } from '../src/app/i18n';
import { uiText } from '../src/app/ui-i18n';

export async function smokeUi(window: BrowserWindow, directory: string): Promise<void> {
  const run = (script: string) => window.webContents.executeJavaScript(script);
  const until = async (expression: string) => { for (let n=0;n<140;n++) { if (await run(expression)) return; await new Promise(resolve=>setTimeout(resolve,100)); } throw Error('UI timeout: '+expression); };
  const untilZoom = async (factor: number) => { for (let n=0;n<100;n++) { if (window.webContents.getZoomFactor()===factor) return; await new Promise(resolve=>setTimeout(resolve,50)); } throw Error('Zoom not applied: '+factor); };
  const click = async (id: string) => { await until(`document.querySelector('[data-testid="${id}"]') && !document.querySelector('[data-testid="${id}"]').disabled`); await run(`document.querySelector('[data-testid="${id}"]').click()`); };
  const key = async (value: string, shift = false, composing = false) => { await run(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:${JSON.stringify(value)},code:${JSON.stringify(value==='f'?'KeyF':'')},ctrlKey:true,shiftKey:${shift},isComposing:${composing},bubbles:true,cancelable:true}))`); };
  const updateSelect = async (id: string, value: string) => { await run(`{const select=document.querySelector('[data-testid="${id}"]');select.value=${JSON.stringify(value)};select.dispatchEvent(new Event('change',{bubbles:true}));}`); await until(`!document.querySelector('[data-testid="${id}"]').disabled`); };
  const capture = async (name: string) => { await run("document.querySelectorAll('[data-testid=notification] .notification-card-top button').forEach(button=>button.click());document.querySelector('[data-testid=interface-settings]').scrollIntoView({block:'center'});"); window.showInactive(); await run('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))'); await new Promise(r=>setTimeout(r,200)); writeFileSync(join(directory,name),(await window.webContents.capturePage()).toPNG()); };
  await until("document.querySelector('app-root')?.dataset.ready==='true' && !document.querySelector('[data-testid=create-note]').disabled");
  if (process.argv.includes('--self-test-reopen')) {
    const settings = JSON.parse(readFileSync(join(directory,'settings.json'),'utf8'));
    if (settings.global.zoomPercent!==125 || window.webContents.getZoomFactor()!==1.25) throw Error('Zoom was not restored');
    await key(','); await until("document.querySelector('[data-select-trigger=interface-zoom]')?.textContent.includes('125%')");
    const expected = JSON.parse(readFileSync(join(directory,'ui-expected.json'),'utf8'));
    const result = await run(`window.notebookAid.library.begin(${JSON.stringify(expected.id)})`);
    if (!result.ok || result.value.note.body!=='T14 unchanged body') throw Error('UI changes altered note data');
    writeFileSync(join(directory,'ui-reopen.json'),JSON.stringify({zoomRestored:true,contentPreserved:true})); return;
  }
  await click('skip-content'); await until("document.activeElement.id==='main-content'");
  await key('n',false,true); if (await run("!!document.querySelector('#new-note-formats')")) throw Error('Composition shortcut was handled');
  await key('n'); await until("document.activeElement?.dataset.testid==='create-markdown'");
  await click('create-text'); await until("!!document.querySelector('[data-testid=body-source]') && !document.querySelector('[data-testid=body-source]').disabled");
  await run("{const input=document.querySelector('[data-testid=body-source]');input.value='T14 unchanged body';input.dispatchEvent(new Event('input',{bubbles:true}));}");
  await key('s'); await until("document.querySelector('[data-testid=save-status]')?.textContent.includes('已保存')");
  const note = (await run('window.notebookAid.library.list()')).value[0];
  await key('f',true); await until("document.querySelector('.app-shell').classList.contains('editor-fullscreen')");
  await run("document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}))"); await until("!document.querySelector('.app-shell').classList.contains('editor-fullscreen')");
  await key('f'); await until("document.activeElement?.dataset.testid==='note-search'");
  await key(','); await until("document.querySelector('[data-testid=interface-settings]').getClientRects().length>0");
  for (const locale of Object.keys(translations) as Locale[]) {
    await updateSelect('language',locale);
    await until(`document.documentElement.lang===${JSON.stringify(regionalLocale(locale))} && document.querySelector('[data-select-trigger=interface-zoom]').getAttribute('aria-label')===${JSON.stringify(uiText(locale,'zoom'))}`);
    if (!await run(`document.querySelector('[data-testid=shortcut-help] summary').textContent===${JSON.stringify(uiText(locale,'shortcuts'))}`)) throw Error('Shortcut localization missing: '+locale);
    for (const theme of ['light','dark']) {
      await updateSelect('theme',theme); await until(`document.documentElement.dataset.theme==='${theme}'`);
      // Check actual theme colors, rather than a duplicate list of design values.
      const contrast = await run(`(() => {const rgb=value=>value.match(/[0-9.]+/g).slice(0,3).map(Number);const lum=value=>rgb(value).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);const style=getComputedStyle(document.querySelector('[data-testid=save-note]'));const a=lum(style.color),b=lum(style.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);})()`);
      if (contrast<4.5) throw Error('Primary text contrast too low');
    }
  }
  await updateSelect('theme','system');
  window.webContents.debugger.attach('1.3');
  try { for (const theme of ['dark','light']) { await window.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:theme}]}); await until(`document.documentElement.dataset.theme==='${theme}'`); } }
  finally { window.webContents.debugger.detach(); }
  await updateSelect('theme','dark');
  await updateSelect('language','zh-CN');
  await run("document.querySelector('[data-testid=shortcut-help] summary').click()");
  const unnamed = await run("Array.from(document.querySelectorAll('button,input:not([type=hidden]),textarea')).filter(element=>element.getClientRects().length && !element.disabled && !element.getAttribute('aria-label') && !element.getAttribute('title') && !(element.labels?.length) && !element.textContent.trim()).map(element=>element.dataset.testid??element.className)");
  if (unnamed.length) throw Error('Unnamed controls: '+JSON.stringify(unnamed));
  await run("document.querySelector('[data-select-trigger=interface-zoom]').click()");
  await until("!!document.querySelector('.select-menu')");
  if (!await run("document.querySelector('[data-select-trigger=interface-zoom]').getAttribute('aria-activedescendant')===document.querySelector('.select-option[aria-selected=true]').id")) throw Error('Combobox active option not announced');
  await run("document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true}));document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));");
  await until("document.querySelector('[data-testid=interface-zoom]').value==='200' && !document.querySelector('.select-menu')");
  await untilZoom(2);
  await capture('settings-dark-200.png');
  await key('0'); await until("document.querySelector('[data-testid=interface-zoom]').value==='100'");
  await key('+'); await until("document.querySelector('[data-testid=interface-zoom]').value==='110'");
  await key('-'); await until("document.querySelector('[data-testid=interface-zoom]').value==='100'");
  await untilZoom(1);
  let rejected = false; try { await run('window.notebookAid.uiZoom(999)'); } catch { rejected=true; }
  if (!rejected || window.webContents.getZoomFactor()!==1) throw Error('Invalid zoom accepted');
  if (await run("!!document.querySelector('[data-testid=ui-failure]')")) throw Error('Unexpected interface error before injection');
  await run("window.dispatchEvent(new ErrorEvent('error',{error:new Error('PRIVATE ERROR PAYLOAD'),message:'PRIVATE ERROR PAYLOAD'}))");
  await until("!!document.querySelector('[data-testid=ui-failure]')");
  if (await run("document.querySelector('[data-testid=ui-failure]').textContent.includes('PRIVATE')")) throw Error('Exception content leaked');
  await click('ui-failure-dismiss'); await until("!document.querySelector('[data-testid=ui-failure]')");
  await key('f'); await click('import-note'); await click('import-tasks');
  await until("!!document.querySelector('[data-testid=tasks-dialog]')");
  await key('n'); await key(',',false); await key('+');
  if (!await run("!!document.querySelector('[data-testid=tasks-dialog]') && !document.querySelector('#new-note-formats')") || window.webContents.getZoomFactor()!==1) throw Error('Shortcut escaped a dialog');
  await run("document.querySelector('[data-testid=tasks-dialog] header button').click()"); await until("!document.querySelector('[data-testid=tasks-dialog]')");
  await key(','); await updateSelect('interface-zoom','125');
  await untilZoom(1.25);
  await updateSelect('theme','light'); await capture('settings-light-125.png');
  await window.webContents.debugger.attach('1.3');
  try { await window.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]}); if (!await run("getComputedStyle(document.querySelector('[data-testid=settings-global]')).transitionDuration==='0s'")) throw Error('Reduced motion ignored'); }
  finally { window.webContents.debugger.detach(); }
  writeFileSync(join(directory,'ui-expected.json'),JSON.stringify({id:note.id}));
  writeFileSync(join(directory,'ui-report.json'),JSON.stringify({languages:8,themes:2,systemTheme:true,fullscreen:true,contentPreserved:true,shortcuts:true,compositionGuard:true,dialogGuard:true,comboboxKeyboard:true,zoom:true,zoomValidation:true,primaryContrast:true,reducedMotion:true,namedControls:true,skipContent:true,safeError:true,physicalKeyboardTested:false,screenReaderTested:false}));
}
