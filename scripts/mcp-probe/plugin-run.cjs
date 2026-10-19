const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const { randomUUID, createHash } = require('node:crypto');
const readline = require('node:readline');
const { Client } = require('@modelcontextprotocol/client');
const { StdioClientTransport } = require('@modelcontextprotocol/client/stdio');
const workspace = path.resolve(__dirname, '../..'), root = path.join(workspace, 'output/mcp01'); fs.mkdirSync(root, { recursive: true });
const home = fs.mkdtempSync(path.join(root, 'plugin-'));
fs.writeFileSync(path.join(home, 'mcp-probe-fixture.json'), JSON.stringify({ purpose: 'NotebookAid MCP-01 synthetic data only' }));
const codexHome = path.join(home, 'isolated-codex'); fs.mkdirSync(codexHome);
const config = path.join(process.env.CODEX_HOME || path.join(require('node:os').homedir(), '.codex'), 'config.toml');
const digest = () => fs.existsSync(config) ? createHash('sha256').update(fs.readFileSync(config)).digest('hex') : null; const original = digest();
const report = { task: 'MCP-06', fixture: home, checks: {}, isolatedCodexInstallation: true, globalPluginInstalled: false, modelRequests: 0, physicalPasskeyTested: false };
let codex, client;
let stage = 'UI';
const bounded = (promise, ms, code) => { let timer; return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(Error(code)), ms); })]).finally(() => clearTimeout(timer)); };
const env = { ...process.env, NOTEBOOKAID_TEST_HOME: home, NOTEBOOKAID_MCP_SETUP_TEST: '1' }; delete env.ELECTRON_RUN_AS_NODE;
const app = spawn(require('electron'), ['.', '--self-test'], { cwd: workspace, env, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] }); app.stderr.on('data', () => {}); app.on('error', () => {});
async function waitFile(name, timeout = 60000) { for (let i = 0; i < timeout / 100; i++) { if (fs.existsSync(path.join(home, name))) return; if (app.exitCode !== null) throw Error('APP_EXITED'); await new Promise(resolve => setTimeout(resolve, 100)); } throw Error('FIXTURE_TIMEOUT'); }
function rpc(child) {
  const pending = new Map(); let sequence = 0;
  readline.createInterface({ input: child.stdout }).on('line', line => { let message; try { message = JSON.parse(line); } catch { return; } const item = pending.get(message.id); if (!item) return; pending.delete(message.id); if (message.error) item.reject(Error('CODEX_RPC_FAILED')); else item.resolve(message.result); });
  child.on('exit', () => { for (const item of pending.values()) item.reject(Error('CODEX_EXITED')); pending.clear(); });
  return { request(method, params) { const id = ++sequence, value = new Promise((resolve, reject) => pending.set(id, { resolve, reject })); child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); return bounded(value, 60000, 'CODEX_RPC_TIMEOUT'); }, notify(method) { child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params: {} }) + '\n'); } };
}
const codexEnv = { ...process.env, CODEX_HOME: codexHome };
async function main() {
  await waitFile('mcp-setup-ready.json');
  const ready = JSON.parse(fs.readFileSync(path.join(home, 'mcp-setup-ready.json'), 'utf8')); Object.assign(report.checks, ready.checks);
  const plugin = path.join(ready.pluginRoot, 'plugins/notebookaid'), server = JSON.parse(fs.readFileSync(path.join(plugin, '.mcp.json'), 'utf8')).mcpServers.notebookaid;
  stage = 'BROKER';
  const transport = new StdioClientTransport({ command: server.command, args: server.args, stderr: 'pipe' }); transport.stderr?.on('data', chunk => { const code = chunk.toString().trim(); if (/^[A-Z_]+$/.test(code)) report.runtimeDiagnostic = code; });
  client = new Client({ name: 'notebookaid-plugin-validator', version: '0.1.0' }); await bounded(client.connect(transport), 20000, 'BROKER_CONNECT_FAILED');
  assert.deepEqual((await client.listTools()).tools.map(tool => tool.name), ['notebookaid_create_note']); report.checks.bundledRuntimeAndEncryptedProfile = true;
  const input = { requestId: randomUUID(), title: 'Synthetic installed plugin', body: '中文 encrypted profile 📝' };
  const result = await client.callTool({ name: 'notebookaid_create_note', arguments: input }); const receipt = result.structuredContent;
  assert.equal(receipt.ok, true); report.checks.secretFreeSdkCreate = true;
  const run = args => { const result = spawnSync('codex', args, { cwd: workspace, env: codexEnv, windowsHide: true, encoding: 'utf8', timeout: 60000 }); if (result.status !== 0) throw Error('ISOLATED_PLUGIN_INSTALL_FAILED'); return result; };
  stage = 'INSTALL'; run(['plugin', 'marketplace', 'add', ready.pluginRoot]);
  const market = JSON.parse(fs.readFileSync(path.join(ready.pluginRoot, '.agents/plugins/marketplace.json'), 'utf8')).name;
  run(['plugin', 'add', 'notebookaid@' + market]); report.checks.actualIsolatedPluginInstallation = true;
  codex = spawn('codex', ['-c', 'analytics.enabled=false', 'app-server', '--stdio'], { cwd: workspace, env: codexEnv, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] }); codex.stderr.on('data', () => {}); codex.on('error', () => {}); codex.stdin.on('error', () => {});
  const channel = rpc(codex), initialized = await channel.request('initialize', { clientInfo: { name: 'notebookaid_mcp06_validator', version: '0.1.0' }, capabilities: { experimentalApi: true } }); report.codexVersion = initialized.userAgent; channel.notify('initialized');
  const details = await channel.request('plugin/read', { marketplacePath: path.join(ready.pluginRoot, '.agents/plugins/marketplace.json'), pluginName: 'notebookaid' });
  report.parsedPluginServers = details.plugin.mcpServers;
  const thread = await channel.request('thread/start', { cwd: home, ephemeral: true, sandbox: 'read-only', approvalPolicy: 'on-request' });
  const status = await channel.request('mcpServerStatus/list', { threadId: thread.thread.id });
  report.serverInventory = status.data.map(item => ({ name: item.name, tools: Object.values(item.tools).map(tool => tool.name) }));
  const inventory = status.data.find(item => Object.values(item.tools).some(tool => tool.name === 'notebookaid_create_note')); assert(inventory, 'INSTALLED_PLUGIN_TOOL_MISSING');
  report.checks.installedPluginToolDiscovery = true;
  const second = { requestId: randomUUID(), title: 'Synthetic Codex plugin', body: '# MCP-06\n\nInstalled local plugin.', format: 'markdown' };
  const called = await channel.request('mcpServer/tool/call', { threadId: thread.thread.id, server: inventory.name, tool: 'notebookaid_create_note', arguments: second }); const codexReceipt = called.structuredContent; assert.equal(codexReceipt.ok, true); report.checks.installedCodexCreate = true;
  fs.writeFileSync(path.join(home, 'mcp-setup-command'), 'revoke'); await waitFile('mcp-revoked');
  const denied = await client.callTool({ name: 'notebookaid_create_note', arguments: { ...input, requestId: randomUUID() } }); assert.equal(denied.structuredContent.code, 'ACCESS_DENIED');
  assert.equal(fs.existsSync(path.join(home, 'mcp-profiles', ready.clientId + '.bin')), false); report.checks.revokeInvalidatesRunningClient = true;
  await client.close(); client = null;
  const exited = once(codex, 'exit'); codex.stdin.end(); await bounded(exited, 10000, 'CODEX_SHUTDOWN_FAILED'); codex = null; assert.equal(app.exitCode, null); report.checks.disconnectKeepsNotebookAidAlive = true;
  run(['plugin', 'remove', 'notebookaid@' + market]); report.checks.isolatedPluginUninstall = true;
  fs.writeFileSync(path.join(home, 'mcp-setup-command'), 'stop'); await bounded(once(app, 'exit'), 10000, 'APP_SHUTDOWN_FAILED');
  const { NoteLibrary } = require('../../dist/runtime/core/library.js'), library = new NoteLibrary(path.join(home, 'library'), undefined, 'existing');
  try { assert.equal(library.list().length, 2); assert.equal(library.read(receipt.value.noteId).body, input.body); assert.equal(library.read(codexReceipt.value.noteId).body, second.body); } finally { library.close(); }
  report.checks.reopenedExactContent = true; report.ok = true;
}
main().catch(error => { report.ok = false; report.failure = /^[A-Z_]+$/.test(error.message) ? error.message : 'PLUGIN_VALIDATION_FAILED_' + stage; process.exitCode = 1; }).finally(async () => {
  if (client) await client.close().catch(() => {});
  if (codex && codex.exitCode === null) { const exited = once(codex, 'exit'); codex.stdin.end(); await bounded(exited, 3000, 'cleanup').catch(() => codex.kill()); }
  if (app.exitCode === null) { fs.writeFileSync(path.join(home, 'mcp-setup-command'), 'stop'); await bounded(once(app, 'exit'), 5000, 'cleanup').catch(() => app.kill()); }
  report.globalConfigChanged = original !== digest(); if (report.globalConfigChanged) { report.ok = false; process.exitCode = 1; }
  const output = path.join(workspace, 'output/mcp06'); fs.mkdirSync(output, { recursive: true }); fs.writeFileSync(path.join(home, 'mcp-plugin-report.json'), JSON.stringify(report, null, 2)); if (report.ok) fs.writeFileSync(path.join(output, 'latest-success.json'), JSON.stringify(report, null, 2));
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
});
