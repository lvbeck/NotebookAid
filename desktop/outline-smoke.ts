import { type BrowserWindow } from 'electron';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { viewText } from '../src/app/view-i18n';
import type { Locale } from '../src/app/i18n';
import { writingText } from '../src/app/writing-i18n';

export async function smokeOutline(window: BrowserWindow, directory: string): Promise<void> {
  const run = (script: string) => window.webContents.executeJavaScript(script).catch(error => { throw new Error('Outline script failed: '+script.slice(0,500), {cause:error}); });
  const until = async (script: string) => {
    writeFileSync(join(directory, 'outline-stage.txt'), script);
    for (let n=0;n<240;n++) { if (await run(script)) return; await new Promise(resolve=>setTimeout(resolve,80)); }
    throw Error('Outline timeout: '+script);
  };
  const click = async (selector: string) => {
    await until('!!document.querySelector('+JSON.stringify(selector)+') && !document.querySelector('+JSON.stringify(selector)+').disabled');
    await run('document.querySelector('+JSON.stringify(selector)+').click()');
  };
  const layout = async (value: string) => {
    await click('[data-testid=view-note]'); await click('[data-testid=view-'+value+']');
    await until('window.notebookAid.library.settings({locale:null,theme:null,autosave:null}).then(r=>(r.value.global.editorLayout??"continuous")==='+JSON.stringify(value)+')');
    await new Promise(resolve=>setTimeout(resolve,180));
  };
  const bodyAt = async (id: string) => run('(async()=>{const r=await window.notebookAid.library.begin('+JSON.stringify(id)+');if(!r.ok)throw Error(r.code);await window.notebookAid.library.end(r.value.token,r.value.generation);return {body:r.value.note.body,version:r.value.note.version};})()');
  const snapshot = async (name: string) => { window.showInactive(); await new Promise(resolve=>setTimeout(resolve,250)); writeFileSync(join(directory,name),(await window.webContents.capturePage()).toPNG()); };
  await until('document.querySelector("app-root")?.dataset.ready==="true" && !document.querySelector("[data-testid=create-note]").disabled');
  if (process.argv.includes('--self-test-reopen')) {
    const fixture=JSON.parse(readFileSync(join(directory,'outline-fixture.json'),'utf8'));
    await until('!!document.querySelector(".has-directory app-note-outline")');
    for (const note of fixture.notes) { const actual=await bodyAt(note.id); if(actual.body!==note.body||actual.version!==note.version)throw Error('Body or revision changed after restart'); }
    writeFileSync(join(directory,'outline-reopen.json'),JSON.stringify({layoutPersisted:true,exactBodies:true,unchangedVersions:true}));return;
  }
  const notes: {id:string;body:string;version:number}[]=[];
  for (const format of ['text','markdown']) {
    await layout('continuous');
    await click('[data-testid=create-note]');await click('[data-testid=create-'+format+']');
    if(format==='markdown')await click('[data-testid=source-mode]');
    await until('!!document.querySelector("[data-testid=body-source]")');
    const body=format==='text'?'Preamble\n- Root\n  - Child\n    - Grandchild\n  - Sibling\n- Tail\n':'Preamble\n\n<h2>HTML intro</h2>\n\n# Root\nIntro paragraph.\n## Child\n```javascript\n# Not a heading\n```\n'+('Long content for scrolling. 中文内容。\n\n'.repeat(45))+'#### Four\nFourth level.\n\n$$\n# Not a heading\n$$\n\n---\n\n##### Five\nFifth level.\n\n###### Six\nSixth level.\n\n# Tail\nEnd.\n';
    await run('{const t=document.querySelector("[data-testid=body-source]");t.value='+JSON.stringify(body)+';t.dispatchEvent(new Event("input",{bubbles:true}));}');
    await click('[data-testid=save-note]');await until('document.querySelector("[data-testid=save-status]").textContent.includes("已保存")');
    const id=await run('document.querySelector(".note-card.selected").dataset.noteId'), original=await bodyAt(id);
    if(original.body!==body)throw Error('Initial body mismatch');
    notes.push({id,...original});
    await layout('fold');
    await until('!!document.querySelector("[data-testid=outline-collapse]")');
    const count=await run('document.querySelectorAll(".outline-row").length');
    if(count!==(format==='text'?5:6))throw Error('Incorrect outline count: '+count);
    if(!await run('document.querySelector(".editor-body").hidden'))throw Error('Fold view exposes duplicate editor');
    await click('[data-testid=outline-collapse]');
    if(await run('document.querySelectorAll(".outline-row").length')!==2)throw Error('Collapse does not hide descendants');
    await click('[data-testid=outline-expand]');
    if(await run('document.querySelectorAll(".outline-row").length')!==count)throw Error('Expand does not restore descendants');
    const unchanged=await bodyAt(id);if(unchanged.body!==body||unchanged.version!==original.version)throw Error('Folding changed body or revision');
    await layout('directory');await until('!!document.querySelector(".has-directory")');
    await click('.outline-row:nth-child(2) .outline-link');
    await until('document.querySelector("[data-testid=body-source]").selectionStart === '+body.indexOf(format==='text'?'  - Child':'## Child'));
    await run('{const t=document.querySelector("[data-testid=body-source]");t.value+="Transient edit";t.dispatchEvent(new Event("input",{bubbles:true}));}');
    await click('[data-testid=undo-body]');
    await until('document.querySelector("[data-testid=body-source]").value === '+JSON.stringify(body));
    if(format==='markdown'){
      await click('[data-testid=rich-mode]');
      await until('!document.querySelector("[data-testid=body-source]") && !!document.querySelector(".ql-editor h2")');
      await click('.outline-row:nth-child(2) .outline-link');
      await until('(()=>{const p=document.querySelector(".editor-pane"),h=p.querySelector(".editor-heading").getBoundingClientRect(),t=[...p.querySelectorAll(".ql-editor h2")].find(n=>n.textContent==="Child").getBoundingClientRect();return t.top>=h.bottom-1 && t.top<p.getBoundingClientRect().bottom;})()');
      for (const [row,tag] of [[3,'h4'],[4,'h5'],[5,'h6']]) {
        await click('.outline-row:nth-child('+row+') .outline-link');
        await until('(()=>{const p=document.querySelector(".editor-pane"),h=p.querySelector(".editor-heading").getBoundingClientRect(),t=p.querySelector(".ql-editor '+tag+'").getBoundingClientRect();return t.top>=h.bottom-1 && t.top<p.getBoundingClientRect().bottom;})()');
      }
      await run('{const t=document.querySelector("[data-testid=theme]");t.value="dark";t.dispatchEvent(new Event("change",{bubbles:true}));}');
      await until('document.documentElement.dataset.theme==="dark"');
      await layout('fold');await snapshot('outline-markdown-dark.png');
      await click('[data-testid=outline-edit]');
      await until('!document.querySelector("app-note-outline")');
    }
    const after=await bodyAt(id);if(after.body!==body||after.version!==original.version)throw Error('Navigation or mode changes altered body');
  }
  for(const locale of ['en','de','fr','it','es','pt-PT','zh-CN','zh-TW','ja','ko'] as Locale[]){
    await run('{const input=document.querySelector("[data-testid=language]");input.value='+JSON.stringify(locale)+';input.dispatchEvent(new Event("change",{bubbles:true}));}');
    await until('document.querySelector("[data-testid=view-note]").textContent.trim()==='+JSON.stringify(viewText(locale,'view')));
    await until('document.querySelector("[data-testid=insert-divider]").getAttribute("aria-label")==='+JSON.stringify(writingText(locale,'horizontalRule')));
    await click('[data-testid=view-note]');
    await until('document.querySelector("[data-testid=view-fold]").parentElement.textContent.includes('+JSON.stringify(viewText(locale,'fold'))+') && document.querySelector("[data-testid=view-directory]").parentElement.textContent.includes('+JSON.stringify(viewText(locale,'directory'))+')');
    await click('[data-testid=view-fold]');
    await until('document.querySelector("app-note-outline")?.textContent.includes('+JSON.stringify(viewText(locale,'outlineReadOnly'))+')');
  }
  await click('[data-testid=create-note]');await click('[data-testid=create-html]');
  await until('document.querySelector(".format-badge").textContent.includes("HTML") && !document.querySelector("app-note-outline")');
  await click('[data-testid=view-note]');
  if(await run('!!document.querySelector("[data-testid=view-fold]")'))throw Error('Unsupported format offers outline mode');
  await click('[data-testid=view-continuous]');
  await until('window.notebookAid.library.settings({locale:null,theme:null,autosave:null}).then(r=>r.value.global.editorLayout===undefined)');
  await click('[data-testid=create-note]');await click('[data-testid=create-text]');await layout('fold');
  await until('!!document.querySelector("[data-testid=outline-empty]")');
  await click('.note-card[data-note-id="'+notes[1]!.id+'"]');
  await until('document.querySelector(".format-badge").textContent.includes("MARKDOWN")');
  await layout('directory');
  await run('{const input=document.querySelector("[data-testid=language]");input.value="zh-CN";input.dispatchEvent(new Event("change",{bubbles:true}));const theme=document.querySelector("[data-testid=theme]");theme.value="dark";theme.dispatchEvent(new Event("change",{bubbles:true}));}');
  await until('document.documentElement.dataset.theme==="dark"');
  const boundaries: unknown[]=[];
  for(const fullscreen of [false,true]){
    if(fullscreen)await click('[data-testid=editor-fullscreen]');
    for(const width of [1400,1000]){
      window.setSize(width,850);await new Promise(resolve=>setTimeout(resolve,180));
      for(const mode of ['continuous','pages','fold','directory']){
        await layout(mode);
        const result=await run('(()=>{const p=document.querySelector(".editor-pane"),h=p.querySelector(".editor-heading");p.scrollTop=200;const a=p.getBoundingClientRect(),b=h.getBoundingClientRect();return {left:b.left-a.left,right:a.left+p.clientWidth-b.right,overflow:p.scrollWidth-p.clientWidth,mode:'+JSON.stringify(mode)+',width:'+width+',fullscreen:'+fullscreen+'};})()');
        boundaries.push(result);
        if(Math.abs(result.left)>1||Math.abs(result.right)>1||result.overflow>1)throw Error('Editor boundary overflow: '+JSON.stringify(result));
      }
    }
  }
  await layout('directory');await snapshot('outline-directory-dark.png');
  await run('{const theme=document.querySelector("[data-testid=theme]");theme.value="light";theme.dispatchEvent(new Event("change",{bubbles:true}));}');
  await snapshot('outline-directory-light.png');
  for(const note of notes){const actual=await bodyAt(note.id);if(actual.body!==note.body||actual.version!==note.version)throw Error('Final body or version changed');}
  writeFileSync(join(directory,'outline-fixture.json'),JSON.stringify({notes}));
  writeFileSync(join(directory,'outline-report.json'),JSON.stringify({formats:2,layouts:4,locales:10,exactBodies:true,unchangedVersions:true,collapseExpand:true,navigation:true,unsupportedFallback:true,defaultPreferenceRemoved:true,emptyOutline:true,boundaries}));
}
