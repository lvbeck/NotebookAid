import type { Locale } from './i18n';
const keys = ['formula', 'edit', 'source', 'inline', 'block', 'apply', 'cancel', 'invalid', 'remove'] as const;
export type MathKey = typeof keys[number];
const text: Record<Locale, string[]> = {
  en: ['Formula','Edit formula','LaTeX source','Inline','Block','Apply','Cancel','Invalid or oversized formula. The source is preserved.','Remove formula'],
  'zh-CN': ['公式','编辑公式','LaTeX 源码','行内','块级','应用','取消','公式无效或过长，源码已保留。','删除公式'],
  'zh-TW': ['公式','編輯公式','LaTeX 原始碼','行內','區塊','套用','取消','公式無效或過長，已保留原始碼。','刪除公式'],
  de: ['Formel','Formel bearbeiten','LaTeX-Quelltext','Im Text','Block','Anwenden','Abbrechen','Ungültige oder zu lange Formel. Der Quelltext bleibt erhalten.','Formel entfernen'],
  fr: ['Formule','Modifier la formule','Source LaTeX','En ligne','Bloc','Appliquer','Annuler','Formule invalide ou trop longue. La source est conservée.','Supprimer la formule'],
  it: ['Formula','Modifica formula','Sorgente LaTeX','In linea','Blocco','Applica','Annulla','Formula non valida o troppo lunga. Il sorgente viene conservato.','Rimuovi formula'],
  es: ['Fórmula','Editar fórmula','Código LaTeX','En línea','Bloque','Aplicar','Cancelar','Fórmula no válida o demasiado larga. Se conserva el código.','Eliminar fórmula'],
  'pt-PT': ['Fórmula','Editar fórmula','Código LaTeX','Em linha','Bloco','Aplicar','Cancelar','Fórmula inválida ou demasiado longa. O código é preservado.','Remover fórmula'],
  ja: ['数式','数式を編集','LaTeX ソース','行内','ブロック','適用','キャンセル','数式が無効か長すぎます。ソースは保持されます。','数式を削除'],
  ko: ['수식','수식 편집','LaTeX 소스','인라인','블록','적용','취소','수식이 잘못되었거나 너무 깁니다. 소스는 유지됩니다.','수식 삭제']
};
export function mathText(locale: Locale, key: MathKey): string { return text[locale][keys.indexOf(key)]; }
