import type { Locale } from './i18n';
const labels: Record<Locale, readonly string[]> = {
  'zh-CN': ['查看', '查看布局', '连续布局', '默认 · 内容连续显示', '分页布局', 'A4 风格 · 页面分隔', '页'],
  'zh-TW': ['檢視', '檢視版面配置', '連續版面', '預設 · 連續顯示內容', '分頁版面', 'A4 風格 · 頁面分隔', '頁'],
  en: ['View', 'View layout', 'Continuous layout', 'Default · continuous content', 'Page layout', 'A4 style · page separators', 'Page'],
  de: ['Ansicht', 'Ansichtslayout', 'Fortlaufendes Layout', 'Standard · fortlaufender Inhalt', 'Seitenlayout', 'A4-Stil · Seitentrennung', 'Seite'],
  fr: ['Affichage', 'Disposition', 'Disposition continue', 'Par défaut · contenu continu', 'Disposition en pages', 'Style A4 · séparation des pages', 'Page'],
  it: ['Visualizza', 'Layout di visualizzazione', 'Layout continuo', 'Predefinito · contenuto continuo', 'Layout a pagine', 'Stile A4 · separazione pagine', 'Pagina'],
  es: ['Vista', 'Diseño de vista', 'Diseño continuo', 'Predeterminado · contenido continuo', 'Diseño de página', 'Estilo A4 · separación de páginas', 'Página'],
  'pt-PT': ['Ver', 'Esquema de visualização', 'Esquema contínuo', 'Predefinido · conteúdo contínuo', 'Esquema de páginas', 'Estilo A4 · separação de páginas', 'Página'],
  ja: ['表示', '表示レイアウト', '連続レイアウト', '既定 · 内容を連続表示', 'ページレイアウト', 'A4 スタイル · ページ区切り', 'ページ'],
  ko: ['보기', '보기 레이아웃', '연속 레이아웃', '기본값 · 연속 콘텐츠', '페이지 레이아웃', 'A4 스타일 · 페이지 구분', '페이지']
};
export type ViewKey = 'view' | 'layout' | 'continuous' | 'continuousHint' | 'pages' | 'pagesHint' | 'page';
const keys: ViewKey[] = ['view', 'layout', 'continuous', 'continuousHint', 'pages', 'pagesHint', 'page'];
export function viewText(locale: Locale, key: ViewKey): string { return labels[locale][keys.indexOf(key)]; }
