import type { Locale } from './i18n';
export const printTranslations: Record<Locale, Record<PrintKey, string>> = {
  "en": {
    "print": "Print",
    "pdf": "Print to PDF",
    "failed": "Print failed.",
    "success": "Completed.",
    "cancelled": "Cancelled.",
  },
  "zh-CN": {
    "print": "打印",
    "pdf": "打印为 PDF",
    "failed": "打印失败。",
    "success": "已完成。",
    "cancelled": "已取消。",
  },
  "zh-TW": {
    "print": "列印",
    "pdf": "列印為 PDF",
    "failed": "列印失敗。",
    "success": "已完成。",
    "cancelled": "已取消。",
  },
  "de": {
    "print": "Drucken",
    "pdf": "Als PDF drucken",
    "failed": "Drucken fehlgeschlagen.",
    "success": "Abgeschlossen.",
    "cancelled": "Abgebrochen.",
  },
  "fr": {
    "print": "Imprimer",
    "pdf": "Imprimer en PDF",
    "failed": "Échec de l’impression.",
    "success": "Terminé.",
    "cancelled": "Annulé.",
  },
  "it": {
    "print": "Stampa",
    "pdf": "Stampa in PDF",
    "failed": "Stampa non riuscita.",
    "success": "Completato.",
    "cancelled": "Annullato.",
  },
  "es": {
    "print": "Imprimir",
    "pdf": "Imprimir en PDF",
    "failed": "Error de impresión.",
    "success": "Completado.",
    "cancelled": "Cancelado.",
  },
  "pt-PT": {
    "print": "Imprimir",
    "pdf": "Imprimir em PDF",
    "failed": "Falha na impressão.",
    "success": "Concluído.",
    "cancelled": "Cancelado.",
  },
  "ja": {
    "print": "印刷",
    "pdf": "PDF に出力",
    "failed": "印刷に失敗しました。",
    "success": "完了しました。",
    "cancelled": "キャンセルしました。",
  },
  "ko": {
    "print": "인쇄",
    "pdf": "PDF로 인쇄",
    "failed": "인쇄하지 못했습니다.",
    "success": "완료되었습니다.",
    "cancelled": "취소되었습니다.",
  }
};
export type PrintKey = 'print' | 'pdf' | 'failed' | 'success' | 'cancelled';
export function printText(locale: Locale, key: PrintKey): string { return printTranslations[locale][key]; }
