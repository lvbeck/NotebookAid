import { mkdirSync, writeFileSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';
import { plainPath } from './library-import';
export function writeMcpPlugin(directory: string, clientId: string, executable: string, args: string[], license: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(clientId) || !isAbsolute(executable) || !args.every(value => typeof value === 'string')) throw Error('INVALID_INPUT');
  const root = join(directory, 'mcp-plugins', clientId); plainPath(root);
  mkdirSync(join(directory, 'mcp-plugins'), { recursive: true, mode: 0o700 }); mkdirSync(root, { mode: 0o700 });
  const plugin = join(root, 'plugins/notebookaid'); mkdirSync(join(plugin, '.codex-plugin'), { recursive: true });
  mkdirSync(join(root, '.agents/plugins'), { recursive: true });
  const put = (file: string, value: unknown) => writeFileSync(join(root, file), JSON.stringify(value, null, 2), { flag: 'wx', mode: 0o600 });
  const identity = { name: 'notebookaid', version: '0.1.0', description: 'Create TXT and Markdown notes in your explicitly authorized local NotebookAid folder.', author: { name: 'Jin Lu', email: 'it@live.cn' }, license: 'BSD-3-Clause' };
  const server = { command: executable, args: [...args, '--mcp-stdio', '--mcp-profile', clientId], tool_timeout_sec: 180 };
  put('plugins/notebookaid/.codex-plugin/plugin.json', { ...identity, requires_local_executor: true, mcpServers: './.mcp.json', interface: { displayName: 'NotebookAid', shortDescription: 'Create notes in NotebookAid' } });
  put('plugins/notebookaid/.mcp.json', { mcpServers: { notebookaid: server } });
  writeFileSync(join(plugin, 'LICENSE'), license, { flag: 'wx' });
  put('.agents/plugins/marketplace.json', { name: 'notebookaid-local-' + clientId, interface: { displayName: 'NotebookAid local' }, plugins: [{ name: 'notebookaid', source: { source: 'local', path: './plugins/notebookaid' }, policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' }, category: 'Productivity' }] });
  writeFileSync(join(root, 'INSTALL.txt'), 'Local NotebookAid plugin. No token is stored in this folder.\nKeep NotebookAid running. Import this local marketplace in Codex, then install NotebookAid.\nCLI: codex plugin marketplace add "' + root + '"\nThen: codex plugin add notebookaid@notebookaid-local-' + clientId + '\nUninstall in Codex and revoke the client in NotebookAid to remove access.\nAfter moving NotebookAid, create a new client/plugin and revoke this one.\n', { flag: 'wx' });
  return root;
}
