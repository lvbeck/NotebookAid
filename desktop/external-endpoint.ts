import { chmodSync, closeSync, existsSync, fsyncSync, lstatSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { createServer, type Socket } from 'node:net';
import { bridgeEndpoint, prepareBridgeEndpoint } from './bridge-endpoint';
import { encodeExternalFrame, ExternalFrameDecoder } from './external-framing';
import { plainPath } from '../core/library-import';
import { renameWithRetry } from '../core/file-rename';
import { externalAuthenticationTimeoutMs, type ExternalAccessResult } from '../shared/external-access';
import type { ExternalRequestLifetime } from '../core/external-background';

export async function startExternalEndpoint(directory: string, request: (value: unknown, lifetime: ExternalRequestLifetime) => ExternalAccessResult | Promise<ExternalAccessResult>) {
  const endpoint = bridgeEndpoint(join(directory, 'external-notes'));
  const file = join(directory, 'external-runtime.json');
  const instance = randomUUID(), temporary = join(directory, '.pending-external-runtime-' + instance);
  let descriptorWritten = false;
  plainPath(file);
  if (endpoint.directory && existsSync(endpoint.address)) throw Error('EXTERNAL_ENDPOINT_IN_USE');
  prepareBridgeEndpoint(endpoint);
  const sockets = new Set<Socket>();
  const server = createServer(socket => {
    if (sockets.size >= 4) { socket.destroy(); return; }
    sockets.add(socket); let handled = false;
    const controller = new AbortController();
    let timer = setTimeout(() => socket.destroy(), 15000);
    socket.on('close', () => { clearTimeout(timer); controller.abort(); sockets.delete(socket); });
    socket.on('error', () => socket.destroy());
    const decoder = new ExternalFrameDecoder();
    socket.on('data', chunk => {
      if (handled) return;
      try {
        const value = decoder.push(chunk);
        if (value === undefined) return;
        handled = true;
        void Promise.resolve(request(value, { signal: controller.signal, authenticationWaiting: () => { clearTimeout(timer); timer = setTimeout(() => { controller.abort(); socket.destroy(); }, externalAuthenticationTimeoutMs); } }))
          .then(result => { if (!controller.signal.aborted) socket.end(encodeExternalFrame(result)); })
          .catch(() => { if (!controller.signal.aborted) socket.end(encodeExternalFrame({ ok: false, code: 'ACCESS_DENIED' })); });
      } catch {
        handled = true; socket.end(encodeExternalFrame({ ok: false, code: 'ACCESS_DENIED' }));
      }
    });
  });
  const close = () => {
    for (const socket of sockets) socket.destroy(); server.close();
    try {
      plainPath(file);
      if (descriptorWritten && existsSync(file) && lstatSync(file).isFile() && lstatSync(file).size < 4096 && JSON.parse(readFileSync(file, 'utf8')).instance === instance) unlinkSync(file);
    } catch { /* A stale descriptor contains no credential and is rejected by the client. */ }
  };
  try {
    await new Promise<void>((ready, reject) => { server.once('error', reject); server.listen(endpoint.address, ready); });
    if (endpoint.directory) chmodSync(endpoint.address, 0o600);
    const fd = openSync(temporary, 'wx', 0o600);
    try { writeFileSync(fd, JSON.stringify({ protocolVersion: 1, address: endpoint.address, pid: process.pid, instance })); fsyncSync(fd); } finally { closeSync(fd); }
    renameWithRetry(temporary, file); descriptorWritten = true;
    return { address: endpoint.address, close };
  } catch { close(); throw Error('EXTERNAL_ENDPOINT_UNAVAILABLE'); }
  finally { try { if (existsSync(temporary)) unlinkSync(temporary); } catch { /* No credential is present in this descriptor. */ } }
}
