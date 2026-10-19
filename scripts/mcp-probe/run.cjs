const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { randomUUID, createHash } = require('node:crypto');
const readline = require('node:readline');
const { once } = require('node:events');
const { Client } = require('@modelcontextprotocol/client');
const { StdioClientTransport } = require('@modelcontextprotocol/client/stdio');
const workspace = path.resolve(__dirname, '../..');
const configFile = path.join(process.env.CODEX_HOME || path.join(require('node:os').homedir(), '.codex'), 'config.toml');
const configHash = () => fs.existsSync(configFile) ? createHash('sha256').update(fs.readFileSync(configFile)).digest('hex') : null;
const originalConfig = configHash();
const root = path.join(workspace, 'output/mcp01'); fs.mkdirSync(root, { recursive: true });
const home = fs.mkdtempSync(path.join(root, 'connection-'));
fs.writeFileSync(path.join(home, 'mcp-probe-fixture.json'), JSON.stringify({ purpose: 'NotebookAid MCP-01 synthetic data only' }));
const entry = path.join(__dirname, 'server.cjs');
const report = { task: 'MCP-01', fixture: home, productVersion: require('../../package.json').version, sdkVersion: '2.3.1', checks: {}, modelRequests: 0, globalConfigChanged: false, pluginInstalled: false };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const bounded = (promise, ms, label) => {
  let timer; return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label)), ms); })]).finally(() => clearTimeout(timer));
};
const appEnv = { ...process.env, NOTEBOOKAID_TEST_HOME: home, NOTEBOOKAID_MCP_PROBE: '1' }; delete appEnv.ELECTRON_RUN_AS_NODE;
const app = spawn(require('electron'), ['.', '--self-test'], { cwd: workspace, env: appEnv, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
app.stderr.on('data', () => {});
let appError; app.on('error', error => { appError = error; });
let codex, client, transport;

function rpc(child) {
  let sequence = 0; const pending = new Map();
  readline.createInterface({ input: child.stdout }).on('line', line => {
    let message; try { message = JSON.parse(line); } catch { return; }
    const item = pending.get(message.id);
    if (!item) return;
    pending.delete(message.id);
    if (message.error) item.reject(new Error(`Codex ${item.method}: ${message.error.code}`)); else item.resolve(message.result);
  });
  child.on('exit', () => { for (const item of pending.values()) item.reject(new Error('CODEX_EXITED')); pending.clear(); });
  return {
    request(method, params) { const id = ++sequence; const value = new Promise((resolve, reject) => pending.set(id, { resolve, reject, method })); child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); return bounded(value, 60000, `TIMEOUT_${method}`); },
    notify(method) { child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params: {} }) + '\n'); }
  };
}

