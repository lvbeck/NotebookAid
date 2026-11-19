export const providers = ['chatgpt', 'gemini', 'claude', 'openai', 'ollama'] as const;
export type AiProvider = typeof providers[number];
export type KeyProvider = Exclude<AiProvider, 'chatgpt' | 'ollama'>;
export const defaultOllamaServer = 'http://localhost:11434';
// Mark unencrypted connections that can carry note text beyond the local machine.
export function isRemoteHttp(address: string): boolean {
  const url = URL.parse(address);
  return url?.protocol === 'http:' && url.hostname !== 'localhost' && url.hostname !== '[::1]' && !/^127\.\d+\.\d+\.\d+$/.test(url.hostname);
}
export interface AiModel { id: string; name: string }
export interface AiConnection { provider: AiProvider; connected: boolean; account?: string; server?: string; model: string | null; models: AiModel[]; checkedAt?: string; error?: string }
export interface AiState { available: boolean; selected: AiProvider | null; connections: AiConnection[]; accounts: { id: string; label: string; connected: boolean }[]; accountId: string | null }
export type AiRequest = { action: 'state' | 'cancel' | 'usage' } | { action: 'login'; fresh?: boolean } | { action: 'account'; id: string } | { action: 'key'; provider: KeyProvider; key: string } | { action: 'server'; provider: 'ollama'; server: string } | { action: 'check' | 'disconnect'; provider: AiProvider } | { action: 'select'; provider: AiProvider; model: string };
export type AiResult = { ok: true; value: AiState; warning?: string; welcome?: boolean } | { ok: false; code: string };
export interface AiApi { request(input: AiRequest): Promise<AiResult> }
