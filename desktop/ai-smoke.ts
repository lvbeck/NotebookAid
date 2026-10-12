import { type BrowserWindow } from 'electron';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
export async function smokeAi(window: BrowserWindow, root: string): Promise<void> {
 const run = (script: string) => window.webContents.executeJavaScript(script);
 const until = async (script: string) => { for (let i=0;i<150;i++) { if (await run(script)) return; await new Promise(r=>setTimeout(r,100)); } throw Error('AI UI timeout: ' + script); };
 await until("document.querySelector('app-root')?.dataset.ready==='true'");
 await run("document.querySelector('[data-testid=settings-tab]').click()");
 await until("!!document.querySelector('[data-testid=ai-provider-gemini]') && !document.querySelector('[data-testid=ai-provider-gemini]').disabled");
 if (!process.argv.includes('--self-test-reopen')) {
   if (await run("!!document.querySelector('[data-testid=ai-gemini]') || !!document.querySelector('[data-testid=ai-claude]')")) throw Error('Unselected provider settings rendered');
   await run("document.querySelector('[data-testid=ai-provider-gemini]').click()");
 }
 await until("!!document.querySelector('[data-testid=ai-key-gemini]')");
 if (process.argv.includes('--self-test-reopen')) {
   const value = await run("window.notebookAid.ai.request({action:'state'})");
   await until("window.notebookAid.ai.request({action:'state'}).then(r=>r.ok&&r.value.connections[1].models.length===1)");
   if (!value.ok || value.value.selected !== 'gemini' || value.value.connections[1].model !== 'models/fixture-text') throw Error('AI restart state');
   writeFileSync(join(root,'ai-reopen.json'),JSON.stringify({reopened:true,secretsNotReturned:true,selectedModel:true})); return;
 }
 if (!await run("window.notebookAid.ai.request({action:'state'}).then(r=>r.ok&&r.value.available)")) throw Error('DPAPI unavailable');
 await run("(()=>{const input=document.querySelector('[data-testid=ai-key-gemini]');input.value='fixture-secret-only-123';input.dispatchEvent(new Event('input',{bubbles:true}));})()");
 if (!await run("document.querySelector('[data-testid=ai-key-gemini]').type==='password'")) throw Error('Secret not masked');
 await run("document.querySelector('[data-testid=ai-save-gemini]').click()");
 await until("!!document.querySelector('[data-testid=ai-check-gemini]')");
 if (!await run("document.querySelector('[data-testid=ai-key-gemini]').value===''")) throw Error('Secret retained in input');
 await run("document.querySelector('[data-testid=ai-check-gemini]').click()");
 await until("window.notebookAid.ai.request({action:'state'}).then(r=>r.ok&&r.value.connections[1].models.length===1)");
 const selected = await run("window.notebookAid.ai.request({action:'select',provider:'gemini',model:'models/fixture-text'})"); if (!selected.ok) throw Error('Model selection failed');
 if (JSON.stringify(selected).includes('fixture-secret-only-123') || readFileSync(join(root,'ai-connections.bin')).includes(Buffer.from('fixture-secret-only-123'))) throw Error('Credential plaintext leak');
 writeFileSync(join(root,'simulate-ai-offline'),'fixture');
 await run("document.querySelector('[data-testid=ai-check-gemini]').click()");
 await until("document.querySelector('[data-testid=ai-message]')?.textContent.includes('NETWORK_ERROR')");
 unlinkSync(join(root,'simulate-ai-offline'));
 await run("document.querySelector('[data-testid=ai-provider-chatgpt]').click()");
 await until("!!document.querySelector('[data-testid=ai-login]')");
 if (await run("!!document.querySelector('[data-testid=ai-gemini]') || !!document.querySelector('[data-testid=ai-claude]')")) throw Error('Provider switch did not isolate settings');
 await run("document.querySelector('[data-testid=ai-login]').click()");
 await until("!!document.querySelector('[data-testid=ai-cancel]')");
 await run("document.querySelector('[data-testid=ai-cancel]').click()");
 await until("document.querySelector('[data-testid=ai-message]')?.textContent.includes('LOGIN_CANCELLED')");
 const invalid = await run("window.notebookAid.ai.request({action:'key',provider:'chatgpt',key:'fixture-secret-only-123'})"); if (invalid.ok || invalid.code !== 'INVALID_INPUT') throw Error('Billing route validation');
 await run("document.querySelector('[data-testid=ai-provider-gemini]').click()");
 await until("!!document.querySelector('[data-testid=ai-check-gemini]')");
 await run("document.querySelector('[data-testid=ai-check-gemini]').click()");
 await until("document.querySelector('[data-testid=ai-gemini]')?.textContent.includes('当前连接') && !document.querySelector('[data-testid=ai-check-gemini]').disabled");
 await new Promise(r=>setTimeout(r,400));
 await window.webContents.capturePage().then(image=>writeFileSync(join(root,'ai-light.png'),image.toPNG()));
 await run("(()=>{const input=document.querySelector('app-settings select option[value=dark]').parentElement;input.value='dark';input.dispatchEvent(new Event('change',{bubbles:true}));})()");
 await until("document.documentElement.dataset.theme==='dark'");
 window.setSize(1000,800); await new Promise(r=>setTimeout(r,400));
 await until("getComputedStyle(document.querySelector('[data-testid=ai-check-gemini]')).backgroundColor==='rgb(24, 24, 31)'");
 await window.webContents.capturePage().then(image=>writeFileSync(join(root,'ai-dark.png'),image.toPNG()));
 if (!existsSync(join(root,'ai-connections.bin'))) throw Error('No credential store');
 writeFileSync(join(root,'ai-report.json'),JSON.stringify({dpapi:true,maskedInput:true,secretsCleared:true,modelListing:true,modelSelection:true,offline:true,cancelLogin:true,routeValidation:true,secretsNotReturned:true,plaintextNotStored:true,providerIsolation:true,darkTheme:true}));
}
