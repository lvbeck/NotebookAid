import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { AiError, AiStore, type ChatgptCredential } from '../core/ai';
import type { AiProvider, AiModel } from '../shared/ai';

export type JsonRequest = (url: string, init?: RequestInit) => Promise<any>;
export async function verifyIdentity(token: string, clientId: string): Promise<Record<string, unknown>> {
  const { createRemoteJWKSet, jwtVerify } = await import('jose');
  try { return (await jwtVerify(token, createRemoteJWKSet(new URL('https://auth.openai.com/.well-known/jwks.json')), { issuer: 'https://auth.openai.com', audience: clientId, algorithms: ['RS256'], requiredClaims: ['exp', 'sub', 'nonce'] })).payload; }
  catch { throw new AiError('INVALID_LOGIN'); }
}
export async function requestJson(url: string, init: RequestInit = {}): Promise<any> {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, redirect: 'error' });
    if (!response.ok) {
      if (response.status === 400 && url === 'https://auth.openai.com/api/accounts/oauth/token') throw new AiError('AUTH_REQUIRED');
      await response.body?.cancel(); throw new AiError(response.status === 401 ? 'AUTH_REQUIRED' : response.status === 403 ? 'ACCESS_DENIED' : response.status === 429 || response.status === 402 ? 'RATE_LIMITED' : 'PROVIDER_UNAVAILABLE');
    }
    const reader = response.body?.getReader(); if (!reader) throw new AiError('INVALID_RESPONSE');
    let size = 0; const chunks: Uint8Array[] = [];
    for (;;) { const value = await reader.read(); if (value.done) break; size += value.value.byteLength; if (size > 2 * 1024 * 1024) { await reader.cancel(); throw new AiError('INVALID_RESPONSE'); } chunks.push(value.value); }
    if (!size) return null;
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new AiError('INVALID_RESPONSE'); }
  } catch (e) { if (e instanceof AiError) throw e; throw new AiError(controller.signal.aborted ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR'); }
  finally { clearTimeout(timer); }
}
export class AiNetwork {
  private cancelPending?: () => void;
  private generation = 0;
  constructor(private readonly store: AiStore, private readonly open: (url: string) => Promise<void>, private readonly request: JsonRequest = requestJson, private readonly permitted: () => void = () => {}, private readonly identity = verifyIdentity) {}
  cancel(): void { this.generation++; this.cancelPending?.(); }
  async login(fresh = false): Promise<boolean> {
    if (this.cancelPending) throw new AiError('CONNECTION_BUSY');
    const generation = this.generation;
    const host = this.store.host(), state = randomBytes(32).toString('base64url'), nonce = randomBytes(32).toString('base64url'), verifier = randomBytes(48).toString('base64url');
    const old = fresh ? undefined : this.store.registration();
    const callback = await new Promise<{ code: string; clientId: string; redirect: string }>((resolve, reject) => {
      let completed = false, redirect = '';
      const finish = (error?: AiError, result?: { code: string; clientId: string; redirect: string }) => {
        if (completed) return; completed = true; clearTimeout(timer); server.close(); server.closeIdleConnections(); setTimeout(() => server.closeAllConnections(), 1000).unref(); this.cancelPending = undefined; error ? reject(error) : resolve(result!);
      };
      const server = createServer((req, res) => {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Security-Policy', "default-src 'none'");
        if (req.url && req.url.length > 8192) { res.writeHead(400).end('Invalid callback'); return; }
        const url = new URL(req.url ?? '/', 'http://127.0.0.1');
        if (req.method !== 'GET' || url.pathname !== '/auth/callback' || url.searchParams.get('state') !== state) { res.writeHead(400).end('Invalid callback'); return; }
        if (url.searchParams.has('error')) { res.end('Authorization cancelled. Return to NotebookAid.'); finish(new AiError('LOGIN_CANCELLED')); return; }
        const code = url.searchParams.get('code'), clientId = url.searchParams.get('client_id') ?? old?.clientId;
        if (!code || code.length > 4096 || !clientId || !/^oaiapp_[A-Za-z0-9_-]+$/.test(clientId) || (old && clientId !== old.clientId)) { res.writeHead(400).end('Invalid registration'); finish(new AiError('INVALID_LOGIN')); return; }
        res.end('Return to NotebookAid to complete connection verification.'); finish(undefined, { code, clientId, redirect });
      });
      const timer = setTimeout(() => finish(new AiError('LOGIN_TIMEOUT')), 180000);
      server.maxConnections = 5; server.headersTimeout = 10000; server.requestTimeout = 10000;
      this.cancelPending = () => finish(new AiError('LOGIN_CANCELLED'));
      server.on('error', () => finish(new AiError('CALLBACK_UNAVAILABLE')));
      server.listen(0, '127.0.0.1', () => {
        const address = server.address(); if (!address || typeof address === 'string') { finish(new AiError('CALLBACK_UNAVAILABLE')); return; }
        redirect = `http://127.0.0.1:${address.port}/auth/callback`;
        const query = new URLSearchParams({ client_id: old?.clientId ?? 'dynamic_agent_client', ext_agent_host_id: host, response_type: 'code', redirect_uri: redirect, scope: 'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct', resource: 'https://api.openai.com/v1', state, nonce, code_challenge_method: 'S256', code_challenge: createHash('sha256').update(verifier).digest('base64url') });
        if (old?.credential) query.set('id_token_hint', old.credential.idToken); if (!old) query.set('agent_name_hint', 'NotebookAid');
        void this.open('https://auth.openai.com/api/accounts/authorize?' + query).catch(() => finish(new AiError('BROWSER_UNAVAILABLE')));
      });
    });
    const tokens = await this.token({ grant_type: 'authorization_code', client_id: callback.clientId, code: callback.code, code_verifier: verifier, redirect_uri: callback.redirect, resource: 'https://api.openai.com/v1' });
    if (typeof tokens.refresh_token !== 'string' || !tokens.refresh_token || typeof tokens.id_token !== 'string' || tokens.id_token.length > 32768) throw new AiError('INVALID_LOGIN');
    const payload = await this.identity(tokens.id_token, callback.clientId);
    if (payload.nonce !== nonce || typeof payload.sub !== 'string' || !payload.sub || (old && payload.sub !== old.subject)) throw new AiError('ACCOUNT_MISMATCH');
    if (generation !== this.generation) throw new AiError('LOGIN_CANCELLED'); this.permitted();
    const first = !this.store.state().accounts.some(a => a.id === callback.clientId);
    this.store.chatgpt({ clientId: callback.clientId, subject: payload.sub, account: typeof payload.email === 'string' ? payload.email.slice(0, 254) : payload.sub.slice(0, 254), accessToken: tokens.access_token, refreshToken: tokens.refresh_token, idToken: tokens.id_token, expiresAt: Date.now() + tokens.expires_in * 1000, scopes: this.scopes(tokens.scope) });
    return first;
  }
  async disconnect(): Promise<string | undefined> {
    const credential = this.store.credential('chatgpt').chatgpt!; let warning: string | undefined;
    try {
      const discovery = await this.request('https://auth.openai.com/.well-known/openid-configuration');
      const url = new URL(discovery.revocation_endpoint);
      if (url.origin !== 'https://auth.openai.com' || url.username || url.password) throw new AiError('INVALID_RESPONSE');
      await this.request(url.href, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: credential.refreshToken, token_type_hint: 'refresh_token', client_id: credential.clientId }).toString() });
    } catch { warning = 'REVOCATION_FAILED'; }
    this.permitted(); this.store.disconnect('chatgpt'); return warning;
  }
  private scopes(value: unknown): string[] { if (typeof value !== 'string') throw new AiError('INVALID_LOGIN'); const scopes = value.split(' '); if (!scopes.includes('chatgpt.tokens.use.direct')) throw new AiError('PLAN_PERMISSION_REQUIRED'); return scopes; }
  private async token(input: Record<string, string>): Promise<any> {
    const tokens = await this.request('https://auth.openai.com/api/accounts/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(input).toString() });
    if (tokens.token_type?.toLowerCase() !== 'bearer' || typeof tokens.access_token !== 'string' || !tokens.access_token || tokens.access_token.length > 32768 || !Number.isFinite(tokens.expires_in) || tokens.expires_in <= 0 || tokens.expires_in > 86400) throw new AiError('INVALID_LOGIN');
    return tokens;
  }
  private async access(): Promise<string> {
    const c = this.store.credential('chatgpt').chatgpt!;
    if (!c.scopes.includes('chatgpt.tokens.use.direct')) throw new AiError('PLAN_PERMISSION_REQUIRED');
    if (c.expiresAt > Date.now() + 60000) return c.accessToken;
    const tokens = await this.token({ grant_type: 'refresh_token', client_id: c.clientId, refresh_token: c.refreshToken, resource: 'https://api.openai.com/v1' });
    if (typeof tokens.refresh_token !== 'string' || !tokens.refresh_token) throw new AiError('INVALID_LOGIN');
    this.permitted();
    this.store.chatgpt({ ...c, accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresAt: Date.now() + tokens.expires_in * 1000, scopes: tokens.scope ? this.scopes(tokens.scope) : c.scopes });
    return tokens.access_token;
  }
  async refresh(): Promise<void> { await this.access(); }
  async check(id: AiProvider): Promise<void> {
    const models: AiModel[] = []; let cursor: string | undefined;
    const key = id === 'chatgpt' ? await this.access() : this.store.credential(id).key!;
    const seen = new Set<string>();
    for (let page = 0; page < 10; page++) {
      let url: string, headers: Record<string, string>;
      if (id === 'chatgpt') { url = 'https://api.openai.com/v1/models'; headers = { Authorization: 'Bearer ' + key }; }
      else if (id === 'gemini') { url = 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=100' + (cursor ? '&pageToken=' + encodeURIComponent(cursor) : ''); headers = { 'x-goog-api-key': key }; }
      else { url = 'https://api.anthropic.com/v1/models?limit=100' + (cursor ? '&after_id=' + encodeURIComponent(cursor) : ''); headers = { 'x-api-key': key, 'anthropic-version': '2023-06-01' }; }
      const result = await this.request(url, { headers });
      const rows = id === 'claude' ? result.data : result.models;
      if (!Array.isArray(rows) || rows.length > 1000) throw new AiError('INVALID_RESPONSE');
      for (const row of rows) {
        if (id === 'chatgpt' && row.visibility !== 'list') continue;
        if (id === 'gemini' && !row.supportedGenerationMethods?.includes('generateContent')) continue;
        const modelId = id === 'chatgpt' ? row.slug : id === 'gemini' ? row.name : row.id;
        const name = row.display_name ?? row.displayName ?? modelId;
        if (typeof modelId !== 'string' || !/^[\w./:-]{1,160}$/.test(modelId) || typeof name !== 'string' || name.length > 200) throw new AiError('INVALID_RESPONSE');
        if (!models.some(m => m.id === modelId)) models.push({ id: modelId, name });
      }
      cursor = id === 'gemini' ? result.nextPageToken : id === 'claude' && result.has_more ? result.last_id : undefined;
      if (!cursor) { this.permitted(); this.store.models(id, models); return; }
      if (typeof cursor !== 'string' || cursor.length > 4096 || seen.has(cursor)) throw new AiError('INVALID_RESPONSE'); seen.add(cursor);
    }
    throw new AiError('INVALID_RESPONSE');
  }
}
