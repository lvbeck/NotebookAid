const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { randomUUID, createHash } = require('node:crypto');
const readline = require('node:readline');
const { once } = require('node:events');
const { Client } = require('@modelcontextprotocol/client');
const { StdioClientTransport } = require('@modelcontextprotocol/client/stdio');
const { externalCreate } = require('../../dist/runtime/desktop/external-client.js');
const workspace = path.resolve(__dirname, '../..');
const configFile = path.join(process.env.CODEX_HOME || path.join(require('node:os').homedir(), '.codex'), 'config.toml');
const configHash = () => fs.existsSync(configFile) ? createHash('sha256').update(fs.readFileSync(configFile)).digest('hex') : null;
const originalConfig = configHash();
const root = path.join(workspace, 'output/mcp01'); fs.mkdirSync(root, { recursive: true });
const home = fs.mkdtempSync(path.join(root, 'authorization-'));
fs.writeFileSync(path.join(home, 'mcp-probe-fixture.json'), JSON.stringify({ purpose: 'NotebookAid MCP-01 synthetic data only' }));
const createRetry = process.argv.includes('--create-retry');
const reportRoot = path.join(workspace, createRetry ? 'output/mcp05' : 'output/mcp03'); fs.mkdirSync(reportRoot, { recursive: true });
const reportHome = fs.mkdtempSync(path.join(reportRoot, 'authorization-'));
const entry = path.join(__dirname, 'authorized-server.cjs');
const report = { task: createRetry ? 'MCP-05' : 'MCP-03', fixture: home, productVersion: require('../../package.json').version, sdkVersion: '2.3.1', checks: {}, modelRequests: 0, globalConfigChanged: false, pluginInstalled: false, realPasskeyTested: false };
const bounded = (promise, ms, label) => {
  let timer; return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label)), ms); })]).finally(() => clearTimeout(timer));
};
let backend, codex, client, sequence = 0;
async function start() {
  const env = { ...process.env, NOTEBOOKAID_TEST_HOME: home, NOTEBOOKAID_EXTERNAL_ACCESS_TEST: '1' }; delete env.ELECTRON_RUN_AS_NODE;
  const child = spawn(require('electron'), ['.', '--self-test'], { cwd: workspace, env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  backend = child; child.stderr.on('data', () => {});
  child.stdin.on('error', () => {});
  return bounded(new Promise((resolve, reject) => {
    child.on('error', () => reject(Error('BACKGROUND_START_FAILED')));
    child.on('exit', () => reject(Error('BACKGROUND_EXITED')));
    readline.createInterface({ input: child.stdout }).on('line', line => {
      let message; try { message = JSON.parse(line); } catch { return; }
      // Never print or persist the private ready message, which carries one-time test credentials.
      if (message.type === 'external-test-ready') resolve(message);
    });
  }), 30000, 'BACKGROUND_START_TIMEOUT');
}
function owner(action, extra = {}) {
  const id = ++sequence;
  const commandFile = path.join(home, 'external-test-command.json'), temporary = commandFile + '.pending';
  fs.writeFileSync(temporary, JSON.stringify({ id, action, ...extra })); fs.renameSync(temporary, commandFile);
  return bounded(new Promise((resolve, reject) => {
    const deadline = setTimeout(() => { clearInterval(timer); reject(Error('OWNER_COMMAND_TIMEOUT')); }, 10000);
    const timer = setInterval(() => {
      try { const result = JSON.parse(fs.readFileSync(path.join(home, 'external-test-result.json'), 'utf8')); if (result.id !== id) return; clearInterval(timer); clearTimeout(deadline); if (result.ok) resolve(); else reject(Error('OWNER_COMMAND_FAILED')); }
      catch { /* The fixture has not published a complete result yet. */ }
    }, 25);
  }), 11000, 'OWNER_COMMAND_TIMEOUT');
}
async function stop() {
  if (!backend || backend.exitCode !== null) return;
  const child = backend, exited = once(child, 'exit'); fs.writeFileSync(path.join(home, 'external-test-command.json'), JSON.stringify({ action: 'stop' }));
  await bounded(exited, 10000, 'BACKGROUND_STOP_TIMEOUT'); backend = null;
}
function rpc(child) {
  let sequence = 0; const pending = new Map();
  readline.createInterface({ input: child.stdout }).on('line', line => {
    let message; try { message = JSON.parse(line); } catch { return; }
    const item = pending.get(message.id); if (!item) return; pending.delete(message.id);
    if (message.error) item.reject(new Error(`CODEX_${item.method}_${message.error.code}`)); else item.resolve(message.result);
  });
  child.on('exit', () => { for (const item of pending.values()) item.reject(Error('CODEX_EXITED')); pending.clear(); });
  return {
    request(method, params) { const id = ++sequence; const result = new Promise((resolve, reject) => pending.set(id, { resolve, reject })); child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'); return bounded(result, 60000, `TIMEOUT_${method}`); },
    notify(method) { child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params: {} }) + '\n'); }
  };
}
async function main() {
  let ready = await start(); assert.equal(ready.windowCount, 0); assert.equal(ready.credentials.length, 2);
  const [first, second] = ready.credentials, libraryId = first.client.libraryId;
  ready = null;
  report.checks.zeroBrowserWindows = true;
  const descriptor = JSON.parse(fs.readFileSync(path.join(home, 'external-runtime.json'), 'utf8'));
  assert.equal(descriptor.address, require('../../dist/runtime/desktop/bridge-endpoint.js').bridgeEndpoint(path.join(home, 'external-notes')).address);
  assert.equal(descriptor.pid, backend.pid);
  report.checks.runtimeDescriptorValidated = true;
  const params = overrides => ({ libraryId, requestId: randomUUID(), title: 'Synthetic authorization', body: 'Synthetic body', ...overrides });
  const expected = new Map();
  async function create(credential, input) { const result = await externalCreate(home, credential, input); if (!result.ok) throw Error('CREATE_' + result.code); expected.set(result.value.noteId, input.body); return result; }
  const large = params({ body: '\u0001'.repeat(2 * 1024 * 1024) });
  await create(first, large); report.checks.escapedTwoMiBExactCreate = true;
  const scoped = await create(second, params({ format: 'markdown', body: '# Synthetic folder\n\n中文 📝' }));
  assert.equal(scoped.value.folderId, second.client.folderId); report.checks.folderBinding = true;
  assert.equal((await externalCreate(home, { clientId: first.clientId, token: second.token }, params())).code, 'ACCESS_DENIED');
  assert.equal((await externalCreate(home, second, params({ folderId: null }))).code, 'ACCESS_DENIED');
  report.checks.crossClientAndFolderDenied = true;
  await owner('lock');
  assert.equal((await externalCreate(home, first, params())).code, 'APP_LOCKED');
  assert.equal((await externalCreate(home, { clientId: first.clientId, token: second.token }, params())).code, 'ACCESS_DENIED');
  await owner('unlock'); report.checks.lockOverlayFailsClosed = true;
  const authEnv = { NOTEBOOKAID_EXTERNAL_HOME: home, NOTEBOOKAID_EXTERNAL_LIBRARY_ID: libraryId, NOTEBOOKAID_EXTERNAL_CLIENT_ID: first.clientId, NOTEBOOKAID_EXTERNAL_TOKEN: first.token };
  const transport = new StdioClientTransport({ command: process.execPath, args: [entry], env: authEnv, stderr: 'pipe' });
  transport.stderr?.on('data', () => {}); client = new Client({ name: 'notebookaid-mcp03-validator', version: '0.1.0' });
  await bounded(client.connect(transport), 15000, 'SDK_CONNECT_TIMEOUT');
  assert.deepEqual((await client.listTools()).tools.map(tool => tool.name), ['notebookaid_create_note']);
  const sdkInput = { requestId: randomUUID(), title: 'Synthetic SDK note', body: 'SDK authorization fixture' };
  const sdkResult = await client.callTool({ name: 'notebookaid_create_note', arguments: sdkInput });
  const sdkReceipt = sdkResult.structuredContent ?? JSON.parse(sdkResult.content[0].text);
  assert.equal(sdkReceipt.ok, true); expected.set(sdkReceipt.value.noteId, sdkInput.body);
  if (createRetry) {
    const repeat = await Promise.all(Array.from({ length: 3 }, () => client.callTool({ name: 'notebookaid_create_note', arguments: { ...sdkInput, format: 'text', folderId: null } })));
    for (const value of repeat) assert.equal(value.structuredContent.value.noteId, sdkReceipt.value.noteId);
    report.checks.concurrentSdkRetryDeduplicated = true;
    const conflict = await client.callTool({ name: 'notebookaid_create_note', arguments: { ...sdkInput, body: 'Changed retry body' } });
    assert.equal(conflict.structuredContent.code, 'INVALID_INPUT'); report.checks.changedRequestRejected = true;
    for (const override of [{ format: 'html' }, { title: '   ' }, { body: '\u0000' }, { path: 'C:\\synthetic' }, { body: '中'.repeat(Math.floor(2 * 1024 * 1024 / 3) + 1) }]) {
      const invalid = await client.callTool({ name: 'notebookaid_create_note', arguments: { ...sdkInput, requestId: randomUUID(), ...override } });
      assert.equal(invalid.isError, true);
    }
    report.checks.sdkSchemaAndUtf8BoundaryRejected = true;
  }
  await client.close(); client = null; assert.equal(backend.exitCode, null); report.checks.sdkAuthorizedCreate = true;

  // Forward credential variable names, never their values in command-line configuration.
  const configuration = 'mcp_servers={notebookaid_authorized={command=' + JSON.stringify(process.execPath) + ',args=[' + JSON.stringify(entry) + '],env_vars=["NOTEBOOKAID_EXTERNAL_HOME","NOTEBOOKAID_EXTERNAL_LIBRARY_ID","NOTEBOOKAID_EXTERNAL_CLIENT_ID","NOTEBOOKAID_EXTERNAL_TOKEN"]}}';
  codex = spawn('codex', ['-c', configuration, '-c', 'analytics.enabled=false', 'app-server', '--stdio'], { cwd: workspace, env: { ...process.env, ...authEnv }, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  codex.on('error', () => {}); codex.stderr.on('data', () => {}); codex.stdin.on('error', () => {});
  const channel = rpc(codex);
  const initialized = await channel.request('initialize', { clientInfo: { name: 'notebookaid_mcp03_validator', version: '0.1.0' }, capabilities: { experimentalApi: true } });
  report.codexVersion = initialized.userAgent; channel.notify('initialized');
  const thread = await channel.request('thread/start', { cwd: home, ephemeral: true, sandbox: 'read-only', approvalPolicy: 'on-request' });
  const threadId = thread.thread.id;
  const status = await channel.request('mcpServerStatus/list', { threadId, serverName: 'notebookaid_authorized' });
  const inventory = status.data.find(item => item.name === 'notebookaid_authorized');
  assert(inventory && Object.values(inventory.tools).some(tool => tool.name === 'notebookaid_create_note'), 'CODEX_TOOL_MISSING');
  report.checks.codexAuthorizedToolDiscovery = true;
  const codexInput = { requestId: randomUUID(), title: 'Synthetic Codex authorized note', body: '# MCP-03\n\nAuthorized background creation.', format: 'markdown' };
  const codexResult = await channel.request('mcpServer/tool/call', { threadId, server: 'notebookaid_authorized', tool: 'notebookaid_create_note', arguments: codexInput });
  const receipt = codexResult.structuredContent ?? JSON.parse(codexResult.content[0].text);
  assert.equal(receipt.ok, true); expected.set(receipt.value.noteId, codexInput.body); report.checks.codexAuthorizedCreate = true;
  if (createRetry) {
    const retry = await channel.request('mcpServer/tool/call', { threadId, server: 'notebookaid_authorized', tool: 'notebookaid_create_note', arguments: codexInput });
    assert.equal(retry.structuredContent.value.noteId, receipt.value.noteId); report.checks.codexRetryDeduplicated = true;
  }
  const exited = once(codex, 'exit'); codex.stdin.end(); await bounded(exited, 15000, 'CODEX_STOP_TIMEOUT'); codex = null;
  assert.equal(backend.exitCode, null); report.checks.disconnectKeepsBackgroundAlive = true;

  await stop(); ready = await start(); assert.equal(ready.windowCount, 0); assert.equal(ready.credentials.length, 0);
  if (createRetry) {
    const replay = await externalCreate(home, first, { ...sdkInput, libraryId }); assert.equal(replay.ok, true); assert.equal(replay.value.noteId, sdkReceipt.value.noteId);
    report.checks.retryAfterBackendRestart = true;
  }
  await create(first, params()); report.checks.persistedGrantAfterRestart = true;
  await owner('revoke', { clientId: first.clientId });
  assert.equal((await externalCreate(home, first, params())).code, 'ACCESS_DENIED');
  await create(second, params()); report.checks.revokeDoesNotAffectOtherClient = true;
  await stop(); ready = await start(); assert.equal(ready.windowCount, 0);
  assert.equal((await externalCreate(home, first, params())).code, 'ACCESS_DENIED');
  await create(second, params()); report.checks.persistedRevocationAfterRestart = true;
  const grants = fs.readFileSync(path.join(home, 'external-clients.json'), 'utf8');
  const runtime = fs.readFileSync(path.join(home, 'external-runtime.json'), 'utf8');
  assert.equal([first.token, second.token].some(token => grants.includes(token) || runtime.includes(token)), false);
  report.checks.noBearerCredentialOnDisk = true;
  await stop();
  const { NoteLibrary } = require('../../dist/runtime/core/library.js');
  const library = new NoteLibrary(path.join(home, 'library'), undefined, 'existing');
  try { assert.equal(library.list().length, expected.size); for (const [noteId, body] of expected) assert.equal(library.read(noteId).body, body); }
  finally { library.close(); }
  report.checks.reopenedExactContent = true; report.noteCount = expected.size; report.ok = true;
}
main().catch(error => { report.ok = false; report.failure = /^[A-Z_]+$/.test(error.message) ? error.message : 'AUTHORIZATION_VALIDATION_FAILED'; process.exitCode = 1; }).finally(async () => {
  if (client) await client.close().catch(() => {});
  if (codex && codex.exitCode === null) { const exited = once(codex, 'exit'); codex.stdin.end(); await bounded(exited, 3000, 'cleanup').catch(() => codex.kill()); }
  if (backend && backend.exitCode === null) await stop().catch(() => backend?.kill());
  report.globalConfigChanged = originalConfig !== configHash();
  if (report.globalConfigChanged) { report.ok = false; report.failure = 'GLOBAL_CONFIG_CHANGED_DURING_VALIDATION'; process.exitCode = 1; }
  fs.writeFileSync(path.join(reportHome, 'report.json'), JSON.stringify(report, null, 2));
  if (report.ok) fs.writeFileSync(path.join(reportRoot, 'latest-success.json'), JSON.stringify(report, null, 2));
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
});
