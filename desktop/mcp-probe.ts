import { randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { createServer } from 'node:net';
import type { NoteLibrary } from '../core/library';
import { LibraryError } from '../core/library';
import { bridgeEndpoint, prepareBridgeEndpoint } from './bridge-endpoint';
import { FrameDecoder, encodeFrame } from './framing';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export interface ProbeInput { requestId: string; title: string; body: string; format?: 'text' | 'markdown'; }

export function parseProbeInput(value: unknown): ProbeInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new LibraryError('INVALID_INPUT');
  const p = value as Record<string, unknown>;
  if (Object.keys(p).some(key => !['requestId', 'title', 'body', 'format'].includes(key)) ||
    typeof p.requestId !== 'string' || !uuid.test(p.requestId) || typeof p.title !== 'string' ||
    !p.title.trim() || p.title.length > 200 || /[\x00-\x1f]/.test(p.title) ||
    typeof p.body !== 'string' || Buffer.byteLength(p.body, 'utf8') > 24 * 1024 ||
    p.format !== undefined && p.format !== 'text' && p.format !== 'markdown') throw new LibraryError('INVALID_INPUT');
  return p as unknown as ProbeInput;
}

export function assertProbeHome(workspace: string, dataPath: string): void {
  for (const directory of [join(workspace, 'output'), join(workspace, 'output', 'mcp01')]) {
    if (lstatSync(directory).isSymbolicLink()) throw new Error('UNSAFE_PROBE_HOME');
  }
  const root = realpathSync(join(workspace, 'output', 'mcp01'));
  const target = realpathSync(dataPath), rel = relative(root, target);
  if (!rel || rel.startsWith('..') || resolve(target) !== resolve(dataPath)) throw new Error('UNSAFE_PROBE_HOME');
  let current = root;
  for (const part of rel.split(sep)) {
    current = join(current, part);
    if (lstatSync(current).isSymbolicLink()) throw new Error('UNSAFE_PROBE_HOME');
  }
  const marker = JSON.parse(readFileSync(join(target, 'mcp-probe-fixture.json'), 'utf8'));
  if (marker?.purpose !== 'NotebookAid MCP-01 synthetic data only') throw new Error('UNSAFE_PROBE_HOME');
  for (const name of ['mcp-probe-fixture.json', 'library', 'libraries.json']) {
    const candidate = join(target, name);
    if (existsSync(candidate) && lstatSync(candidate).isSymbolicLink()) throw new Error('UNSAFE_PROBE_HOME');
  }
  if (existsSync(join(target, 'library-location.json'))) throw new Error('UNSAFE_PROBE_HOME');
  if (existsSync(join(target, 'libraries.json'))) {
    const registry = JSON.parse(readFileSync(join(target, 'libraries.json'), 'utf8'));
    if (registry.entries?.length !== 1 || resolve(registry.entries[0].path) !== join(target, 'library')) throw new Error('UNSAFE_PROBE_HOME');
  }
}

export async function startMcpProbe(options: {
  workspace: string; dataPath: string;
  context(): { library: NoteLibrary; unlocked: boolean };
  windowCount(): number; stop(): void;
}): Promise<void> {
  const { workspace, dataPath, context, windowCount, stop } = options;
  assertProbeHome(workspace, dataPath);
  const library = context().library;
  if (library.path !== realpathSync(join(dataPath, 'library'))) throw new Error('UNSAFE_PROBE_LIBRARY');
  const endpoint = bridgeEndpoint(join(dataPath, 'mcp-probe'));
  prepareBridgeEndpoint(endpoint);
  const token = randomBytes(32).toString('hex');
  const file = join(dataPath, 'mcp-probe-runtime.json');
  const operations: { noteId: string; version: number; saved: boolean; indexed: boolean }[] = [];
  const server = createServer(socket => {
    socket.setTimeout(10000, () => socket.destroy());
    socket.on('error', () => socket.destroy());
    const decoder = new FrameDecoder(); let handled = false;
    socket.on('data', chunk => {
      try {
        for (const raw of decoder.push(chunk)) {
          if (handled) throw new Error('INVALID_INPUT');
          handled = true;
          const request = raw as Record<string, unknown>;
          if (!request || typeof request !== 'object' || Array.isArray(request)) throw new Error('INVALID_INPUT');
          const actual = typeof request.token === 'string' ? Buffer.from(request.token) : Buffer.alloc(0);
          const expected = Buffer.from(token);
          if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('UNAUTHORIZED');
          if (request.method !== 'create' || request.protocolVersion !== 1) throw new Error('INVALID_INPUT');
          const state = context();
          if (!state.unlocked) throw new Error('APP_LOCKED');
          if (state.library !== library || request.libraryId !== library.libraryId) throw new Error('LIBRARY_CHANGED');
          const input = parseProbeInput(request.params);
          const result = library.create(input.requestId, { title: input.title, body: input.body, primaryFormat: input.format ?? 'text' });
          const receipt = { noteId: result.note.id, version: result.note.version, saved: result.saved, indexed: result.indexed };
          operations.push(receipt);
          try { writeFileSync(join(dataPath, 'mcp-probe-evidence.json'), JSON.stringify({ pid: process.pid, windowCount: windowCount(), operations })); }
          catch { console.error('MCP_PROBE_EVIDENCE_UNAVAILABLE'); }
          socket.end(encodeFrame({ ok: true, ...receipt, libraryId: library.libraryId }));
        }
      } catch (error) {
        const code = error instanceof Error && ['INVALID_INPUT', 'UNAUTHORIZED', 'APP_LOCKED', 'LIBRARY_CHANGED'].includes(error.message) ? error.message : error instanceof LibraryError ? error.code : 'WRITE_FAILED';
        socket.end(encodeFrame({ ok: false, code }));
      }
    });
  });
  await new Promise<void>((ready, reject) => { server.once('error', reject); server.listen(endpoint.address, ready); });
  writeFileSync(file, JSON.stringify({ pid: process.pid, address: endpoint.address, token, libraryId: library.libraryId }), { mode: 0o600 });
  const timer = setInterval(() => {
    if (!existsSync(join(dataPath, 'mcp-probe-stop'))) return;
    clearInterval(timer); server.close(); unlinkSync(file); stop();
  }, 200);
}
