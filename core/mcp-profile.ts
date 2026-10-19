import { existsSync, lstatSync, mkdirSync, openSync, closeSync, fsyncSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { plainPath } from './library-import';
import type { IssuedExternalClient } from '../shared/external-access';
export interface McpCipher { available(): Promise<boolean>; encrypt(value: string): Promise<Buffer>; decrypt(value: Buffer): Promise<string>; }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class McpProfiles {
  constructor(private readonly directory: string, private readonly cipher: McpCipher) {}
  private file(id: string): string { if (!uuid.test(id)) throw Error('INVALID_INPUT'); const file = join(this.directory, 'mcp-profiles', id + '.bin'); plainPath(file); return file; }
  async write(value: IssuedExternalClient): Promise<void> {
    if (!await this.cipher.available()) throw Error('SECURE_STORAGE_UNAVAILABLE');
    const file = this.file(value.clientId), bytes = await this.cipher.encrypt(JSON.stringify({ version: 1, clientId: value.clientId, token: value.token, libraryId: value.client.libraryId }));
    plainPath(file); mkdirSync(join(this.directory, 'mcp-profiles'), { recursive: true, mode: 0o700 });
    try {
      const fd = openSync(file, 'wx', 0o600);
      try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
    } finally { bytes.fill(0); }
  }
  async read(id: string): Promise<{ clientId: string; token: string; libraryId: string }> {
    if (!await this.cipher.available()) throw Error('SECURE_STORAGE_UNAVAILABLE');
    const file = this.file(id), stat = lstatSync(file); if (!stat.isFile() || stat.size > 16384) throw Error('INVALID_PROFILE');
    const bytes = readFileSync(file); let value;
    try { let text: string; try { text = await this.cipher.decrypt(bytes); } catch { throw Error('PROFILE_DECRYPT_FAILED'); } value = JSON.parse(text); } finally { bytes.fill(0); }
    if (value?.version !== 1 || value.clientId !== id || typeof value.token !== 'string' || !/^[\w-]{43}$/.test(value.token) || typeof value.libraryId !== 'string' || !uuid.test(value.libraryId) || Object.keys(value).some(key => !['version', 'clientId', 'token', 'libraryId'].includes(key))) throw Error('INVALID_PROFILE');
    return { clientId: id, token: value.token, libraryId: value.libraryId };
  }
  remove(id: string): void { const file = this.file(id); if (existsSync(file)) unlinkSync(file); }
}
