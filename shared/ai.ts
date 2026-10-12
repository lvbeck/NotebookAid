export type AiProvider = 'chatgpt' | 'gemini' | 'claude';
export interface AiModel { id: string; name: string }
export interface AiConnection { provider: AiProvider; connected: boolean; account?: string; model: string | null; models: AiModel[]; checkedAt?: string; error?: string }
export interface AiState { available: boolean; selected: AiProvider | null; connections: AiConnection[]; accounts: { id: string; label: string; connected: boolean }[]; accountId: string | null }
export type AiRequest = { action: 'state' | 'cancel' | 'usage' } | { action: 'login'; fresh?: boolean } | { action: 'account'; id: string } | { action: 'key'; provider: 'gemini' | 'claude'; key: string } | { action: 'check' | 'disconnect'; provider: AiProvider } | { action: 'select'; provider: AiProvider; model: string };
export type AiResult = { ok: true; value: AiState; warning?: string; welcome?: boolean } | { ok: false; code: string };
export interface AiApi { request(input: AiRequest): Promise<AiResult> }
