import type { BrowserWindow } from 'electron';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { McpProfiles } from '../core/mcp-profile';
import { mcpCipher } from './mcp-cipher';
import { assertProbeHome } from './mcp-probe';
import { mcpText } from '../src/app/mcp-i18n';
export async function smokeMcpSetup(window: BrowserWindow, directory: string, workspace: string): Promise<void> {
  assertProbeHome(workspace, directory);
  let stage = 'SETTINGS';
  const run = (script: string) => window.webContents.executeJavaScript(script);
  const until = async (script: string) => { for (let i = 0; i < 250; i++) { if (await run(script)) return; await new Promise(resolve => setTimeout(resolve, 80)); } throw Error('MCP_UI_TIMEOUT_' + stage); };
  const click = async (selector: string) => { await until(`!!document.querySelector(${JSON.stringify(selector)}) && !document.querySelector(${JSON.stringify(selector)}).disabled`); await run(`document.querySelector(${JSON.stringify(selector)}).click()`); };
  await click('[data-testid=settings-tab]');
  stage = 'AVAILABLE';
  await run('document.querySelector("[data-testid=mcp-settings]").open=true');
  await until('!document.querySelector("[data-testid=mcp-create]").disabled');
  const initial = await run('window.notebookAid.mcp.request({action:"state"})');
  if (!initial.ok || initial.value.clients.length) throw Error('INVALID_INITIAL_SETUP_STATE');
  stage = 'CANCEL';
  await click('[data-testid=mcp-create]'); await click('[data-testid=dialog-cancel]');
  await until('!document.querySelector("[data-testid=mcp-create]").disabled');
  if ((await run('window.notebookAid.mcp.request({action:"state"})')).value.clients.length) throw Error('CANCELLED_SETUP_CREATED_GRANT');
  stage = 'CREATE'; await click('[data-testid=mcp-create]'); await click('[data-testid=dialog-confirm]');
  await until('!!document.querySelector("[data-testid=mcp-created]")');
  const state = await run('window.notebookAid.mcp.request({action:"state"})');
  if (!state.ok || state.value.clients.length !== 1 || JSON.stringify(state).includes('token')) throw Error('INVALID_SETUP_RECEIPT');
  const client = state.value.clients[0], profile = await new McpProfiles(directory, mcpCipher).read(client.clientId);
  const pluginRoot = join(directory, 'mcp-plugins', client.clientId);
  for (const file of ['plugins/notebookaid/.mcp.json', 'plugins/notebookaid/.codex-plugin/plugin.json', '.agents/plugins/marketplace.json', 'INSTALL.txt']) if (readFileSync(join(pluginRoot, file)).includes(profile.token)) throw Error('TOKEN_IN_PLUGIN_EXPORT');
  if (readFileSync(join(directory, 'mcp-profiles', client.clientId + '.bin')).includes(profile.token)) throw Error('TOKEN_NOT_ENCRYPTED');
  stage = 'LOCALES'; for (const locale of ['en', 'de', 'fr', 'it', 'es', 'pt-PT', 'zh-CN', 'zh-TW', 'ja', 'ko']) {
    await run(`document.querySelector('[data-testid=language]').value=${JSON.stringify(locale)};document.querySelector('[data-testid=language]').dispatchEvent(new Event('change',{bubbles:true}))`);
    await until(`document.querySelector('[data-testid=mcp-create]').textContent.trim()===${JSON.stringify(mcpText(locale, 'create'))}`);
  }
  await run("document.querySelector('[data-testid=language]').value='zh-CN';document.querySelector('[data-testid=language]').dispatchEvent(new Event('change',{bubbles:true}))");
  await until(`document.querySelector('[data-testid=mcp-create]').textContent.trim()===${JSON.stringify(mcpText('zh-CN', 'create'))}`);
  window.setSize(980, 850); window.showInactive(); await run("document.querySelector('[data-testid=mcp-settings]').scrollIntoView({block:'center'})");
  await new Promise(resolve => setTimeout(resolve, 250)); writeFileSync(join(directory, 'mcp-setup.png'), (await window.webContents.capturePage()).toPNG());
  await run("document.querySelector('[data-testid=settings-theme]').value='dark';document.querySelector('[data-testid=settings-theme]').dispatchEvent(new Event('change',{bubbles:true}))");
  window.setSize(760, 850); await new Promise(resolve => setTimeout(resolve, 400)); await run("document.querySelector('[data-testid=mcp-settings]').scrollIntoView({block:'center'})");
  writeFileSync(join(directory, 'mcp-setup-dark-narrow.png'), (await window.webContents.capturePage()).toPNG());
  writeFileSync(join(directory, 'mcp-setup-ready.json'), JSON.stringify({ clientId: client.clientId, libraryId: client.libraryId, pluginRoot, checks: { ownerConfirmation: true, cancelCreatesNothing: true, rendererContainsNoToken: true, encryptedProfile: true, tenLocales: true } }));
  await new Promise<void>((resolve, reject) => {
    let busy = false; const command = join(directory, 'mcp-setup-command');
    const timer = setInterval(() => {
      if (busy || !existsSync(command)) return; const action = readFileSync(command, 'utf8'); unlinkSync(command);
      if (action === 'stop') { clearInterval(timer); resolve(); return; }
      if (action === 'revoke') {
        busy = true;
        void click('[data-testid=mcp-revoke]').then(async () => { await until('!document.querySelector("[data-testid=mcp-revoke]")'); writeFileSync(join(directory, 'mcp-revoked'), 'revoked'); }).catch(error => { clearInterval(timer); reject(error); }).finally(() => { busy = false; });
      }
    }, 50);
  });
}
