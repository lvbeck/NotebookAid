import { ipcMain, safeStorage, shell, type IpcMainInvokeEvent } from 'electron';
import { AiError, AiStore, provider } from '../core/ai';
import type { AiResult } from '../shared/ai';
import { AiNetwork } from './ai-network';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
export function registerAi(root: string, authorize: (event: IpcMainInvokeEvent) => void, simulated = false, backgroundAllowed = () => true) {
  let store: AiStore | undefined, busy = false;
  let closed = false;
  const renewalRetry = new Map<string, number>();
  let network: AiNetwork | undefined;
  const get = () => store ??= new AiStore(root, { available: () => safeStorage.isEncryptionAvailable(), encrypt: value => safeStorage.encryptString(value), decrypt: value => safeStorage.decryptString(value) });
  ipcMain.handle('ai:request', async (event, input: unknown): Promise<AiResult> => {
    authorize(event);
    try {
      const request = input as Record<string, unknown>;
      if (!request || typeof request !== 'object' || typeof request.action !== 'string') throw new AiError('INVALID_INPUT');
      if (request.action === 'cancel') { network?.cancel(); return { ok: true, value: get().state() }; }
      if (request.action === 'state') return { ok: true, value: get().state() };
      if (busy) throw new AiError('CONNECTION_BUSY'); busy = true;
      network = new AiNetwork(get(), simulated ? async () => {} : url => shell.openExternal(url), simulated ? async url => { if (existsSync(join(root, 'simulate-ai-offline'))) throw new AiError('NETWORK_ERROR'); if (url.startsWith('https://generativelanguage.googleapis.com/')) return { models: [{ name: 'models/fixture-text', displayName: 'Fixture Text', supportedGenerationMethods: ['generateContent'] }] }; if (url.startsWith('https://api.anthropic.com/')) return { data: [{ id: 'fixture-claude', display_name: 'Fixture Claude' }] }; throw new AiError('INVALID_RESPONSE'); } : undefined, () => authorize(event));
      let warning: string | undefined, welcome = false;
      const refreshModels = async (id: 'chatgpt') => { try { await network!.check(id); } catch (e) { warning = e instanceof AiError ? e.code : 'NETWORK_ERROR'; get().failure(id, warning); } };
      try {
        if (request.action === 'login') { if (request.fresh !== undefined && typeof request.fresh !== 'boolean') throw new AiError('INVALID_INPUT'); welcome = await network.login(request.fresh === true); renewalRetry.delete(get().state().accountId!); await refreshModels('chatgpt'); }
        else if (request.action === 'account') { get().account(request.id); if (get().state().connections[0].connected) await refreshModels('chatgpt'); }
        else if (request.action === 'usage') await shell.openExternal('https://chatgpt.com/settings/usage');
        else {
          const id = provider(request.provider);
          if (request.action === 'key') { if (id === 'chatgpt') throw new AiError('INVALID_INPUT'); get().key(id, request.key); }
          else if (request.action === 'check') { try { await network.check(id); if (id === 'chatgpt') renewalRetry.delete(get().state().accountId!); } catch (e) { get().failure(id, e instanceof AiError ? e.code : 'NETWORK_ERROR'); throw e; } }
          else if (request.action === 'disconnect') { if (id === 'chatgpt') warning = await network.disconnect(); else get().disconnect(id); }
          else if (request.action === 'select') get().select(id, request.model);
          else throw new AiError('INVALID_INPUT');
        }
        return { ok: true, value: get().state(), ...(warning ? { warning } : {}), ...(welcome ? { welcome } : {}) };
      } finally { busy = false; }
    } catch (e) { return { ok: false, code: e instanceof AiError ? e.code : 'AI_CONNECTION_FAILED' }; }
  });
  const renewal = setInterval(() => {
    if (simulated || closed || busy || !backgroundAllowed()) return;
    try {
      const c = get().registration()?.credential;
      if (!c || c.expiresAt > Date.now() + 60000 || (renewalRetry.get(c.clientId) ?? 0) > Date.now()) return;
      busy = true;
      const refresh = new AiNetwork(get(), url => shell.openExternal(url), undefined, () => { if (closed || !backgroundAllowed()) throw new AiError('APP_LOCKED'); });
      void refresh.refresh().then(() => { renewalRetry.delete(c.clientId); get().clearFailure('chatgpt'); }).catch(e => {
        const code = e instanceof AiError ? e.code : 'NETWORK_ERROR';
        renewalRetry.set(c.clientId, code === 'AUTH_REQUIRED' || code === 'PLAN_PERMISSION_REQUIRED' ? Infinity : Date.now() + 5 * 60000);
        if (!closed && code !== 'APP_LOCKED') get().failure('chatgpt', code);
      }).finally(() => { busy = false; });
    } catch { /* Preserve unreadable credentials and let settings report the failure. */ }
  }, 30000);
  renewal.unref();
  return { store: get, generate: async (id: import('../shared/ai').AiProvider, model: string, prompt: string, signal: AbortSignal) => {
    if (closed || !backgroundAllowed()) throw new AiError('APP_LOCKED'); if (busy) throw new AiError('CONNECTION_BUSY');
    const state=get().state(),connection=state.connections.find(c=>c.provider===state.selected);
    if(connection?.provider!==id||connection.model!==model)throw new AiError('MODEL_UNAVAILABLE');
    busy=true;
    try { if(simulated){await new Promise(resolve=>setTimeout(resolve,50));if(signal.aborted)throw new AiError('REQUEST_CANCELLED');return 'Fixture AI result';}
      return await new AiNetwork(get(),url=>shell.openExternal(url),undefined,()=>{if(closed||!backgroundAllowed())throw new AiError('APP_LOCKED');}).writeText(id,model,prompt,signal);
    } finally{busy=false;}
  }, close: () => { closed = true; clearInterval(renewal); network?.cancel(); } };
}
