// Validation adapter only. Product setup and protected credential delivery belong to MCP-06.
const path = require('node:path');
const { McpServer } = require('@modelcontextprotocol/server');
const { StdioServerTransport } = require('@modelcontextprotocol/server/stdio');
const { z } = require('zod');
const { externalCreateWithUnlock } = require('../../dist/runtime/desktop/external-client.js');
const directory = process.env.NOTEBOOKAID_EXTERNAL_HOME;
const libraryId = process.env.NOTEBOOKAID_EXTERNAL_LIBRARY_ID;
const credential = { clientId: process.env.NOTEBOOKAID_EXTERNAL_CLIENT_ID, token: process.env.NOTEBOOKAID_EXTERNAL_TOKEN };
if (!directory || !path.isAbsolute(directory) || !libraryId || !credential.clientId || !credential.token) { process.stderr.write('EXTERNAL_CREDENTIAL_REQUIRED\n'); process.exit(1); }
const server = new McpServer({ name: 'notebookaid-authorization-validation', version: '0.1.0' });
server.registerTool('notebookaid_create_note', {
  description: 'Create a TXT or Markdown note in the explicitly authorized local NotebookAid folder. Reuse requestId for retries.',
  inputSchema: z.object({ requestId: z.uuid(), title: z.string().min(1).max(300), body: z.string().max(2 * 1024 * 1024), format: z.enum(['text', 'markdown']).optional(), folderId: z.uuid().nullable().optional() }).strict(),
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
}, async (input, extra) => {
  const result = await externalCreateWithUnlock(directory, credential, { ...input, libraryId }, extra.signal);
  return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result, ...(result.ok ? {} : { isError: true }) };
});
server.connect(new StdioServerTransport()).catch(() => { process.stderr.write('EXTERNAL_MCP_START_FAILED\n'); process.exitCode = 1; });
