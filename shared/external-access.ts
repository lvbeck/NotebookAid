import type { ExternalCreateBinding, ExternalCreateRequest, ExternalCreateResult, ExternalCreateErrorCode } from './external-notes';

export const externalAccessProtocolVersion = 1;
export const externalAuthenticationTimeoutMs = 140000;
export type ExternalUnlockResult = { ok: true; unlocked: true } | { ok: false; code: ExternalCreateErrorCode };
export type ExternalAccessResult = ExternalCreateResult | ExternalUnlockResult;
export interface ExternalClientInfo extends ExternalCreateBinding {
  clientId: string;
  name: string;
  createdAt: string;
}
export interface ExternalClientCredential { clientId: string; token: string; }
export interface IssuedExternalClient extends ExternalClientCredential { client: ExternalClientInfo; }
export interface ExternalCreateEnvelope extends ExternalClientCredential {
  protocolVersion: 1;
  method: 'create';
  params: ExternalCreateRequest;
}
