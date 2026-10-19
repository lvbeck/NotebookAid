const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const { randomUUID } = require('node:crypto');
const { McpProfiles } = require('../dist/runtime/core/mcp-profile.js');
const { writeMcpPlugin } = require('../dist/runtime/core/mcp-plugin.js');
const { NoteLibrary } = require('../dist/runtime/core/library.js');
const { externalAccessHost } = require('../dist/runtime/desktop/external-access.js');
function directory() { const root = path.resolve('output/mcp-plugin-tests'); fs.mkdirSync(root, { recursive: true }); return fs.mkdtempSync(path.join(root, 'case-')); }
// Deliberately simulated provider; Windows DPAPI is verified by the Electron integration.
const cipher = { available: async () => true, encrypt: async value => Buffer.from('fixture:' + Buffer.from(value).toString('base64')), decrypt: async bytes => Buffer.from(bytes.toString().slice(8), 'base64').toString() };
const issued = () => { const clientId = randomUUID(); return { clientId, token: 'a'.repeat(43), client: { clientId, libraryId: randomUUID(), folderId: null, name: 'Synthetic', createdAt: new Date().toISOString() } }; };
test('profile refuses unavailable encryption, persists through its provider and rejects corruption/overwrite', async () => {
  const root = directory(), value = issued(), profiles = new McpProfiles(root, cipher);
  await assert.rejects(new McpProfiles(root, { ...cipher, available: async () => false }).write(value), { message: 'SECURE_STORAGE_UNAVAILABLE' });
  assert.equal(fs.existsSync(path.join(root, 'mcp-profiles')), false);
  await profiles.write(value); const file = path.join(root, 'mcp-profiles', value.clientId + '.bin'); assert.equal(fs.readFileSync(file).includes(value.token), false);
  assert.equal((await new McpProfiles(root, cipher).read(value.clientId)).token === value.token, true);
  await assert.rejects(profiles.write(value));
  fs.writeFileSync(file, 'corrupt'); await assert.rejects(profiles.read(value.clientId));
  profiles.remove(value.clientId); assert.equal(fs.existsSync(file), false);
  await assert.rejects(profiles.read('../escape'));
});
test('plugin manifests are secret-free, unique per client and cannot overwrite an existing export', () => {
  const root = directory(), id = randomUUID(), plugin = writeMcpPlugin(root, id, process.execPath, ['--synthetic'], fs.readFileSync('LICENSE', 'utf8'));
  const portable = JSON.parse(fs.readFileSync(path.join(plugin, 'plugins/notebookaid/.mcp.json'), 'utf8'));
  const server = portable.mcpServers.notebookaid; assert.equal(server.tool_timeout_sec, 180); assert.equal(server.env, undefined);
  assert.deepEqual(server.args.slice(-3), ['--mcp-stdio', '--mcp-profile', id]);
  assert.equal(JSON.stringify(portable).includes('token'), false);
  const market = JSON.parse(fs.readFileSync(path.join(plugin, '.agents/plugins/marketplace.json'), 'utf8')); assert.equal(market.name, 'notebookaid-local-' + id);
  assert.throws(() => writeMcpPlugin(root, id, process.execPath, [], fs.readFileSync('LICENSE', 'utf8')));
});
test('setup authenticates the owner, requires confirmation, exports no secret and rolls back failed provisioning', async () => {
  const root = directory(), library = new NoteLibrary(path.join(root, 'library'), undefined, 'create'), state = { library, appUnlocked: true, busy: false };
  const host = await externalAccessHost(root, () => state); let handler, allowed = true, confirm = false, encryptionFails = false, lockDuringEncryption = false;
  const filename = path.resolve('dist/runtime/desktop/mcp-setup.js'), loaded = new Module(filename, module); loaded.filename = filename; loaded.paths = Module._nodeModulePaths(path.dirname(filename)); const original = loaded.require.bind(loaded);
  loaded.require = name => name === 'electron' ? { app: { isPackaged: false, getAppPath: () => process.cwd() }, ipcMain: { handle: (_, callback) => { handler = callback; } }, shell: { openPath: async () => '' } } : name === './mcp-cipher' ? { mcpCipher: { ...cipher, encrypt: async value => { if (encryptionFails) throw Error(); if(lockDuringEncryption)state.appUnlocked=false; return cipher.encrypt(value); } } } : original(name);
  loaded._compile(fs.readFileSync(filename, 'utf8'), filename);
  loaded.exports.registerMcpSetup(root, host, () => { if (!allowed || !state.appUnlocked) throw Error('APP_LOCKED'); }, () => state, async () => confirm, () => 'en');
  const input = { action: 'create', name: 'Synthetic Codex', libraryId: library.libraryId, folderId: null };
  try {
    allowed = false; assert.equal((await handler({}, input)).code, 'APP_LOCKED'); allowed = true;
    assert.equal((await handler({}, { ...input, token: 'forged' })).code, 'INVALID_INPUT');
    assert.equal((await handler({}, input)).code, 'CANCELLED'); assert.equal(host.list().length, 0);
    confirm = true; encryptionFails = true; assert.equal((await handler({}, input)).code, 'WRITE_FAILED'); assert.equal(host.list().length, 0);
    encryptionFails = false; lockDuringEncryption = true; assert.equal((await handler({}, input)).code, 'WRITE_FAILED'); state.appUnlocked = true; assert.equal(host.list().length, 0); lockDuringEncryption = false; const result = await handler({}, input); assert.equal(result.ok, true); assert.equal(result.value.clients.length, 1); assert.equal(JSON.stringify(result).includes('token'), false);
    const id = result.createdId; assert.equal((await handler({}, { action: 'revoke', clientId: id })).ok, true); assert.equal(host.list().length, 0); assert.equal(fs.existsSync(path.join(root, 'mcp-profiles', id + '.bin')), false);
  } finally { host.close(); library.close(); }
});
