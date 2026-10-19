import type { BrowserWindow } from 'electron';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { searchText } from '../src/app/search-i18n';
import type { Locale } from '../src/app/i18n';

export async function smokeSearch(window: BrowserWindow, directory: string): Promise<void> {
  const run = (script: string) => window.webContents.executeJavaScript(script).catch(error => { throw new Error('Search test script failed: ' + script.slice(0, 450), { cause:error }); });
  const until = async (script: string) => { for (let n=0;n<180;n++) { if(await run(script))return;await new Promise(resolve=>setTimeout(resolve,80)); } throw Error('Search UI timeout: '+script); };
  const click = async (selector: string) => { await until(`!!document.querySelector(${JSON.stringify(selector)}) && !document.querySelector(${JSON.stringify(selector)}).disabled`); await run(`document.querySelector(${JSON.stringify(selector)}).click()`); };
  const value = async (selector: string, text: string, event='input') => { await until(`!!document.querySelector(${JSON.stringify(selector)})`); await run(`{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(text)};e.dispatchEvent(new Event(${JSON.stringify(event)},{bubbles:true}));}`); };
  const capture = async (name: string) => { await run("document.querySelectorAll('[data-testid=notification] .icon-button').forEach(button=>button.click());void 0"); await run('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))'); await new Promise(resolve=>setTimeout(resolve,180)); writeFileSync(join(directory,name),(await window.webContents.capturePage()).toPNG()); };
  const equalWidths = async () => until("(()=>{const input=document.querySelector('[data-testid=advanced-keyword]').getBoundingClientRect();return ['[data-testid=advanced-add-keyword]','.advanced-match'].every(selector=>{const rect=document.querySelector(selector).getBoundingClientRect();return Math.abs(rect.width-input.width)<1 && Math.abs(rect.left-input.left)<1;});})()");
  await until("document.querySelector('app-root')?.dataset.ready==='true'");
  if(process.argv.includes('--self-test-reopen')) {
    const fixture=JSON.parse(readFileSync(join(directory,'search-fixture.json'),'utf8'));
    const result=await run('window.notebookAid.library.organization()');
    if(!result.ok||result.value.tags.find((tag:any)=>tag.id===fixture.tag)?.color!=='#123456')throw Error('Custom tag color was not persisted');
    await click('[data-testid=advanced-search-tab]');await until("!document.querySelector('[data-testid=advanced-next]').disabled");
    if(!await run("document.querySelector('[data-testid=advanced-page-size]').value==='10'"))throw Error('Default search page size is not ten');
    if(!await run("document.querySelector('[data-testid=advanced-descendants]').checked"))throw Error('Descendants must default to selected after restart');
    writeFileSync(join(directory,'search-reopen.json'),JSON.stringify({customColorPersisted:true,defaultPageSize:10}));return;
  }
  const fixture=await run(`(async()=>{const api=window.notebookAid.library;const parent=crypto.randomUUID(),child=crypto.randomUUID(),tag=crypto.randomUUID();
    for(const input of [{kind:'folder',id:parent,name:'Search parent',parentId:null},{kind:'folder',id:child,name:'Search child',parentId:parent},{kind:'tag',id:tag,name:'Search tag',color:'#A43948'}]){const org=await api.organization();const result=await api.editOrganization({...input,expectedVersion:org.value.version});if(!result.ok)throw Error(result.code);}
    for(let i=0;i<24;i++){const result=await api.create(crypto.randomUUID(),{primaryFormat:'text',title:'Alpha search fixture '+i,body:i%2?'Beta body':'Gamma body',folderId:child});if(!result.ok)throw Error(result.code);const session=await api.begin(result.value.note.id);const placed=await api.place({noteId:result.value.note.id,token:session.value.token,generation:session.value.generation,expectedVersion:result.value.note.version,operationId:crypto.randomUUID(),folderId:child,tagIds:i%2?[tag]:[],pinned:i%3===0});if(!placed.ok)throw Error(placed.code);await api.end(session.value.token,session.value.generation);}
    return {parent,child,tag};})()`);
  writeFileSync(join(directory,'search-fixture.json'),JSON.stringify(fixture));
  await click('[data-testid=organization-tab]');await until("document.querySelectorAll('[data-preset-color]').length===10");
  await click(`[data-tag-edit="${fixture.tag}"]`);await click('[data-preset-color="#355C91"]');
  await until("document.querySelector('[data-testid=tag-color]').value==='#355c91'");
  await value('[data-testid=tag-color]','#123456','input');await click('[data-testid=tag-save]');
  await until(`window.notebookAid.library.organization().then(r=>r.ok&&r.value.tags.find(t=>t.id===${JSON.stringify(fixture.tag)})?.color.toLowerCase()==='#123456')`);
  await click('[data-testid=advanced-search-tab]');await value('[data-testid=advanced-keyword]','Alpha');await click('[data-testid=advanced-submit]');
  const total = async (count:number) => until(`document.querySelector('[data-testid=advanced-total]').textContent.trim()==='${count}' && document.querySelector('[data-testid=advanced-submit]').disabled===false`);
  await total(24);if(!await run("document.querySelectorAll('[data-search-note]').length===10 && document.querySelector('[data-search-note] strong').textContent==='Alpha'"))throw Error('Search highlight or default page size failed');
  await equalWidths();
  if(!await run("document.querySelector('[data-testid=advanced-descendants]').checked"))throw Error('Descendants must default to selected');
  await value('[data-testid=advanced-folder]',fixture.parent,'change');await click('[data-testid=advanced-submit]');await total(24);
  await click('[data-testid=advanced-descendants]');await click('[data-testid=advanced-submit]');await total(0);
  await value('[data-testid=advanced-folder]',fixture.child,'change');await click('[data-testid=advanced-submit]');await total(24);
  await value('[data-testid=advanced-folder]','*','change');await click('[data-testid=advanced-descendants]');await click('[data-testid=advanced-submit]');await total(24);
  await click('[data-testid=advanced-next]');await until("document.querySelector('[data-testid=advanced-range]').textContent.trim().startsWith('11')");
  await value('[data-testid=advanced-page-size]','20','change');await until("document.querySelectorAll('[data-search-note]').length===20");
  for(const size of ['50','100']) { await value('[data-testid=advanced-page-size]',size,'change');await until("document.querySelectorAll('[data-search-note]').length===24"); }
  await value('[data-testid=advanced-page-size]','20','change');await until("document.querySelectorAll('[data-search-note]').length===20");
  await click('[data-testid=advanced-add-keyword]');await value('[data-keyword-index="1"]','Beta');await click('[data-testid=advanced-submit]');await total(12);
  await click('[name=matchMode][value=OR]');await click('[data-testid=advanced-submit]');await total(24);
  await click('[name=matchMode][value=AND]');await value('[data-testid=advanced-folder]',fixture.parent,'change');await click(`[data-search-tag="${fixture.tag}"]`);await click('[data-testid=advanced-pinned]');await click('[data-testid=advanced-submit]');await total(4);
  if(!await run("Array.from(document.querySelectorAll('[data-search-note]')).every(e=>e.previousElementSibling?.classList.contains('advanced-pin'))"))throw Error('Pinned icon/label is not before title');
  if(!await run("Array.from(document.querySelectorAll('[data-testid=advanced-results] td')).every(e=>getComputedStyle(e).verticalAlign==='middle') && document.querySelectorAll('[data-testid=advanced-results] th').length===5"))throw Error('Table columns or vertical alignment failed');
  for(const locale of ['en','de','fr','it','es','pt-PT','zh-CN','zh-TW','ja','ko'] as Locale[]){await value('[data-testid=language]',locale,'change');await until(`document.querySelector('[data-testid=advanced-search-tab]').textContent.includes(${JSON.stringify(searchText(locale,'title'))})`);await until(`document.querySelector('.advanced-descendants').textContent.includes(${JSON.stringify(searchText(locale,'folderHint'))})`);await equalWidths();}
  await value('[data-testid=language]','zh-CN','change');
  await value('[data-testid=theme]','dark','change');
  await until("document.documentElement.dataset.theme==='dark'");await capture('advanced-search-dark.png');
  await value('[data-testid=theme]','light','change');
  await until("document.documentElement.dataset.theme==='light'");await capture('advanced-search-light.png');
  const originalSize=window.getSize();window.setSize(1000,760);await equalWidths();await capture('advanced-search-narrow.png');window.setSize(originalSize[0],originalSize[1]);
  await click('[data-search-note]');await until("!document.querySelector('.editor-pane').hidden && !!document.querySelector('[data-testid=body-source]')");
  await click('[data-testid=advanced-search-tab]');await total(4);
  await click('[data-testid=advanced-reset]');await until("document.querySelector('[data-testid=advanced-total]').textContent.trim()!=='4' && !document.querySelector('[data-testid=advanced-submit]').disabled");
  if(!await run("document.querySelector('[data-testid=advanced-descendants]').checked"))throw Error('Reset must restore descendant scope');
  await value('[data-testid=advanced-keyword]','Missing fixture keyword');await click('[data-testid=advanced-submit]');await total(0);
  await click('[data-testid=organization-tab]');await click(`[data-tag-edit="${fixture.tag}"]`);
  await until("!!document.querySelector('app-organization') && !document.querySelector('app-advanced-search').getClientRects().length");await capture('tag-palette.png');
  writeFileSync(join(directory,'search-report.json'),JSON.stringify({languages:10,presets:10,customColor:true,keywordAndOr:true,descendantFolder:true,exactFolder:true,descendantsDefaultAndReset:true,equalKeywordControlWidths:true,narrowLayout:true,tagAndPinned:true,pagination:true,titleHighlight:true,pinBeforeTitle:true,separateColumns:5,verticalAlign:'middle',openResult:true,emptyAndReset:true},null,2));
}
