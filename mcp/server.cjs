const fs = require('node:fs');
const path = require('node:path');
const { McpServer } = require('@modelcontextprotocol/server');
const { StdioServerTransport } = require('@modelcontextprotocol/server/stdio');
const { registerCreateTool } = require('./tool.cjs');
async function start() {
  const chunks = []; let length = 0;
  const channel = fs.createReadStream(null, { fd: 3, autoClose: true });
  for await (const chunk of channel) { length += chunk.length; if (length > 8192) throw Error(); chunks.push(chunk); }
  const bytes = Buffer.concat(chunks); let profile;
  try { profile = JSON.parse(bytes.toString('utf8')); } finally { bytes.fill(0); for (const chunk of chunks) chunk.fill(0); }
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!profile || typeof profile.directory !== 'string' || !path.isAbsolute(profile.directory) || !uuid.test(profile.libraryId) || !uuid.test(profile.clientId) || !/^[\w-]{43}$/.test(profile.token)) throw Error();
  const server = new McpServer({ name: 'notebookaid', version: '0.1.0' });
  registerCreateTool(server, profile);
  process.stdin.once('end', () => { void server.close().finally(() => process.exit(0)); });
  await server.connect(new StdioServerTransport());
}
start().catch(() => { process.stderr.write('MCP_RUNTIME_UNAVAILABLE\n'); process.exitCode = 1; });
