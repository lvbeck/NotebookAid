import { Component, Input, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from './icon.component';
import { SelectDirective } from './select.directive';
import { NoteWorkspace } from './note-workspace';
import { mcpText, type McpKey } from './mcp-i18n';
import type { McpSetupState, McpSetupApi } from '../../shared/mcp-setup';
import type { ExternalClientInfo } from '../../shared/external-access';
@Component({ selector: 'app-mcp-settings', standalone: true, imports: [FormsModule, IconComponent, SelectDirective], template: `
<details class="panel settings-panel" data-testid="mcp-settings" (toggle)="opened($event)"><summary>{{ t('title') }}</summary>
<p class="muted">{{ t('hint') }}</p>
<label class="setting-row"><span>{{ t('name') }}</span><input data-testid="mcp-client-name" [(ngModel)]="name" maxlength="80" [disabled]="busy()"></label>
<label class="setting-row"><span>{{ t('folder') }}</span><select appSelect data-testid="mcp-folder" [(ngModel)]="folderId" [disabled]="busy() || workspace.switching()"><option value="">{{ t('root') }}</option>@for(folder of workspace.organization().folders; track folder.id){<option [value]="folder.id">{{ workspace.folderPath(folder.id) }}</option>}</select></label>
<p>{{ t('scope') }}: {{ entry()?.name || '—' }}</p>
<div class="actions"><button class="primary" data-testid="mcp-create" (click)="create()" [disabled]="busy() || !state()?.available || !entry()?.libraryId || workspace.switching() || !name.trim()"><app-icon name="Plus" />{{ t('create') }}</button><button class="secondary" data-testid="mcp-refresh" (click)="request({action:'state'})" [disabled]="busy()"><app-icon name="RefreshCw" />{{ t('refresh') }}</button></div>
@if(state() && !state()?.available){<p class="warning">{{ t('unavailable') }}</p>}
@if(state()?.clients?.length){@for(client of state()!.clients;track client.clientId){<section class="mcp-client"><b>{{ client.name }}</b><p class="muted">{{ t('scope') }}: {{ scope(client) }}</p><div class="actions"><button class="secondary" [attr.data-client]="client.clientId" data-testid="mcp-reveal" (click)="request({action:'reveal',clientId:client.clientId})" [disabled]="busy()"><app-icon name="FolderOpen" />{{ t('reveal') }}</button><button class="secondary" data-testid="mcp-revoke" (click)="request({action:'revoke',clientId:client.clientId})" [disabled]="busy()"><app-icon name="X" />{{ t('revoke') }}</button></div></section>}}@else{<p>{{ t('empty') }}</p>}
@if(created()){<p role="status" data-testid="mcp-created">{{ t('created') }}</p>}@if(error()){<p class="warning" role="alert" data-testid="mcp-error">{{ t('failed') }} · {{ error() }}</p>}
</details>`, styles: ['summary{cursor:pointer;font-weight:600}.mcp-client{margin-top:1rem;border-top:1px solid var(--border);padding-top:.7rem}.mcp-client p{overflow-wrap:anywhere}'] })
export class McpSettingsComponent {
  @Input() locale = 'en';
  readonly workspace = inject(NoteWorkspace);
  readonly entry = computed(() => this.workspace.registry().entries.find(item => item.id === this.workspace.registry().activeId));
  readonly state = signal<McpSetupState | null>(null); readonly busy = signal(false); readonly error = signal(''); readonly created = signal(false);
  name = 'Codex'; folderId = '';
  t(key: McpKey): string { return mcpText(this.locale, key); }
  scope(client: ExternalClientInfo): string { const library = this.workspace.registry().entries.find(item => item.libraryId === client.libraryId); const folder = client.folderId === null ? this.t('root') : this.entry()?.libraryId === client.libraryId ? this.workspace.folderPath(client.folderId) || client.folderId : client.folderId; return (library?.name || client.libraryId) + ' / ' + folder; }
  opened(event: Event): void { if ((event.target as HTMLDetailsElement).open) void this.request({ action: 'state' }); }
  async create(): Promise<void> { const libraryId = this.entry()?.libraryId; if (libraryId) await this.request({ action: 'create', name: this.name, libraryId, folderId: this.folderId || null }); }
  async request(input: Parameters<McpSetupApi['request']>[0]): Promise<void> {
    if (this.busy()) return; this.busy.set(true); this.error.set(''); this.created.set(false);
    try { const result = await window.notebookAid.mcp.request(input); if (result.ok) { this.state.set(result.value); this.created.set(!!result.createdId); } else if (result.code !== 'CANCELLED') this.error.set(result.code); }
    catch { this.error.set('MCP_SETUP_FAILED'); } finally { this.busy.set(false); }
  }
}
