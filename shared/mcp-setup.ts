import type { ExternalClientInfo } from './external-access';
export interface McpSetupState { available: boolean; clients: ExternalClientInfo[]; }
export type McpSetupResult = { ok: true; value: McpSetupState; createdId?: string } | { ok: false; code: string };
export interface McpSetupApi { request(input: { action: 'state' } | { action: 'create'; name: string; libraryId: string; folderId: string | null } | { action: 'revoke' | 'reveal'; clientId: string }): Promise<McpSetupResult>; }