async function main() {
  for (let i = 0; !fs.existsSync(path.join(home, 'mcp-probe-runtime.json')); i++) {
    if (appError || app.exitCode !== null || i > 150) throw new Error('BACKGROUND_START_FAILED');
    await sleep(200);
  }
  report.checks.backgroundStarted = true;
  transport = new StdioClientTransport({ command: process.execPath, args: [entry], env: { NOTEBOOKAID_MCP_PROBE_HOME: home }, stderr: 'pipe' });
  transport.stderr?.on('data', () => {});
  client = new Client({ name: 'notebookaid-mcp01-validator', version: '0.1.0' });
  await bounded(client.connect(transport), 15000, 'MCP_CONNECT_TIMEOUT');
  const tools = await client.listTools();
  assert.deepEqual(tools.tools.map(tool => tool.name), ['notebookaid_create_note']);
  report.checks.sdkToolDiscovery = true;
  const input = { requestId: randomUUID(), title: 'MCP synthetic note', body: '\u4e2d\u6587 MCP fixture \ud83d\udcdd\nSecond line.' };
  const call = async args => {
    const result = await client.callTool({ name: 'notebookaid_create_note', arguments: args });
    return result.structuredContent ?? JSON.parse(result.content[0].text);
  };
  const created = await call(input); assert.equal(created.ok, true); assert.equal(created.saved, true);
  assert.equal((await call(input)).noteId, created.noteId);
  const changed = await call({ ...input, body: 'Different payload' }); assert.equal(changed.ok, false);
  report.checks.sdkBackgroundCreate = true; report.checks.retryDeduplicated = true; report.checks.changedRetryRejected = true;
  const bad = await client.callTool({ name: 'notebookaid_create_note', arguments: { ...input, path: 'C:\\private' } });
  assert.equal(bad.isError, true); report.checks.unknownFieldsRejected = true;
  await client.close(); client = null;
  assert.equal(app.exitCode, null); report.checks.mcpDisconnectKeepsBackgroundAlive = true;

  const configuration = 'mcp_servers={notebookaid_probe={command=' + JSON.stringify(process.execPath) + ',args=[' + JSON.stringify(entry) + '],env={NOTEBOOKAID_MCP_PROBE_HOME=' + JSON.stringify(home) + '}}}';
  codex = spawn('codex', ['-c', configuration, '-c', 'analytics.enabled=false', 'app-server', '--stdio'], { cwd: workspace, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  codex.on('error', () => {}); codex.stderr.on('data', () => {});
  const channel = rpc(codex);
  const initialized = await channel.request('initialize', { clientInfo: { name: 'notebookaid_mcp01_probe', version: '0.1.0' }, capabilities: { experimentalApi: true } });
  report.codexVersion = initialized.userAgent ?? 'See codex-cli --version'; channel.notify('initialized');
  const marketplace = path.join(home, 'plugin-fixture');
  const plugin = path.join(marketplace, 'plugins/notebookaid-mcp01-probe');
  fs.mkdirSync(path.join(plugin, '.codex-plugin'), { recursive: true });
  fs.mkdirSync(path.join(marketplace, '.agents/plugins'), { recursive: true });
  fs.writeFileSync(path.join(plugin, '.codex-plugin/plugin.json'), JSON.stringify({ name: 'notebookaid-mcp01-probe', version: '0.1.0', description: 'Synthetic MCP-01 validation only', mcpServers: './.mcp.json', interface: { displayName: 'NotebookAid MCP-01 probe', shortDescription: 'Synthetic background note creation' } }));
  fs.writeFileSync(path.join(plugin, '.mcp.json'), JSON.stringify({ mcpServers: { notebookaid_probe: { command: process.execPath, args: [entry], env: { NOTEBOOKAID_MCP_PROBE_HOME: home } } } }));
  const catalog = path.join(marketplace, '.agents/plugins/marketplace.json');
  fs.writeFileSync(catalog, JSON.stringify({ name: 'notebookaid-mcp01-validation', interface: { displayName: 'NotebookAid validation' }, plugins: [{ name: 'notebookaid-mcp01-probe', source: { source: 'local', path: './plugins/notebookaid-mcp01-probe' }, policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' }, category: 'Productivity' }] }));
  const details = await channel.request('plugin/read', { marketplacePath: catalog, pluginName: 'notebookaid-mcp01-probe' });
  assert.equal(details.plugin.summary.name, 'notebookaid-mcp01-probe');
  assert(details.plugin.mcpServers.includes('notebookaid_probe')); report.checks.codexPluginFixtureParsed = true;
  const thread = await channel.request('thread/start', { cwd: home, ephemeral: true, sandbox: 'read-only', approvalPolicy: 'on-request' });
  const threadId = thread.thread.id;
  const status = await channel.request('mcpServerStatus/list', { threadId, serverName: 'notebookaid_probe' });
  const inventory = status.data.find(item => item.name === 'notebookaid_probe');
  assert(inventory, 'CODEX_SERVER_MISSING');
  assert(Object.values(inventory.tools).some(tool => tool.name === 'notebookaid_create_note'), 'CODEX_TOOL_MISSING');
  report.checks.codexToolDiscovery = true;
  const codexInput = { requestId: randomUUID(), title: 'Codex MCP synthetic note', body: '# MCP-01\n\nSynthetic background creation.', format: 'markdown' };
  const codexResult = await channel.request('mcpServer/tool/call', { threadId, server: 'notebookaid_probe', tool: 'notebookaid_create_note', arguments: codexInput });
  const receipt = codexResult.structuredContent ?? JSON.parse(codexResult.content[0].text);
  assert.equal(receipt.ok, true); assert.equal(receipt.saved, true); report.checks.codexBackgroundCreate = true;
  codex.stdin.end(); await bounded(once(codex, 'exit'), 15000, 'CODEX_SHUTDOWN_TIMEOUT'); codex = null;
  assert.equal(app.exitCode, null); report.checks.codexDisconnectKeepsBackgroundAlive = true;
  const evidence = JSON.parse(fs.readFileSync(path.join(home, 'mcp-probe-evidence.json'), 'utf8'));
  assert.equal(evidence.windowCount, 0); report.checks.zeroBrowserWindows = true;
  assert.equal(new Set(evidence.operations.map(item => item.noteId)).size, 2);
  fs.writeFileSync(path.join(home, 'mcp-probe-stop'), 'stop');
  await bounded(once(app, 'exit'), 10000, 'BACKGROUND_SHUTDOWN_TIMEOUT');
  const { NoteLibrary } = require('../../dist/runtime/core/library.js');
  const notebook = new NoteLibrary(path.join(home, 'library'), undefined, 'existing');
  try {
    assert.equal(notebook.list().length, 2);
    assert.equal(notebook.read(created.noteId).body, input.body);
    assert.equal(notebook.read(receipt.noteId).body, codexInput.body);
    assert.equal(notebook.read(receipt.noteId).primaryFormat, 'markdown');
  } finally { notebook.close(); }
  report.checks.reopenedExactContent = true; report.ok = true;
}

main().catch(error => { report.ok = false; report.failure = error.message; process.exitCode = 1; }).finally(async () => {
  if (client) await client.close().catch(() => {});
  if (codex && codex.exitCode === null) { codex.stdin.end(); await bounded(once(codex, 'exit'), 3000, 'cleanup').catch(() => codex.kill()); }
  if (app.exitCode === null) { fs.writeFileSync(path.join(home, 'mcp-probe-stop'), 'stop'); await bounded(once(app, 'exit'), 5000, 'cleanup').catch(() => app.kill()); }
  report.globalConfigChanged = originalConfig !== configHash();
  if (report.globalConfigChanged) { report.ok = false; report.failure = 'GLOBAL_CONFIG_CHANGED_DURING_PROBE'; process.exitCode = 1; }
  fs.writeFileSync(path.join(home, 'report.json'), JSON.stringify(report, null, 2));
  if (report.ok) fs.writeFileSync(path.join(root, 'latest-success.json'), JSON.stringify(report, null, 2));
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
});
