const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { spawn } = require('node:child_process');
const { randomUUID, createHash } = require('node:crypto');
const { once } = require('node:events');
const readline = require('node:readline');
const { externalCreateWithUnlock, externalCreate } = require('../../dist/runtime/desktop/external-client.js');
const workspace = path.resolve(__dirname, '../..');
const config = path.join(process.env.CODEX_HOME || path.join(require('node:os').homedir(), '.codex'), 'config.toml');
const configHash = () => fs.existsSync(config) ? createHash('sha256').update(fs.readFileSync(config)).digest('hex') : null;
const original = configHash();
const root = path.join(workspace, 'output/mcp01'); fs.mkdirSync(root, { recursive: true });
const home = fs.mkdtempSync(path.join(root, 'background-'));
fs.writeFileSync(path.join(home, 'mcp-probe-fixture.json'), JSON.stringify({ purpose: 'NotebookAid MCP-01 synthetic data only' }));
const reportRoot = path.join(workspace, 'output/mcp04'); fs.mkdirSync(reportRoot, { recursive: true });
const evidence = fs.mkdtempSync(path.join(reportRoot, 'background-'));
const report = { task: 'MCP-04', fixture: home, checks: {}, modelRequests: 0, pluginInstalled: false, physicalPasskeyTested: false, nativeDialogTested: false, virtualSignedAssertions: true };
const bounded = (promise, ms, name) => { let timer; return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(Error(name)), ms); })]).finally(() => clearTimeout(timer)); };
const env = { ...process.env, NOTEBOOKAID_TEST_HOME: home, NOTEBOOKAID_EXTERNAL_BACKGROUND_TEST: '1' }; delete env.ELECTRON_RUN_AS_NODE;
const app = spawn(require('electron'), ['.', '--self-test'], { cwd: workspace, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
app.stderr.on('data', () => {}); let codex, sequence = 0;
const ready = new Promise((resolve, reject) => {
  app.on('error', () => reject(Error('BACKGROUND_START_FAILED'))); app.on('exit', () => reject(Error('BACKGROUND_EARLY_EXIT')));
  readline.createInterface({ input: app.stdout }).on('line', line => { let value; try { value = JSON.parse(line); } catch { return; } if (value.type === 'external-background-ready') resolve(value); });
});
async function owner(action, extra = {}) {
  const id = ++sequence, file = path.join(home, 'external-test-command.json');
  fs.writeFileSync(file + '.pending', JSON.stringify({ id, action, ...extra })); fs.renameSync(file + '.pending', file);
  for (let i = 0; i < 200; i++) {
    await new Promise(resolve => setTimeout(resolve, 25));
    try { const result = JSON.parse(fs.readFileSync(path.join(home, 'external-test-result.json'), 'utf8')); if (result.id === id) { assert.equal(result.ok, true); return result; } } catch (error) { if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error; }
  }
  throw Error('OWNER_TIMEOUT');
}
async function stop() { if (app.exitCode !== null) return; const exited = once(app, 'exit'); fs.writeFileSync(path.join(home, 'external-test-command.json'), JSON.stringify({ action: 'stop' })); await bounded(exited, 10000, 'BACKGROUND_STOP_TIMEOUT'); }
function rpc(child) {
  const pending = new Map(); let id = 0;
  readline.createInterface({ input: child.stdout }).on('line', line => {
    let message; try { message = JSON.parse(line); } catch { return; } const item = pending.get(message.id); if (!item) return; pending.delete(message.id);
    if (message.error) item.reject(Error('CODEX_RPC_FAILED')); else item.resolve(message.result);
  });
  child.on('exit', () => { for (const item of pending.values()) item.reject(Error('CODEX_EXITED')); pending.clear(); });
  return { request(method, params) { const requestId = ++id, result = new Promise((resolve, reject) => pending.set(requestId, { resolve, reject })); child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: requestId, method, params }) + '\n'); return bounded(result, 60000, 'CODEX_TIMEOUT'); }, notify(method) { child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method, params: {} }) + '\n'); } };
}
async function main() {
  const state = await bounded(ready, 30000, 'BACKGROUND_START_TIMEOUT'), [first, second] = state.credentials, libraryId = first.client.libraryId;
  assert.equal(state.windowCount, 0); report.checks.noEditorWindow = true;
  const params = overrides => ({ libraryId, requestId: randomUUID(), title: 'Synthetic background', body: '中文 signed background 📝', ...overrides });
  assert.equal((await externalCreateWithUnlock(home, { clientId: first.clientId, token: second.token }, params())).code, 'ACCESS_DENIED');
  assert.equal((await owner('status')).prompts, 0); report.checks.unauthorizedNeverPrompts = true;
  await owner('mode', { mode: 'success', delay: 16000 }); const input = params(), started = Date.now();
  const [a, b] = await Promise.all([externalCreateWithUnlock(home, first, input), externalCreateWithUnlock(home, first, input)]);
  assert.equal(a.ok, true); assert.equal(b.ok, true); assert.equal(a.value.noteId, b.value.noteId); assert(Date.now() - started >= 15000);
  let status = await owner('status'); assert.equal(status.prompts, 1); assert.equal(status.windowCount, 0);
  report.checks.authenticationExceedsCreateTimeout = true; report.checks.concurrentSingleAuthentication = true; report.checks.sameRequestCreatesOnce = true;
  await owner('lock'); await owner('mode', { mode: 'cancel', delay: 10 }); const cancelled = params();
  assert.equal((await externalCreateWithUnlock(home, first, cancelled)).code, 'PASSKEY_CANCELLED');
  const count = (await owner('status')).prompts;
  assert.equal((await externalCreateWithUnlock(home, first, cancelled)).code, 'PASSKEY_CANCELLED');
  status = await owner('status'); assert.equal(status.prompts, count); assert.equal(status.unlocked, false); report.checks.cancellationDoesNotReprompt = true;
  await owner('mode', { mode: 'timeout', delay: 10 }); assert.equal((await externalCreateWithUnlock(home, first, params())).code, 'PASSKEY_TIMEOUT');
  assert.equal((await owner('status')).unlocked, false); report.checks.timeoutStaysLocked = true;
  await owner('busy', { busy: true }); assert.equal((await externalCreateWithUnlock(home, first, params())).code, 'LIBRARY_IN_USE'); await owner('busy', { busy: false });
  report.checks.busyBackgroundRejected = true;
  await owner('mode', { mode: 'success', delay: 100 });
  const entry = path.join(__dirname, 'authorized-server.cjs');
  const authEnv = { NOTEBOOKAID_EXTERNAL_HOME: home, NOTEBOOKAID_EXTERNAL_LIBRARY_ID: libraryId, NOTEBOOKAID_EXTERNAL_CLIENT_ID: second.clientId, NOTEBOOKAID_EXTERNAL_TOKEN: second.token };
  const configuration = 'mcp_servers={notebookaid_background={command=' + JSON.stringify(process.execPath) + ',args=[' + JSON.stringify(entry) + '],tool_timeout_sec=180,env_vars=["NOTEBOOKAID_EXTERNAL_HOME","NOTEBOOKAID_EXTERNAL_LIBRARY_ID","NOTEBOOKAID_EXTERNAL_CLIENT_ID","NOTEBOOKAID_EXTERNAL_TOKEN"]}}';
  codex = spawn('codex', ['-c', configuration, '-c', 'analytics.enabled=false', 'app-server', '--stdio'], { cwd: workspace, env: { ...process.env, ...authEnv }, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  codex.stderr.on('data', () => {}); codex.on('error', () => {}); codex.stdin.on('error', () => {});
  const channel = rpc(codex), initialized = await channel.request('initialize', { clientInfo: { name: 'notebookaid_mcp04_validator', version: '0.1.0' }, capabilities: { experimentalApi: true } });
  report.codexVersion = initialized.userAgent; channel.notify('initialized');
  const thread = await channel.request('thread/start', { cwd: home, ephemeral: true, sandbox: 'read-only', approvalPolicy: 'on-request' });
  const inventory = await channel.request('mcpServerStatus/list', { threadId: thread.thread.id, serverName: 'notebookaid_background' });
  assert(inventory.data.some(item => item.name === 'notebookaid_background')); report.checks.codexToolDiscovery = true;
  const codexInput = { requestId: randomUUID(), title: 'Synthetic Codex unlock', body: '# MCP-04\n\nSigned background creation.', format: 'markdown' };
  const reply = await channel.request('mcpServer/tool/call', { threadId: thread.thread.id, server: 'notebookaid_background', tool: 'notebookaid_create_note', arguments: codexInput });
  const receipt = reply.structuredContent ?? JSON.parse(reply.content[0].text); assert.equal(receipt.ok, true);
  report.checks.codexUnlockAndCreate = true;
  const exited = once(codex, 'exit'); codex.stdin.end(); await bounded(exited, 10000, 'CODEX_STOP_TIMEOUT'); codex = null;
  assert.equal(app.exitCode, null); status = await owner('status'); assert.equal(status.windowCount, 0); report.checks.disconnectKeepsBackendAlive = true;
  const disk = fs.readFileSync(path.join(home, 'external-clients.json'), 'utf8') + fs.readFileSync(path.join(home, 'external-runtime.json'), 'utf8');
  assert.equal([first.token, second.token].some(token => disk.includes(token)), false); report.checks.noBearerTokenOnDisk = true;
  await stop();
  assert.equal((await externalCreateWithUnlock(home, second, params())).code, 'BACKGROUND_UNAVAILABLE'); report.checks.offlineDoesNotStartApplication = true;
  const { NoteLibrary } = require('../../dist/runtime/core/library.js'), library = new NoteLibrary(path.join(home, 'library'), undefined, 'existing');
  try { assert.equal(library.list().length, 2); assert.equal(library.read(a.value.noteId).body, input.body); assert.equal(library.read(receipt.value.noteId).body, codexInput.body); } finally { library.close(); }
  report.checks.onlySuccessfulRequestsSaved = true; report.ok = true;
}
main().catch(() => { report.ok = false; report.failure = 'BACKGROUND_VALIDATION_FAILED'; process.exitCode = 1; }).finally(async () => {
  if (codex && codex.exitCode === null) { const exited = once(codex, 'exit'); codex.stdin.end(); await bounded(exited, 3000, 'cleanup').catch(() => codex.kill()); }
  await stop().catch(() => app.kill());
  report.globalConfigChanged = original !== configHash(); if (report.globalConfigChanged) { report.ok = false; process.exitCode = 1; }
  fs.writeFileSync(path.join(evidence, 'report.json'), JSON.stringify(report, null, 2));
  if (report.ok) fs.writeFileSync(path.join(reportRoot, 'latest-success.json'), JSON.stringify(report, null, 2));
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
});
