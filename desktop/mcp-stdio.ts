import { app } from 'electron';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { McpProfiles } from '../core/mcp-profile';
import { mcpCipher } from './mcp-cipher';
import { assertProbeHome } from './mcp-probe';
export async function startMcpStdio(): Promise<void> {
  const id = process.argv[process.argv.indexOf('--mcp-profile') + 1];
  if (!process.argv.includes('--mcp-profile') || !id) throw Error('PROFILE_REQUIRED');
  const testIndex = process.argv.indexOf('--mcp-test-home');
  let directory = join(app.getPath('appData'), 'NotebookAid', 'state');
  if (testIndex !== -1) { if (app.isPackaged) throw Error('INVALID_TEST_HOME'); directory = process.argv[testIndex + 1]!; assertProbeHome(app.getAppPath(), directory); }
  app.setPath('userData', directory);
  app.setPath('sessionData', join(directory, 'session'));
  await app.whenReady();
  const profile = await new McpProfiles(directory, mcpCipher).read(id).catch(error => { throw Error(error instanceof Error && ['SECURE_STORAGE_UNAVAILABLE', 'PROFILE_DECRYPT_FAILED', 'INVALID_PROFILE', 'INVALID_INPUT'].includes(error.message) ? error.message : 'MCP_PROFILE_UNAVAILABLE'); });
  const executable = app.isPackaged ? join(process.resourcesPath, 'mcp', 'server.cjs') : join(app.getAppPath(), 'dist/mcp/server.cjs');
  const child = spawn(process.execPath, [executable], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, windowsHide: true, stdio: ['inherit', 'inherit', 'pipe', 'pipe'] });
  child.stderr?.resume();
  child.once('error', () => { process.stderr.write('MCP_RUNTIME_UNAVAILABLE\n'); app.exit(1); });
  child.once('exit', code => app.exit(code ?? 1));
  const channel = child.stdio[3] as import('node:stream').Writable;
  channel.on('error', () => { child.kill(); });
  channel.end(JSON.stringify({ directory, ...profile }));
}
