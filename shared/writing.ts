import type { AttachmentRequest } from './attachments';
import type { SaveResult } from './library';
import type { AiProvider } from './ai';
import type { SettingsLocale } from './settings';
export const translationLanguages:Record<SettingsLocale,string>={ja:'Japanese',ko:'Korean',en:'English',de:'German',fr:'French',it:'Italian',es:'Spanish','pt-PT':'Portuguese (Portugal)','zh-CN':'Simplified Chinese','zh-TW':'Traditional Chinese (Hong Kong)'};
export type WritingOperation = 'polish' | 'rewrite' | 'expand' | 'shorten' | 'translate' | 'continue' | 'custom' | 'summary';
export interface GeneratedSummary { text: string; sourceContentVersion: number; sourceRevisionId: string; createdAt: string; provider: AiProvider; model: string }
export interface GeneratedTranslation extends GeneratedSummary { targetLanguage:SettingsLocale; scope:'all'|'selection';sourceMode:boolean;sourceHash:string;instruction:string }
export interface WritingInput { session: AttachmentRequest; libraryId: string; operation: WritingOperation; scope: 'all' | 'selection'; selection?: string; sourceMode: boolean; instruction: string; targetLanguage?:SettingsLocale }
export interface WritingPreview { token: string; sourceText: string; result?: string; provider: AiProvider; model: string; encrypted: boolean;cached?:boolean;stale?:boolean }
export type WritingRequest = { action: 'prepare'|'load'; input: WritingInput } | { action: 'generate' | 'cancel' | 'apply' | 'summary'|'translation'; token: string };
export type WritingResult = { ok: true; value: WritingPreview | SaveResult | null } | { ok: false; code: string };
export interface WritingApi { request(input: WritingRequest): Promise<WritingResult> }
export function validateSummary(value: GeneratedSummary): void {
 if (!value || typeof value.text !== 'string' || !value.text.trim() || value.text.length > 16384 || !Number.isSafeInteger(value.sourceContentVersion) || value.sourceContentVersion < 1 || typeof value.sourceRevisionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.sourceRevisionId) || typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt)) || !['chatgpt','gemini','claude'].includes(value.provider) || typeof value.model !== 'string' || !value.model || value.model.length > 160) throw Error('INVALID_SUMMARY');
}
export function validateTranslation(value:GeneratedTranslation):void{validateSummary({...value,text:'Translation'});if(typeof value.text!=='string'||!value.text.trim()||value.text.length>64000||!Object.hasOwn(translationLanguages,value.targetLanguage)||!['all','selection'].includes(value.scope)||typeof value.sourceMode!=='boolean'||typeof value.sourceHash!=='string'||!/^[a-f0-9]{64}$/.test(value.sourceHash)||typeof value.instruction!=='string'||value.instruction.length>2000)throw Error('INVALID_TRANSLATION');}
