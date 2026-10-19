import { ExternalNoteService, type ExternalNoteContext } from './external-notes';
import { ExternalClients } from './external-clients';
import { externalAccessProtocolVersion } from '../shared/external-access';
import type { ExternalCreateResult } from '../shared/external-notes';

export class ExternalAccessService {
  constructor(private readonly clients: ExternalClients, private readonly context: () => ExternalNoteContext) {}
  request(value: unknown): ExternalCreateResult {
    try {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, code: 'ACCESS_DENIED' };
      const input = value as Record<string, unknown>;
      if (Object.keys(input).some(key => !['protocolVersion', 'method', 'clientId', 'token', 'params'].includes(key)) ||
        input.protocolVersion !== externalAccessProtocolVersion || input.method !== 'create') return { ok: false, code: 'ACCESS_DENIED' };
      const service = new ExternalNoteService(this.context, () => this.clients.authenticate(input.clientId, input.token));
      return service.create(input.params);
    } catch { return { ok: false, code: 'ACCESS_DENIED' }; }
  }
}
