import { Component, Input, OnInit, OnChanges, OnDestroy, signal, inject } from '@angular/core';
import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { FormsModule } from '@angular/forms';
import { IconComponent } from './icon.component';
import { SelectDirective } from './select.directive';
import type { Locale } from './i18n';
import { aiText, aiErrorText } from './ai-i18n';
import type { AiState, AiRequest, AiProvider } from '../../shared/ai';
@Component({ standalone: true, imports: [IconComponent], template: `<section class="app-confirm-dialog"><header><h2>{{ data.title }}</h2></header><div class="dialog-copy"><p>{{ data.message }}</p></div><footer><button class="primary" (click)="ref.close()"><app-icon name="Check" />{{ data.button }}</button></footer></section>` })
export class AiWelcomeDialog { readonly data = inject<{title:string;message:string;button:string}>(DIALOG_DATA); readonly ref = inject(DialogRef); }
@Component({ selector: 'app-ai-settings', standalone: true, imports: [FormsModule, IconComponent, SelectDirective], templateUrl: './ai-settings.component.html', styles: [':host{display:block}.ai-provider-picker{display:grid;gap:10px;margin:18px 0}.ai-provider-options{display:flex;flex-wrap:wrap;gap:6px;padding:5px;background:var(--bg);border:1px solid var(--line);border-radius:10px;width:fit-content;max-width:100%}.ai-provider-options button{margin:0;background:transparent;border-color:transparent}.ai-provider-options button.selected{background:var(--accent-soft);border-color:var(--accent);color:var(--accent)}.ai-provider{padding:18px 0;border-top:1px solid var(--line)}.ai-secret{display:flex;gap:8px;align-items:center}.ai-secret input{flex:1;min-width:0;width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--text);font:inherit}.ai-secret{flex-wrap:wrap}.ai-secret input:focus{outline:2px solid var(--accent);outline-offset:2px}.ai-provider .actions{margin:12px 0;flex-wrap:wrap}.ai-provider h3{display:flex;align-items:center;gap:12px}.ai-provider h3 span{font-size:12px;font-weight:400}.ai-message{overflow-wrap:anywhere}'] })
export class AiSettingsComponent implements OnInit, OnChanges, OnDestroy {
 @Input() locale: Locale = 'zh-CN';
 @Input() active = false;
 readonly providers = ['chatgpt', 'gemini', 'claude'] as const;
 readonly viewProvider = signal<AiProvider>('chatgpt');
 private initialized = false;
 readonly state = signal<AiState>({ available: false, selected: null, connections: [], accounts: [], accountId: null });
 readonly busy = signal(false); readonly loggingIn = signal(false); readonly message = signal('');
 private readonly dialogs = inject(Dialog);
 keys = { gemini: '', claude: '' }; visible = { gemini: false, claude: false };
 t(key: Parameters<typeof aiText>[1]): string { return aiText(this.locale, key); }
 error(code: string): string { return aiErrorText(this.locale, code); }
 async ngOnInit(): Promise<void> { await this.run({ action: 'state' }); this.viewProvider.set(this.state().selected ?? this.state().connections.find(c => c.connected)?.provider ?? 'chatgpt'); this.initialized = true; await this.loadModels(); }
 ngOnChanges(): void { if (this.initialized && this.active) void this.reloadModels(); }
 private async reloadModels(): Promise<void> { await this.run({action:'state'}); await this.loadModels(); }
 async showProvider(id: AiProvider): Promise<void> { if (this.busy()) return; this.keys.gemini = ''; this.keys.claude = ''; this.visible.gemini = false; this.visible.claude = false; this.message.set(''); this.viewProvider.set(id); await this.loadModels(); }
 private async loadModels(): Promise<void> { const connection = this.state().connections.find(c => c.provider === this.viewProvider()); if (this.active && connection?.connected && !connection.checkedAt && !connection.error) await this.run({action:'check',provider:connection.provider}); }
 ngOnDestroy(): void { if (this.loggingIn()) void window.notebookAid.ai.request({ action: 'cancel' }); this.keys.gemini = ''; this.keys.claude = ''; }
 async run(input: AiRequest): Promise<void> {
   if (this.busy() && input.action !== 'cancel') return;
   const cancel = input.action === 'cancel'; if (!cancel) this.busy.set(true); this.message.set('');
   if (input.action === 'login') this.loggingIn.set(true);
   try { const result = await window.notebookAid.ai.request(input); if (result.ok) { this.state.set(result.value); if (input.action !== 'state' && !cancel) this.message.set(result.warning ? this.error(result.warning) : this.t('saved')); if (result.welcome) this.dialogs.open(AiWelcomeDialog,{data:{title:this.t('welcomeTitle'),message:this.t('welcomeMessage'),button:this.t('gotIt')},panelClass:'app-dialog-panel',backdropClass:'app-dialog-backdrop',width:'520px',maxWidth:'calc(100vw - 32px)',ariaLabel:this.t('welcomeTitle')}); } else { this.message.set(this.error(result.code)); const status = await window.notebookAid.ai.request({ action: 'state' }); if (status.ok) this.state.set(status.value); } }
   catch { this.message.set(this.error('AI_CONNECTION_FAILED')); }
   finally { if (!cancel) { this.busy.set(false); this.loggingIn.set(false); } }
 }
 async saveKey(id: 'gemini' | 'claude'): Promise<void> { const key = this.keys[id].trim(); this.keys[id] = ''; this.visible[id] = false; await this.run({ action: 'key', provider: id, key }); }
 async select(id: AiProvider, event: Event): Promise<void> { const value = (event.target as HTMLSelectElement).value; if (value) await this.run({ action: 'select', provider: id, model: value }); }
 async account(event: Event): Promise<void> { const id = (event.target as HTMLSelectElement).value; if (id) await this.run({action:'account',id}); }
}
