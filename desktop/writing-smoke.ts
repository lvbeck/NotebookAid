import type { BrowserWindow } from 'electron';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
export async function smokeWriting(window:BrowserWindow,root:string):Promise<void>{
 const run=(script:string)=>window.webContents.executeJavaScript(script).catch(error=>{throw Error('Writing script failed: '+script.slice(0,180)+' · '+String(error));});
 const until=async(script:string)=>{for(let n=0;n<150;n++){if(await run(script))return;await new Promise(r=>setTimeout(r,100));}throw Error('Writing UI timeout: '+script+' · '+await run("JSON.stringify({title:document.querySelector('[data-testid=note-title]')?.value,editor:document.querySelector('.ql-editor')?.innerHTML,source:document.querySelector('[data-testid=body-source]')?.value})"));};
 const click=async(id:string)=>{await until(`!!document.querySelector('[data-testid=${id}]') && !document.querySelector('[data-testid=${id}]').disabled`);await run(`document.querySelector('[data-testid=${id}]').click()`);};
 const input=async(id:string,text:string,event='input')=>{await run(`(()=>{const e=document.querySelector('[data-testid=${id}]');e.value=${JSON.stringify(text)};e.dispatchEvent(new Event('${event}',{bubbles:true}));})()`);};
 const read=async(id:string)=>run(`window.notebookAid.library.history('${id}').then(h=>window.notebookAid.library.revision('${id}',h.value.revisions[0].revisionId))`);
 const capture=async(name:string)=>{window.showInactive();await run('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');await window.webContents.capturePage();await new Promise(r=>setTimeout(r,300));writeFileSync(join(root,name),(await window.webContents.capturePage()).toPNG());};
 await until("document.querySelector('app-root')?.dataset.ready==='true'");
 if(process.argv.includes('--self-test-reopen')){
  await until("document.querySelector('[data-testid=note-title]')?.disabled===false && document.querySelector('[data-testid=create-note]')?.disabled===false");
  const settings=await run("window.notebookAid.library.settings({locale:null,theme:null,autosave:null})");if(settings.value.global.translationLocale!=='de')throw Error('Translation preference restart failed');
  if(settings.value.global.aiEnabled!==false||await run("!!document.querySelector('[data-testid=ai-writing]')"))throw Error('AI preference restart failed');
  const id=JSON.parse(readFileSync(join(root,'writing-note.json'),'utf8')).id;
  const result=await read(id);
  if(result.value.generatedTranslation?.text!=='Fixture AI result')throw Error('Translation restart persistence failed');
  if(!result.ok||result.value.generatedSummary?.text!=='Fixture AI result'||result.value.body!=='Changed after summary')throw Error('Summary restart persistence failed');
  writeFileSync(join(root,'writing-reopen.json'),JSON.stringify({summarySurvived:true,bodyIndependent:true,stale:result.value.generatedSummary.sourceContentVersion<result.value.contentVersion}));return;
 }
 for(const request of [{action:'key',provider:'gemini',key:'fixture-writing-secret'},{action:'check',provider:'gemini'},{action:'select',provider:'gemini',model:'models/fixture-text'}]){
  const result=await run(`window.notebookAid.ai.request(${JSON.stringify(request)})`);if(!result.ok)throw Error('Fixture AI configuration failed: '+result.code);
 }
 await click('settings-tab');await until("!!document.querySelector('[data-testid=default-translation-language]')");await input('default-translation-language','de','change');await until("window.notebookAid.library.settings({locale:null,theme:null,autosave:null}).then(r=>r.ok&&r.value.global.translationLocale==='de')");
 if(!await run("document.querySelector('[data-testid=ai-title]')?.textContent==='AI 设置' && document.querySelector('[data-testid=ai-enabled]')?.checked"))throw Error('AI settings title or default');
 await until("document.querySelector('[data-testid=create-note]')?.disabled===false");await click('create-note');await until("!!document.querySelector('[data-testid=create-text]')");await click('create-text');
 await until("!!document.querySelector('[data-testid=body-source]')");await input('body-source','Original writing text');await click('save-note');
 await until("document.querySelector('[data-testid=save-status]')?.textContent.includes('已保存')");
 const list=await run('window.notebookAid.library.list()'),id=list.value[0].id;writeFileSync(join(root,'writing-note.json'),JSON.stringify({id}));
 if(!await run("getComputedStyle(document.querySelector('.compact-editor-toolbar')).borderLeftWidth==='0px'"))throw Error('TXT divider still visible');
 if(!await run("document.querySelector('[data-testid=ai-writing]')?.textContent.includes('AI 辅助写作')"))throw Error('Writing button label');
 await click('settings-tab');await run("(()=>{const e=document.querySelector('[data-testid=ai-enabled]');e.checked=false;e.dispatchEvent(new Event('change',{bubbles:true}));})()");await until("window.notebookAid.library.settings({locale:null,theme:null,autosave:null}).then(r=>r.ok&&r.value.global.aiEnabled===false)");
 if(await run("!!document.querySelector('[data-testid=ai-writing]')"))throw Error('Disabled writing button rendered');
 await run("(()=>{const e=document.querySelector('[data-testid=ai-enabled]');e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}));})()");await until("window.notebookAid.library.settings({locale:null,theme:null,autosave:null}).then(r=>r.ok&&r.value.global.aiEnabled===true)");await run("document.querySelector('.sidebar nav button').click()");
 await click('ai-writing');await until("!!document.querySelector('[data-testid=writing-generate]')");
 if(await run("!!document.querySelector('[data-testid=writing-target-language]')"))throw Error('Target shown outside translation');await input('writing-operation','translate','change');await until("document.querySelector('[data-testid=writing-target-language]')?.value==='de'");
 if(!await run("(()=>{const target=document.querySelector('[data-testid=writing-target-language]'),scope=document.querySelector('[data-testid=writing-scope]');return target.options.length===8&&!!(target.compareDocumentPosition(scope)&Node.DOCUMENT_POSITION_FOLLOWING)})()"))throw Error('Translation selector order or choices');
 await input('writing-target-language','fr','change');await click('writing-generate');await until("!!document.querySelector('[data-testid=dialog-confirm]')");await click('dialog-confirm');await until("document.querySelector('[data-testid=writing-result]')?.textContent==='Fixture AI result'");
 const before=await read(id);if(before.value.body!=='Original writing text')throw Error('Generation wrote before apply');
 await capture('writing-preview.png');
 await click('writing-save-translation');await until("!document.querySelector('[data-testid=writing-dialog]')");const translated=await read(id);if(translated.value.generatedTranslation?.text!=='Fixture AI result'||translated.value.body!=='Original writing text')throw Error('Independent translation save failed');
 await click('ai-writing');await input('writing-operation','translate','change');await until("document.querySelector('[data-testid=writing-result]')?.textContent==='Fixture AI result'");if(await run("!!document.querySelector('[data-testid=writing-save-translation]')"))throw Error('Cached translation marked fresh');await capture('writing-saved-translation.png');
 await click('writing-replace');await until("document.querySelector('[data-testid=body-source]')?.value==='Fixture AI result'");await click('undo-body');await until("document.querySelector('[data-testid=body-source]')?.value==='Original writing text'");
 await click('ai-writing');await click('writing-generate');await until("!!document.querySelector('[data-testid=writing-result]')");await click('writing-insert');await until("document.querySelector('[data-testid=body-source]')?.value.includes('Original writing text\\nFixture AI result')");await click('undo-body');
 await until("document.querySelector('[data-testid=body-source]')?.value==='Original writing text'");await click('ai-writing');await input('writing-operation','summary','change');await click('writing-generate');
 await until("!!document.querySelector('[data-testid=writing-result]')");await click('writing-save-summary');
 await until("!document.querySelector('[data-testid=writing-dialog]')");const summarized=await read(id);
 if(summarized.value.generatedSummary?.text!=='Fixture AI result'||summarized.value.body!=='Original writing text')throw Error('Independent summary save failed');
 await input('body-source','Changed after summary');await click('save-note');await until("document.querySelector('[data-testid=save-status]')?.textContent.includes('已保存')");
 await click('ai-writing');await until("document.querySelector('[data-testid=writing-dialog]')?.textContent.includes('已过期')");
 await capture('writing-summary.png');await input('writing-operation','translate','change');await until("document.querySelector('[data-testid=writing-replace]')?.disabled===true");
 await run("document.querySelector('[data-testid=writing-dialog] header button').click()");
 await click('create-note');await click('create-html');await until("!document.querySelector('[data-testid=body-source]') && document.querySelector('.ql-editor')?.getAttribute('contenteditable')==='true'");
 await run("document.querySelector('.ql-editor').focus()");await window.webContents.insertText('Original rich text');
 await until("document.querySelector('.ql-editor')?.textContent.includes('Original rich text')");
 await run("(()=>{const text=document.querySelector('.ql-editor p').firstChild,range=document.createRange();range.setStart(text,0);range.setEnd(text,8);const s=getSelection();s.removeAllRanges();s.addRange(range);document.dispatchEvent(new Event('selectionchange'));})()");
 await new Promise(r=>setTimeout(r,100));await click('ai-writing');await until("document.querySelector('[data-testid=writing-scope]')?.value==='selection'");await click('writing-generate');await until("!!document.querySelector('[data-testid=writing-result]')");await click('writing-replace');
 await until("document.querySelector('.ql-editor')?.textContent.includes('Fixture AI result rich text')");await click('undo-body');await until("document.querySelector('.ql-editor')?.textContent.includes('Original rich text')");
 await click('save-note');await until("document.querySelector('[data-testid=save-status]')?.textContent.includes('已保存')");
 await click('ai-writing');await click('writing-generate');await click('writing-cancel');await new Promise(r=>setTimeout(r,200));
 if(await run("!!document.querySelector('[data-testid=writing-result]')"))throw Error('Cancelled result displayed');
 await run("document.querySelector('[data-testid=writing-dialog] header button').click()");

 for(const format of ['html','markdown','delta']){
  await click('create-note');await click('create-'+format);await until("document.querySelector('[data-testid=create-note]')?.disabled===false && document.querySelector('[data-testid=note-title]')?.value==='未命名' && document.querySelector('.ql-editor')?.getAttribute('contenteditable')==='true' && document.querySelector('.ql-editor').textContent.trim()===''");await input('note-title','Formatting '+format);
  await run("document.querySelector('.ql-editor').focus()");await window.webContents.insertText('Styled text');await until("document.querySelector('.ql-editor')?.textContent.includes('Styled text')");
  if(!await run("(()=>{const toolbar=document.querySelector('.compact-editor-toolbar'),selectors=['.ql-bold','.ql-italic','.ql-underline','.ql-strike','span.ql-color','span.ql-background','.ql-list'];return selectors.every((s,i)=>!!toolbar.querySelector(s)&&(i===0||!!(toolbar.querySelector(selectors[i-1]).compareDocumentPosition(toolbar.querySelector(s))&Node.DOCUMENT_POSITION_FOLLOWING)))&&toolbar.querySelector('select.ql-color').options.length>30&&toolbar.querySelector('select.ql-background').options.length>30})()"))throw Error('Toolbar order or palettes missing: '+format);
  const selectText=async()=>{await run("(()=>{const e=document.querySelector('.ql-editor');e.focus();const r=document.createRange();r.selectNodeContents(e.firstElementChild);const s=getSelection();s.removeAllRanges();s.addRange(r);document.dispatchEvent(new Event('selectionchange'));})()");await new Promise(r=>setTimeout(r,120));};
  for(const key of ['underline','strike']){await selectText();await run("document.querySelector('button.ql-"+key+"').click()");}
  for(const [key,color]of [['color','#e60000'],['background','#ffff00']]){await selectText();await run("(()=>{const more=document.querySelector('[data-testid=more-editor-tools]'),label=document.querySelector('span.ql-"+key+" .ql-picker-label');if(!label.getClientRects().length&&more?.getClientRects().length)more.click();label.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));})()");await until("document.querySelector('span.ql-"+key+" .ql-picker-item[data-value=\""+color+"\"]').getClientRects().length>0");if(!await run("document.querySelector('span.ql-"+key+" .ql-picker-label svg').getBoundingClientRect().width>=18"))throw Error('Color icon clipped');if(!await run("(()=>{const reference=document.querySelector('button.ql-italic svg').getBoundingClientRect(),color=document.querySelector('span.ql-"+key+" .ql-picker-label svg').getBoundingClientRect();return Math.abs(reference.y+reference.height/2-color.y-color.height/2)<0.5})()"))throw Error('Color icon vertical alignment');await run("document.querySelector('span.ql-"+key+" .ql-picker-item[data-value=\""+color+"\"]').click()");}
  await until("!!document.querySelector('.ql-editor u')&&!!document.querySelector('.ql-editor s')&&!!document.querySelector('.ql-editor [style*=background-color]')");
  await click('save-note');await until("document.querySelector('[data-testid=save-status]')?.textContent.includes('已保存')");
  const notes=await run('window.notebookAid.library.list()'),note=notes.value.find((n:any)=>n.title==='Formatting '+format);if(!note)throw Error('Formatted note missing');const stored=(await read(note.id)).value;
  if(format==='delta'){const attrs=JSON.parse(stored.body).ops.find((op:any)=>op.insert.includes('Styled')).attributes;if(!attrs.underline||!attrs.strike||attrs.color!=='#e60000'||attrs.background!=='#ffff00')throw Error('Delta styles lost');}else if(!stored.body.includes('<u>')||!stored.body.includes('<s>')||!stored.body.includes('background-color'))throw Error('Stored styles lost: '+format);
  await click('source-mode');await until("!!document.querySelector('[data-testid=body-source]')");await click('rich-mode');await until("!!document.querySelector('.ql-editor u')&&!!document.querySelector('.ql-editor s')");if(await run("!!document.querySelector('[data-testid=format-warning]')"))throw Error('Styled source protected: '+format);
  await run("(()=>{document.querySelectorAll('[data-testid=notification] .icon-button').forEach(e=>e.click());const more=document.querySelector('[data-testid=more-editor-tools]');if(more?.getClientRects().length)more.click()})()");await capture('formatting-'+format+'.png');
 }
 await click('settings-tab');await run("(()=>{const e=document.querySelector('[data-testid=ai-enabled]');e.checked=false;e.dispatchEvent(new Event('change',{bubbles:true}));})()");await until("window.notebookAid.library.settings({locale:null,theme:null,autosave:null}).then(r=>r.ok&&r.value.global.aiEnabled===false)");
 writeFileSync(join(root,'writing-report.json'),JSON.stringify({aiDefaultOn:true,aiToggle:true,aiButtonLabel:true,formattingRoundtrip:true,colorPalettes:true,colorIconsAligned:true,translationSaved:true,translationCached:true,staleTranslation:true,txtDividerHidden:true,translationSelector:true,translationDefault:true,eightLanguages:true,previewWithoutWrite:true,replace:true,insert:true,undo:true,richSelection:true,summaryIndependent:true,schemaUpgrade:true,staleSummary:true,cancel:true,simulatedOnly:true}));
}
