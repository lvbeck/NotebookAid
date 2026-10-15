import type { Locale } from './i18n';

export type SettingsLayoutKey = 'basic' | 'security' | 'appearance';
const text: Record<Locale, Record<SettingsLayoutKey, string>> = {ja: { basic: "基本設定", security: "セキュリティ設定", appearance: "外観設定" }, ko: { basic: "기본 설정", security: "보안 설정", appearance: "모양 설정" },
  en: { basic: 'Basic settings', security: 'Security settings', appearance: 'Appearance settings' },
  de: { basic: 'Grundeinstellungen', security: 'Sicherheitseinstellungen', appearance: 'Darstellung' },
  fr: { basic: 'Paramètres de base', security: 'Paramètres de sécurité', appearance: 'Apparence' },
  it: { basic: 'Impostazioni di base', security: 'Impostazioni di sicurezza', appearance: 'Aspetto' },
  es: { basic: 'Configuración básica', security: 'Configuración de seguridad', appearance: 'Apariencia' },
  'pt-PT': { basic: 'Definições básicas', security: 'Definições de segurança', appearance: 'Aspeto' },
  'zh-CN': { basic: '基础设置', security: '安全设置', appearance: '外观设置' },
  'zh-TW': { basic: '基本設定', security: '安全設定', appearance: '外觀設定' },
};

export function settingsLayoutText(locale: Locale, key: SettingsLayoutKey): string { return text[locale][key]; }
