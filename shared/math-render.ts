import katex from 'katex';
import { formulaLimit, formulaSource } from './math-source';

/** No shared macros, trusted commands, network resources or document-mode assumptions. */
export function formulaHtml(source: string): string {
  const value = formulaSource(source);
  if (!value || source.length > formulaLimit) throw Error('INVALID_FORMULA');
  return katex.renderToString(value.latex, { displayMode: value.display, throwOnError: true, trust: false, strict: 'ignore', maxExpand: 1000, maxSize: 20, macros: {} });
}
