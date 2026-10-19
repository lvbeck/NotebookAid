const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { McpServer } = require('@modelcontextprotocol/server');
const { StdioServerTransport } = require('@modelcontextprotocol/server/stdio');
const { z } = require('zod');
const workspace = path.resolve(__dirname, '../..');
const { assertProbeHome } = require(path.join(workspace, 'dist/runtime/desktop/mcp-probe.js'));
const { FrameDecoder, encodeFrame } = require(path.join(workspace, 'dist/runtime/desktop/framing.js'));
const dataPath = process.env.NOTEBOOKAID_MCP_PROBE_HOME;
try { assertProbeHome(workspace, dataPath); } catch { process.stderr.write('MCP_PROBE_HOME_REQUIRED\n'); process.exit(1); }

function createNote(input) {
  return new Promise(resolve => {
    let runtime;
    try { runtime = JSON.parse(fs.readFileSync(path.join(dataPath, 'mcp-probe-runtime.json'), 'utf8')); }
    catch { resolve({ ok: false, code: 'BACKGROUND_UNAVAILABLE' }); return; }
    const expected = require(path.join(workspace, 'dist/runtime/desktop/bridge-endpoint.js')).bridgeEndpoint(path.join(dataPath, 'mcp-probe')).address;
    if (runtime.address !== expected) { resolve({ ok: false, code: 'INVALID_ENDPOINT' }); return; }
    const socket = net.createConnection(runtime.address), decoder = new FrameDecoder();
    let settled = false;
    const finish = result => { if (settled) return; settled = true; socket.destroy(); resolve(result); };
    socket.setTimeout(10000, () => finish({ ok: false, code: 'BACKGROUND_TIMEOUT' }));
    socket.on('error', () => finish({ ok: false, code: 'BACKGROUND_UNAVAILABLE' }));
    socket.on('end', () => finish({ ok: false, code: 'RESPONSE_LOST' }));
    socket.on('connect', () => {
      try { socket.write(encodeFrame({ method: 'create', protocolVersion: 1, token: runtime.token, libraryId: runtime.libraryId, params: input })); }
      catch { finish({ ok: false, code: 'INVALID_INPUT' }); }
    });
    socket.on('data', chunk => { try { for (const value of decoder.push(chunk)) finish(value); } catch { finish({ ok: false, code: 'INVALID_RESPONSE' }); } });
  });
}

const server = new McpServer({ name: 'notebookaid-mcp-probe', version: '0.1.0' });
server.registerTool('notebookaid_create_note', {
  description: 'Create one synthetic note in the isolated NotebookAid MCP-01 test notebook. Production notebooks are not supported.',
  inputSchema: z.object({ requestId: z.uuid(), title: z.string().min(1).max(200), body: z.string().max(24 * 1024), format: z.enum(['text', 'markdown']).optional() }).strict(),
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
}, async input => {
  const result = await createNote(input);
  return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result, ...(result.ok ? {} : { isError: true }) };
});
server.connect(new StdioServerTransport()).catch(() => { process.stderr.write('MCP_PROBE_START_FAILED\n'); process.exitCode = 1; });
