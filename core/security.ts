import { createCipheriv, createDecipheriv, randomBytes, randomUUID, scrypt } from 'node:crypto';
import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { LibraryError } from './library';

const magic = Buffer.from('NASEC001');
const overhead = magic.length + 12 + 16;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Keyring = { version: 1; algorithm: 'aes-256-gcm'; kdf: 'scrypt'; N: 131072; r: 8; p: 1; salt: string; password: string; recovery: string };

function seal(bytes: Buffer, key: Buffer, context: string): Buffer {
  const nonce = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, nonce, { authTagLength: 16 });
  cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return Buffer.concat([magic, nonce, cipher.getAuthTag(), encrypted]);
}
function unseal(bytes: Buffer, key: Buffer, context: string): Buffer {
  if (bytes.length < overhead || !bytes.subarray(0, magic.length).equals(magic)) throw new LibraryError('INTEGRITY_CHECK_FAILED');
  const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(8, 20), { authTagLength: 16 });
  decipher.setAAD(Buffer.from(context)); decipher.setAuthTag(bytes.subarray(20, 36));
  let partial: Buffer | undefined;
  try { partial = decipher.update(bytes.subarray(overhead)); return Buffer.concat([partial, decipher.final()]); }
  catch { throw new LibraryError('INTEGRITY_CHECK_FAILED'); }
  finally { partial?.fill(0); }
}
async function derive(password: string, salt: Buffer): Promise<Buffer> {
  if (typeof password !== 'string' || password.length < 10 || Buffer.byteLength(password) > 1024) throw new LibraryError('PASSWORD_POLICY');
  return new Promise((resolveKey, reject) => scrypt(password, salt, 32, { N: 131072, r: 8, p: 1, maxmem: 192 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolveKey(key)));
}

/** Keys remain in the core. Every payload is authenticated against its notebook and logical path. */
export class NotebookSecurity {
  private key: Buffer | null = null;
  private epoch = 0;
  private busy = false;
  constructor(readonly root: string, readonly libraryId: string, private readonly fault?: (stage: string) => void, readOnly = false) {
    if (lstatSync(root).isSymbolicLink()) throw new LibraryError('INVALID_INPUT');
    if (readOnly) { if (existsSync(this.path('security-transaction.json')) || existsSync(this.path('.security-stage')) || existsSync(this.path('.security-previous'))) throw new LibraryError('LIBRARY_IN_USE'); }
    else this.recover();
    if (!this.configured && this.encryptedIds().length) throw new LibraryError('INTEGRITY_CHECK_FAILED');
  }
  private path(...parts: string[]): string {
    const path = resolve(this.root, ...parts), rel = relative(this.root, path);
    if (rel.startsWith('..') || rel.includes(':')) throw new LibraryError('INVALID_INPUT');
    let current = this.root;
    for (const part of rel.split(sep)) { current = join(current, part); if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw new LibraryError('INVALID_INPUT'); }
    return path;
  }
  private write(path: string, bytes: string | Buffer): void {
    const fd = openSync(path, 'wx'); try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
  }
  private atomic(path: string, value: unknown): void {
    const temp = this.path(relative(this.root, path) + '.pending-' + randomUUID());
    try { this.write(temp, JSON.stringify(value)); renameSync(temp, path); } finally { if (existsSync(temp)) unlinkSync(temp); }
  }
  get configured(): boolean { return existsSync(this.path('keyring.json')); }
  get unlocked(): boolean { return this.key !== null; }
  verifyStructure(): void { if (this.configured) this.ring(); }
  lock(): void { this.epoch++; this.key?.fill(0); this.key = null; }
  private ring(): Keyring {
    const path = this.path('keyring.json');
    if (!existsSync(path) || statSync(path).size > 4096) throw new LibraryError('INTEGRITY_CHECK_FAILED');
    const value = JSON.parse(readFileSync(path, 'utf8')) as Keyring;
    if (value.version !== 1 || value.algorithm !== 'aes-256-gcm' || value.kdf !== 'scrypt' || value.N !== 131072 || value.r !== 8 || value.p !== 1 || !/^[a-f0-9]{32}$/.test(value.salt) || ![value.password, value.recovery].every(item => typeof item === 'string' && /^[a-f0-9]{136}$/.test(item))) throw new LibraryError('INTEGRITY_CHECK_FAILED');
    return value;
  }
  private context(name: string): string { return `NotebookAid/security/1/${this.libraryId}/${name.replaceAll('\\', '/')}`; }
  private async exclusive<T>(work: () => Promise<T>): Promise<T> {
    if (this.busy) throw new LibraryError('LIBRARY_IN_USE');
    this.busy = true; try { return await work(); } finally { this.busy = false; }
  }
  async setup(password: string): Promise<string> {
    return this.exclusive(async () => {
      if (this.configured || this.encryptedIds().length) throw new LibraryError('INVALID_INPUT');
      const generation = this.epoch, salt = randomBytes(16), wrapping = await derive(password, salt), key = randomBytes(32), recovery = randomBytes(32);
      try {
        if (generation !== this.epoch) throw new LibraryError('CANCELLED');
        const ring: Keyring = { version: 1, algorithm: 'aes-256-gcm', kdf: 'scrypt', N: 131072, r: 8, p: 1, salt: salt.toString('hex'), password: seal(key, wrapping, this.context('password')).toString('hex'), recovery: seal(key, recovery, this.context('recovery')).toString('hex') };
        this.atomic(this.path('keyring.json'), ring); this.key = Buffer.from(key);
        return 'NA1-' + recovery.toString('hex').match(/.{8}/g)!.join('-');
      } finally { wrapping.fill(0); key.fill(0); recovery.fill(0); }
    });
  }
  private async authenticate(credential: string, recovery: boolean): Promise<Buffer> {
    const ring = this.ring(); let wrapping: Buffer;
    if (recovery) {
      if (typeof credential !== 'string' || !/^NA1-(?:[a-f0-9]{8}-){7}[a-f0-9]{8}$/i.test(credential.trim())) throw new LibraryError('BAD_CREDENTIAL');
      wrapping = Buffer.from(credential.trim().slice(4).replaceAll('-', ''), 'hex');
    } else wrapping = await derive(credential, Buffer.from(ring.salt, 'hex'));
    try { return unseal(Buffer.from(recovery ? ring.recovery : ring.password, 'hex'), wrapping, this.context(recovery ? 'recovery' : 'password')); }
    catch { throw new LibraryError('BAD_CREDENTIAL'); }
    finally { wrapping.fill(0); }
  }
  async unlock(credential: string): Promise<void> {
    return this.exclusive(async () => {
      const generation = this.epoch, key = await this.authenticate(credential, false);
      try { if (generation !== this.epoch) throw new LibraryError('CANCELLED'); this.key?.fill(0); this.key = Buffer.from(key); }
      finally { key.fill(0); }
    });
  }
  async changePassword(credential: string, password: string, recovery = false): Promise<void> {
    return this.exclusive(async () => {
      const generation = this.epoch, key = await this.authenticate(credential, recovery);
      let wrapping: Buffer | undefined;
      try {
        const salt = randomBytes(16); wrapping = await derive(password, salt);
        if (generation !== this.epoch) throw new LibraryError('CANCELLED');
        this.atomic(this.path('keyring.json'), { ...this.ring(), salt: salt.toString('hex'), password: seal(key, wrapping, this.context('password')).toString('hex') });
        this.key?.fill(0); this.key = Buffer.from(key);
      } finally { key.fill(0); wrapping?.fill(0); }
    });
  }
  encrypted(id: string): boolean { return existsSync(this.path('notes', id, 'security.json')); }
  initializeEncryptedNote(id:string):void {
    if(!uuid.test(id)||existsSync(this.path('notes',id,'head.json')))throw new LibraryError('INVALID_INPUT');
    this.requireKey();this.write(this.path('notes',id,'security.json'),JSON.stringify({version:1}));
  }
  encryptedIds(): string[] { return readdirSync(this.path('notes')).filter(id => uuid.test(id) && this.encrypted(id)); }
  private requireKey(): Buffer { if (!this.key) throw new LibraryError('NOTEBOOK_LOCKED'); return this.key; }
  read(path: string, max: number, logical?: string): Buffer {
    path = this.path(relative(this.root, path));
    const name = (logical ?? relative(this.root, path)).replaceAll('\\', '/');
    const parts = name.split('/');
    const protectedFile = parts[0] === 'notes' && this.encrypted(parts[1]) && (parts[2] === 'revisions' || parts[2] === 'attachments');
    if (statSync(path).size > max + (protectedFile ? overhead : 0)) throw new LibraryError('INTEGRITY_CHECK_FAILED');
    const bytes = readFileSync(path);
    if (protectedFile) return unseal(bytes, this.requireKey(), this.context(name));
    return bytes;
  }
  encode(bytes: Buffer, logical: string, encrypt: boolean): Buffer { return encrypt ? seal(bytes, this.requireKey(), this.context(logical)) : bytes; }
  private tree(path: string): string[] {
    path = this.path(relative(this.root, path)); const stat = lstatSync(path);
    if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile())) throw new LibraryError('INVALID_INPUT');
    return stat.isDirectory() ? readdirSync(path).flatMap(name => this.tree(join(path, name))) : [path];
  }
  convert(id: string, encrypted: boolean): void {
    if (!uuid.test(id) || typeof encrypted !== 'boolean') throw new LibraryError('INVALID_INPUT');
    this.requireKey();
    if (this.encrypted(id) === encrypted) return;
    const source = this.path('notes', id), stage = this.path('.security-stage'), transaction = this.path('security-transaction.json');
    if (existsSync(stage) || existsSync(transaction)) throw new LibraryError('LIBRARY_IN_USE');
    mkdirSync(stage);
    let prepared = false;
    try {
      for (const path of this.tree(source)) {
        const local = relative(source, path).replaceAll('\\', '/');
        if (local === 'security.json') continue;
        if (!(local === 'head.json' || local === 'history.json' || local === 'import-owner' || /^revisions\/[a-f0-9-]+\/(metadata\.json|content\.(md|html|txt|nadelta))$/i.test(local) || /^attachments\/[a-f0-9-]+$/i.test(local))) throw new LibraryError('INTEGRITY_CHECK_FAILED');
        const logical = `notes/${id}/${local}`, protectedFile = local.startsWith('revisions/') || local.startsWith('attachments/');
        const bytes = this.read(path, 20 * 1024 * 1024, logical);
        try {
          const encoded = this.encode(bytes, logical, encrypted && protectedFile), target = join(stage, local);
          if (encrypted && protectedFile) { const verified = unseal(encoded, this.requireKey(), this.context(logical)); try { if (!verified.equals(bytes)) throw new LibraryError('INTEGRITY_CHECK_FAILED'); } finally { verified.fill(0); } }
          mkdirSync(dirname(target), { recursive: true }); this.write(target, encoded);
        } finally { bytes.fill(0); }
      }
      if (encrypted) {
        // Request fingerprints remain available inside encrypted revision metadata for replay.
        for (const name of readdirSync(this.path('recovery'))) {
          if (!/^[a-f0-9-]+\.json$/i.test(name)) continue;
          const file = this.path('recovery', name);
          if (statSync(file).size > 64 * 1024) throw new LibraryError('INTEGRITY_CHECK_FAILED');
          const journal = JSON.parse(readFileSync(file, 'utf8')) as { head?: { id?: string }; requestHash?: string };
          if (journal.head?.id === id && journal.requestHash !== undefined) {
            delete journal.requestHash; this.atomic(file, journal);
          }
        }
        this.write(join(stage, 'security.json'), JSON.stringify({ version: 1 }));
      }
      this.atomic(transaction, { version: 1, id }); prepared = true; this.fault?.('security-prepared');
      this.recover();
    } finally { if (!prepared && existsSync(stage)) { this.tree(stage); rmSync(stage, { recursive: true }); } }
  }
  recover(): void {
    const transaction = this.path('security-transaction.json'), stage = this.path('.security-stage'), previous = this.path('.security-previous');
    if (!existsSync(transaction)) {
      if (existsSync(previous)) throw new LibraryError('INTEGRITY_CHECK_FAILED');
      if (existsSync(stage)) { this.tree(stage); rmSync(stage, { recursive: true }); }
      return;
    }
    if (statSync(transaction).size > 1024) throw new LibraryError('INTEGRITY_CHECK_FAILED');
    const value = JSON.parse(readFileSync(transaction, 'utf8')) as { version: number; id: string };
    if (value.version !== 1 || !uuid.test(value.id)) throw new LibraryError('INTEGRITY_CHECK_FAILED');
    const source = this.path('notes', value.id);
    if (existsSync(stage)) {
      this.tree(stage);
      if (existsSync(source)) { if (existsSync(previous)) throw new LibraryError('INTEGRITY_CHECK_FAILED'); this.tree(source); renameSync(source, previous); this.fault?.('security-moved'); }
      renameSync(stage, source);
    }
    if (!existsSync(join(source, 'head.json'))) throw new LibraryError('INTEGRITY_CHECK_FAILED');
    if (existsSync(previous)) { this.tree(previous); rmSync(previous, { recursive: true }); }
    unlinkSync(transaction);
  }
  disable(): void {
    this.requireKey(); if (this.encryptedIds().length) throw new LibraryError('ENCRYPTED_NOTES_REMAIN');
    unlinkSync(this.path('keyring.json')); this.lock();
  }
}
