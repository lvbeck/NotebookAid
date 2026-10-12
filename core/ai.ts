import { randomUUID } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, renameSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import type { AiProvider, AiConnection, AiState, AiModel } from '../shared/ai';

export class AiError extends Error { constructor(readonly code: string) { super(code); } }
export interface ChatgptCredential { clientId: string; subject: string; account: string; accessToken: string; refreshToken: string; idToken: string; expiresAt: number; scopes: string[] }
interface Credential { key?: string; chatgpt?: ChatgptCredential; model: string | null }
interface Saved { version: 1; hostId: string; selected: AiProvider | null; providers: Partial<Record<AiProvider, Credential>>; accounts: { clientId: string; subject: string; account: string; credential?: ChatgptCredential; model: string | null }[]; accountId: string | null }
export interface CredentialProtection { available(): boolean; encrypt(value: string): Buffer; decrypt(value: Buffer): string }
export const aiProviders: AiProvider[] = ['chatgpt', 'gemini', 'claude'];
export function provider(value: unknown): AiProvider { if (!aiProviders.includes(value as AiProvider)) throw new AiError('INVALID_INPUT'); return value as AiProvider; }
export class AiStore {
  private saved: Saved = { version: 1, hostId: 'urn:uuid:' + randomUUID(), selected: null, providers: {}, accounts: [], accountId: null };
  private readonly catalog = new Map<AiProvider, { models: AiModel[]; checkedAt: string; error?: string }>();
  constructor(private readonly root: string, private readonly protection: CredentialProtection) {
    const file = this.path();
    if (existsSync(file)) {
      if (!protection.available()) throw new AiError('CREDENTIAL_STORAGE_UNAVAILABLE');
      try { const value = JSON.parse(protection.decrypt(readFileSync(file))); this.validate(value); this.saved = value; }
      catch (e) { if (e instanceof AiError) throw e; throw new AiError('CREDENTIAL_STORAGE_UNREADABLE'); }
    }
  }
  private validate(value: Saved): void {
    if (value?.version !== 1 || !/^urn:uuid:[0-9a-f-]{36}$/i.test(value.hostId) || (value.selected !== null && !aiProviders.includes(value.selected)) || !value.providers || typeof value.providers !== 'object') throw new AiError('CREDENTIAL_STORAGE_UNREADABLE');
    for (const [id, entry] of Object.entries(value.providers)) {
      provider(id);
      if (!entry || (entry.model !== null && (typeof entry.model !== 'string' || entry.model.length > 160))) throw new AiError('CREDENTIAL_STORAGE_UNREADABLE');
      if (id !== 'chatgpt') this.validateKey(entry.key);
      else { const c = entry.chatgpt; if (!c || !c.clientId.startsWith('oaiapp_') || !c.subject || !c.accessToken || !c.refreshToken || !c.idToken || !Number.isFinite(c.expiresAt) || !Array.isArray(c.scopes) || !c.scopes.every(s => typeof s === 'string')) throw new AiError('CREDENTIAL_STORAGE_UNREADABLE'); }
    }
    if (value.selected && !value.providers[value.selected]) throw new AiError('CREDENTIAL_STORAGE_UNREADABLE');
    if (!Array.isArray(value.accounts) || value.accounts.length > 20 || new Set(value.accounts.map(a => a.clientId)).size !== value.accounts.length || value.accounts.some(a => !/^oaiapp_[A-Za-z0-9_-]+$/.test(a.clientId) || typeof a.subject !== 'string' || !a.subject || typeof a.account !== 'string' || a.account.length > 254 || (a.credential && (a.credential.clientId !== a.clientId || a.credential.subject !== a.subject))) || (value.accountId !== null && !value.accounts.some(a => a.clientId === value.accountId))) throw new AiError('CREDENTIAL_STORAGE_UNREADABLE');
  }
  private path(): string {
    if (lstatSync(this.root).isSymbolicLink()) throw new AiError('UNSAFE_PATH');
    const file = join(this.root, 'ai-connections.bin');
    if (existsSync(file) && (lstatSync(file).isSymbolicLink() || !lstatSync(file).isFile() || lstatSync(file).size > 256 * 1024)) throw new AiError('UNSAFE_PATH');
    return file;
  }
  private write(next: Saved): void {
    if (!this.protection.available()) throw new AiError('CREDENTIAL_STORAGE_UNAVAILABLE');
    this.validate(next); const file = this.path(), temporary = file + '.pending-' + randomUUID();
    try { const text = JSON.stringify(next); if (Buffer.byteLength(text) > 240 * 1024) throw new AiError('ACCOUNT_LIMIT'); writeFileSync(temporary, this.protection.encrypt(text), { flag: 'wx', mode: 0o600 }); renameSync(temporary, file); this.saved = next; }
    catch (e) { if (e instanceof AiError) throw e; throw new AiError('CREDENTIAL_WRITE_FAILED'); }
    finally { if (existsSync(temporary)) unlinkSync(temporary); }
  }
  host(): string { this.write(structuredClone(this.saved)); return this.saved.hostId; }
  credential(id: AiProvider): Credential { const c = this.saved.providers[id]; if (!c) throw new AiError('NOT_CONNECTED'); return structuredClone(c); }
  validateKey(key: unknown): asserts key is string { if (typeof key !== 'string' || key.length < 10 || key.length > 4096 || /[\s\x00-\x1f]/.test(key)) throw new AiError('INVALID_KEY'); }
  key(id: 'gemini' | 'claude', key: unknown): void { this.validateKey(key); const next = structuredClone(this.saved); next.providers[id] = { key, model: null }; this.write(next); this.catalog.delete(id); }
  chatgpt(c: ChatgptCredential): void {
    const next = structuredClone(this.saved), previous = next.providers.chatgpt;
    const same = previous?.chatgpt?.subject === c.subject && previous.chatgpt.clientId === c.clientId;
    next.providers.chatgpt = { chatgpt: c, model: same ? previous.model : null };
    let account = next.accounts.find(a => a.clientId === c.clientId);
    if (!account) { if (next.accounts.length >= 20) throw new AiError('ACCOUNT_LIMIT'); account = { clientId: c.clientId, subject: c.subject, account: c.account, model: null }; next.accounts.push(account); }
    if (account.subject !== c.subject) throw new AiError('ACCOUNT_MISMATCH');
    account.credential = c; account.account = c.account; account.model = next.providers.chatgpt.model; next.accountId = c.clientId;
    this.write(next); if (!same) this.catalog.delete('chatgpt');
  }
  registration(): Saved['accounts'][number] | undefined { return structuredClone(this.saved.accounts.find(a => a.clientId === this.saved.accountId)); }
  account(id: unknown): void { const next = structuredClone(this.saved), account = next.accounts.find(a => a.clientId === id); if (!account) throw new AiError('INVALID_INPUT'); next.accountId = account.clientId; if (account.credential) next.providers.chatgpt = { chatgpt: account.credential, model: account.model }; else delete next.providers.chatgpt; if (next.selected === 'chatgpt') next.selected = null; this.write(next); this.catalog.delete('chatgpt'); }
  disconnect(id: AiProvider): void { const next = structuredClone(this.saved); if (id === 'chatgpt') { const account = next.accounts.find(a => a.clientId === next.accountId); if (account) delete account.credential; } delete next.providers[id]; if (next.selected === id) next.selected = null; this.write(next); this.catalog.delete(id); }
  models(id: AiProvider, models: AiModel[]): void { this.catalog.set(id, { models, checkedAt: new Date().toISOString() }); }
  failure(id: AiProvider, error: string): void { const old = this.catalog.get(id); this.catalog.set(id, { models: old?.models ?? [], checkedAt: old?.checkedAt ?? '', error }); }
  clearFailure(id: AiProvider): void { if (this.catalog.get(id)?.error) this.catalog.delete(id); }
  select(id: AiProvider, model: unknown): void {
    const catalog = this.catalog.get(id); if (!catalog || catalog.error || !catalog.models.some(m => m.id === model)) throw new AiError('MODEL_UNAVAILABLE');
    const next = structuredClone(this.saved); if (!next.providers[id]) throw new AiError('NOT_CONNECTED'); next.providers[id]!.model = model as string; next.selected = id;
    if (id === 'chatgpt') { const account = next.accounts.find(a => a.clientId === next.accountId); if (account) account.model = model as string; }
    this.write(next);
  }
  state(): AiState {
    return { available: this.protection.available(), selected: this.saved.selected, accountId: this.saved.accountId, accounts: this.saved.accounts.map(a => ({ id: a.clientId, label: a.account + (this.saved.accounts.some(other => other.clientId !== a.clientId && other.account.toLowerCase() === a.account.toLowerCase()) ? ' · ' + a.clientId.slice(-8) : ''), connected: !!a.credential })), connections: aiProviders.map(id => {
      const credential = this.saved.providers[id], catalog = this.catalog.get(id);
      return { provider: id, connected: !!credential, model: credential?.model ?? null, ...(credential?.chatgpt ? { account: credential.chatgpt.account } : {}), models: catalog?.models ?? [], ...(catalog?.checkedAt ? { checkedAt: catalog.checkedAt } : {}), ...(catalog?.error ? { error: catalog.error } : {}) } satisfies AiConnection;
    }) };
  }
}
