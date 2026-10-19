import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {existsSync,copyFileSync,unlinkSync} from 'node:fs';
import {app, type BrowserWindow} from 'electron';
import {readFileSync,writeFileSync} from 'node:fs';
import {basename,join} from 'node:path';
import {mkdirSync,rmdirSync} from 'node:fs';
import {mathText} from '../src/app/math-i18n';
import type {Locale} from '../src/app/i18n';

export async function smokeMath(window: BrowserWindow, directory: string): Promise<void> {
  const run=(script:string)=>window.webContents.executeJavaScript(script);
  const until=async(script:string)=>{writeFileSync(join(directory,'math-stage.txt'),script);for(let n=0;n<200;n++){if(await run(script))return;await new Promise(r=>setTimeout(r,80));}throw Error('Math timeout: '+script);};
  const click=async(selector:string)=>{await until('!!document.querySelector('+JSON.stringify(selector)+') && !document.querySelector('+JSON.stringify(selector)+').disabled');await run('document.querySelector('+JSON.stringify(selector)+').click()');await new Promise(r=>setTimeout(r,150));};
  const input=async(selector:string,value:string)=>{await run('{const t=document.querySelector('+JSON.stringify(selector)+');t.value='+JSON.stringify(value)+';t.dispatchEvent(new Event("input",{bubbles:true}));}');await new Promise(r=>setTimeout(r,150));};
  const body=()=>run('document.querySelector("[data-testid=markdown-source]").value');
  const save=async()=>{await click('[data-testid=save-note]');await until('document.querySelector("[data-testid=save-status]").textContent.includes("已保存")');};
  const network:string[]=[];
  window.webContents.session.webRequest.onBeforeRequest((request,callback)=>{const external=/^https?:/.test(request.url);if(external)network.push('blocked');callback({cancel:external});});
  await until('document.querySelector("app-root")?.dataset.ready==="true" && !document.querySelector("[data-testid=create-note]").disabled');
  if(process.argv.includes('--self-test-reopen')){
    const fixture=JSON.parse(readFileSync(join(directory,'math-fixture.json'),'utf8'));
    await until('document.querySelector(".note-card.selected")?.dataset.noteId==='+JSON.stringify(fixture.id));
    await until('document.querySelectorAll(".ql-editor .katex").length===4');
    if(await body()!==fixture.body)throw Error('Formula source changed after restart');
    writeFileSync(join(directory,'math-reopen.json'),JSON.stringify({sourceExact:true,formulas:4,offline:true}));return;
  }
  await click('[data-testid=create-note]');await click('[data-testid=create-markdown]');
  const source=['# Mathematics','',String.raw`Inline $E = mc^2$ and \(a+b\).`,'','$$',String.raw`f(x) = \int_{-\infty}^{\infty} \hat{f}(\xi)\,e^{2\pi i \xi x}\,d\xi`,'$$','',String.raw`\[\frac{1}{2} + \sqrt{x}\]`,'',String.raw`Price \$5 and $10 USD.`,'','Inline code `$no$`','', '```','$notMath$','```',''].join('\n');
  await input('[data-testid=markdown-source]',source);await click('[data-testid=load-source]');
  await until('document.querySelectorAll(".ql-editor .katex").length===4');
  if(await run('!!document.querySelector("[data-testid=format-warning]")'))throw Error('Math unexpectedly source protected: '+await run('document.querySelector("[data-testid=format-warning]").textContent'));
  if(await body()!==source)throw Error('Opening formulas changed original source');
  const counts=await run('({inline:document.querySelectorAll(".ql-editor .ql-note-math").length,block:document.querySelectorAll(".ql-editor .ql-note-math-block").length,code:[...document.querySelectorAll(".ql-code-block")].map(n=>n.textContent).join("\\n")})');
  if(counts.inline!==2||counts.block!==2||!counts.code.includes('$notMath$'))throw Error('Math boundaries lost: '+JSON.stringify(counts));
  await save();await run('document.querySelector(".note-card.selected").click()');await until('document.querySelectorAll(".ql-editor .katex").length===4');
  if(await body()!==source)throw Error('Untouched math source changed on save/reopen');
  await run('{const node=document.querySelector(".ql-note-math");node.focus();node.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true,cancelable:true}));}');await until('!!document.querySelector("[data-testid=math-dialog]")');await click('[data-testid=math-cancel]');if(await body()!==source)throw Error('Keyboard formula edit changed body');
  await click('.ql-editor .ql-note-math');await input('[data-testid=math-source]','E = mc^3');await click('[data-testid=math-apply]');
  await until('document.querySelector("[data-testid=markdown-source]").value.includes("$E = mc^3$")');
  await click('[data-testid=undo-body]');if(await body()!==source)throw Error('Formula edit was not one exact undo');await click('[data-testid=redo-body]');
  await click('.ql-editor .ql-note-math');await click('[data-testid=math-block]');await click('[data-testid=math-apply]');
  await until('document.querySelectorAll(".ql-editor .ql-note-math-block").length===3');
  await click('[data-testid=undo-body]');await until('document.querySelectorAll(".ql-editor .ql-note-math-block").length===2');
  await click('.ql-editor .ql-note-math');await input('[data-testid=math-source]',String.raw`\unknownCommand`);await until('!!document.querySelector("[data-testid=math-error]") && document.querySelector("[data-testid=math-apply]").disabled');await click('[data-testid=math-cancel]');
  const edited=await body();if(!edited.includes(String.raw`\hat{f}(\xi)\,e^{2\pi i \xi x}\,d\xi`))throw Error('Editing unrelated math lost exact LaTeX');
  for(const locale of ['en','de','fr','it','es','pt-PT','zh-CN','zh-TW','ja','ko'] as Locale[]){
    await input('[data-testid=language]',locale);await run('document.querySelector("[data-testid=language]").dispatchEvent(new Event("change",{bubbles:true}))');
    await until('document.querySelector("[data-testid=insert-math]").getAttribute("aria-label")==='+JSON.stringify(mathText(locale,'formula')));
    await click('.ql-editor .ql-note-math');await until('document.querySelector("#math-dialog-title").textContent==='+JSON.stringify(mathText(locale,'edit')));await click('[data-testid=math-cancel]');
  }
  await input('[data-testid=language]','zh-CN');await run('document.querySelector("[data-testid=language]").dispatchEvent(new Event("change",{bubbles:true}))');await until('document.querySelector("[data-testid=insert-math]").getAttribute("aria-label")==="公式"');
  await run('{const e=document.querySelector(".ql-editor"),p=e.querySelector("p"),r=document.createRange();r.selectNodeContents(p);r.collapse(false);e.focus();getSelection().removeAllRanges();getSelection().addRange(r);}');
  await new Promise(r=>setTimeout(r,150));
  const beforeInsert=await body();
  await click('[data-testid=insert-math]');await input('[data-testid=math-source]','z^2');await click('[data-testid=math-apply]');await until('document.querySelectorAll(".ql-editor .katex").length===5');
  await run('[...document.querySelectorAll(".ql-note-math")].find(n=>n.getAttribute("data-note-math")==="$z^2$").click()');await until('!!document.querySelector("[data-testid=math-remove]")');await click('[data-testid=math-remove]');await until('document.querySelectorAll(".ql-editor .katex").length===4');
  await click('[data-testid=undo-body]');await until('document.querySelectorAll(".ql-editor .katex").length===5');await click('[data-testid=undo-body]');if(await body()!==beforeInsert)throw Error('Insertion/remove undo lost source');
  await click('[data-testid=redo-body]');await click('[data-testid=redo-body]');
  await save();await click('[data-testid=load-source]');await until('document.querySelectorAll(".ql-editor .katex").length===4');
  const printEvidence:any[]=[];
  const inspect=(_event:unknown,page:BrowserWindow)=>{const original=page.webContents.printToPDF.bind(page.webContents);page.webContents.printToPDF=async options=>{const result=await page.webContents.executeJavaScript('({math:document.querySelectorAll(".katex").length,fonts:document.fonts.check("16px KaTeX_Main"),external:[...document.querySelectorAll("[src],[href]")].some(n=>/^https?:/.test(n.getAttribute("src")||n.getAttribute("href")||""))})');printEvidence.push(result);return original(options);};};
  const printer = require('./note-print') as typeof import('./note-print');
  const originalPrint = printer.renderNotePrint;
  printer.renderNotePrint = async (...args: Parameters<typeof originalPrint>) => { try { return await originalPrint(...args); } catch(error) { writeFileSync(join(directory,'math-print-error.txt'),String((error as Error).stack)); throw error; } };
  app.on('browser-window-created',inspect);
  const exportRoot=join(tmpdir(),'notebookaid-export-'+basename(directory));
  mkdirSync(exportRoot,{recursive:true});
  const pdf=join(exportRoot,'math-'+randomUUID()+'.pdf');
  try{
    writeFileSync(join(directory,'note-file-dialog.json'),JSON.stringify({path:pdf}));
    await click('[data-testid=print-note]');await click('[data-testid=print-pdf]');
    await until('!document.querySelector("[data-testid=print-note]").disabled');
    if(!existsSync(pdf))throw Error('PDF not written: '+await run('document.querySelector("[data-testid=file-message]")?.textContent')+' '+JSON.stringify(printEvidence));
    copyFileSync(pdf,join(directory,'math.pdf'));
    if(!readFileSync(pdf).subarray(0,5).equals(Buffer.from('%PDF-'))||printEvidence[0]?.math!==4||printEvidence[0]?.external)throw Error('Math PDF lost rendering: '+JSON.stringify(printEvidence));
  }finally{app.removeListener('browser-window-created',inspect);printer.renderNotePrint=originalPrint;if(existsSync(pdf))unlinkSync(pdf);if(existsSync(exportRoot))rmdirSync(exportRoot);}
  await run('document.fonts.ready.then(()=>true)');
  await input('[data-testid=theme]','dark');await run('document.querySelector("[data-testid=theme]").dispatchEvent(new Event("change",{bubbles:true}))');await until('document.documentElement.dataset.theme==="dark"');
  await run('document.querySelectorAll("[data-testid=notification] .icon-button").forEach(n=>n.click())');
  window.showInactive();await new Promise(r=>setTimeout(r,300));await window.webContents.capturePage();await new Promise(r=>setTimeout(r,150));writeFileSync(join(directory,'math-dark.png'),(await window.webContents.capturePage()).toPNG());
  const id=await run('document.querySelector(".note-card.selected").dataset.noteId');
  const finalBody=await body();
  await click('[data-testid=create-note]');await click('[data-testid=create-markdown]');
  const bad=['# Errors','',String.raw`$\unknownCommand$`,'',String.raw`$\def\a{\a}\a$`,'',String.raw`$\includegraphics{https://example.invalid/private}$`].join('\n');
  await input('[data-testid=markdown-source]',bad);await click('[data-testid=load-source]');await until('document.querySelectorAll(".ql-editor .math-invalid").length===2');
  if(await body()!==bad || await run('!!document.querySelector(".ql-editor img,.ql-editor a[href]")'))throw Error('Invalid/untrusted math changed source or created active nodes');
  await click('.ql-editor .math-invalid');await input('[data-testid=math-source]','x+1');await click('[data-testid=math-apply]');await click('[data-testid=undo-body]');if(await body()!==bad)throw Error('Invalid math edit undo failed');
  const nested='> $$\n> x^2\n> $$';await input('[data-testid=markdown-source]',nested);await click('[data-testid=load-source]');await until('!!document.querySelector("[data-testid=format-warning]")');if(await body()!==nested)throw Error('Nested display math lost source');
  const literal=String.raw`Price \$5 and $10; $x$ and \$y\$.`;await input('[data-testid=markdown-source]',literal);await click('[data-testid=load-source]');await until('document.querySelectorAll(".ql-editor .katex").length===1');
  await run('{const e=document.querySelector(".ql-editor"),p=e.querySelector("p"),r=document.createRange();r.selectNodeContents(p);r.collapse(false);e.focus();getSelection().removeAllRanges();getSelection().addRange(r);document.execCommand("insertText",false," tail");}');await new Promise(r=>setTimeout(r,200));await click('[data-testid=load-source]');await until('document.querySelectorAll(".ql-editor .katex").length===1');
  await click('.note-card[data-note-id="'+id+'"]');await until('document.querySelectorAll(".ql-editor .katex").length===4');
  if(await body()!==finalBody)throw Error('Switching notes lost formulas');
  if(app.isPackaged){
    await click('[data-testid=application-menu]');await click('[data-testid=menu-license]');await until('!!document.querySelector("[data-testid=third-party-components] tbody tr")');
    if(!await run('["katex","KaTeX bundled fonts","commander"].every(name=>[...document.querySelectorAll("[data-testid=third-party-components] tbody tr")].some(row=>row.cells[0].textContent===name && row.cells[2].textContent==="MIT"))'))throw Error('Math license rows missing');
    if(!await run('document.querySelector("[data-testid=information-dialog]").textContent.includes("KATEX-LICENSE.txt") && document.querySelector("[data-testid=information-dialog]").textContent.includes("KATEX-FONTS-LICENSE.txt")'))throw Error('Math notices missing in UI');
    await click('[data-testid=information-dismiss]');
  }
  writeFileSync(join(directory,'math-fixture.json'),JSON.stringify({id,body:await body()}));
  writeFileSync(join(directory,'math-report.json'),JSON.stringify({inline:2,block:2,exactOriginal:true,sourceEditable:true,oneUndo:true,modeSwitch:true,insertionRemoval:true,invalidRetained:true,security:true,licenseUi:app.isPackaged,locales:10,networkAttempts:network.length,printEvidence}));
}
