import { createHash } from 'node:crypto';
import { chmodSync, existsSync, lstatSync, mkdirSync, unlinkSync } from 'node:fs';
import { posix } from 'node:path';

export function bridgeEndpoint(dataPath: string, platform = process.platform, uid = process.getuid?.() ?? 0) {
  const name = 'NotebookAid-' + createHash('sha256').update(platform === 'win32' ? dataPath.toLowerCase() : dataPath).digest('hex').slice(0, 24);
  if (platform === 'win32') return { name, address: '\\\\.\\pipe\\' + name, directory: null };
  const directory = posix.join('/tmp', `NotebookAid-${uid}-${name.slice(12)}`);
  return { name, directory, address: posix.join(directory, 'bridge.sock') };
}

export function prepareBridgeEndpoint(endpoint: ReturnType<typeof bridgeEndpoint>): void {
  if (!endpoint.directory) return;
  if (!existsSync(endpoint.directory)) mkdirSync(endpoint.directory, { mode: 0o700 });
  const directory = lstatSync(endpoint.directory);
  if (!directory.isDirectory() || directory.isSymbolicLink() || directory.uid !== process.getuid?.() || (directory.mode & 0o077) !== 0) throw Error('UNSAFE_BRIDGE_DIRECTORY');
  chmodSync(endpoint.directory, 0o700);
  try {
    const socket = lstatSync(endpoint.address);
    if (!socket.isSocket() || socket.uid !== directory.uid) throw Error('UNSAFE_BRIDGE_SOCKET');
    unlinkSync(endpoint.address);
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
}
