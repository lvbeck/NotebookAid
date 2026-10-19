// Validation adapter only. Product setup and protected credential delivery belong to MCP-06.
const path = require('node:path');
const { McpServer } = require('@modelcontextprotocol/server');
const { StdioServerTransport } = require('@modelcontextprotocol/server/stdio');
const { z } = require('zod');
const { externalCreateWithUnlock } = require('../../dist/runtime/desktop/external-client.js');
const { maxExternalNoteBodyBytes, maxExternalNoteTitleLength } = require('../../dist/runtime/shared/external-notes.js');
const directory = process.env.NOTEBOOKAID_EXTERNAL_HOME;
const libraryId = process.env.NOTEBOOKAID_EXTERNAL_LIBRARY_ID;
const credential = { clientId: process.env.NOTEBOOKAID_EXTERNAL_CLIENT_ID, token: process.env.NOTEBOOKAID_EXTERNAL_TOKEN };
if (!directory || !path.isAbsolute(directory) || !libraryId || !credential.clientId || !credential.token) { process.stderr.write('EXTERNAL_CREDENTIAL_REQUIRED\n'); process.exit(1); }
const server = new McpServer({ name: 'notebookaid-authorization-validation', version: '0.1.0' });
server.registerTool('notebookaid_create_note', {
  description: 'Create one note in the explicitly authorized local NotebookAid folder. Defaults to TXT; Markdown is optional. Supply a fresh UUID requestId for each new note and reuse that UUID with unchanged title/body/format/folder for retries, including COMMIT_STATUS_UNKNOWN. Never generate a replacement UUID to retry. saved=true is successful even when indexed=false. An app lock may require one user-interactive Passkey authentication; cancellation does not create a note.',
  inputSchema: z.object({
    requestId: z.uuid(),
    title: z.string().min(1).max(maxExternalNoteTitleLength).refine(value => !!value.trim() && !/[\x00-\x1f\x7f\uD800-\uDFFF]/u.test(value), 'Invalid note title'),
    body: z.string().max(maxExternalNoteBodyBytes).refine(value => !/[\u0000\uD800-\uDFFF]/u.test(value) && Buffer.byteLength(value, 'utf8') <= maxExternalNoteBodyBytes, 'Invalid note body or UTF-8 byte limit exceeded'),
    format: z.enum(['text', 'markdown']).optional(), folderId: z.uuid().nullable().optional()
  }).strict(),
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }
}, async (input, extra) => {
  const result = await externalCreateWithUnlock(directory, credential, { ...input, libraryId }, extra.signal);
  return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result, ...(result.ok ? {} : { isError: true }) };
});
server.connect(new StdioServerTransport()).catch(() => { process.stderr.write('EXTERNAL_MCP_START_FAILED\n'); process.exitCode = 1; });
