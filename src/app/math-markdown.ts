import { Marked } from 'marked';
import { mathAtStart, mathMarkup } from '../../shared/math-source';

export const mathMarkdown = new Marked({ extensions: [true, false].map(block => ({
  name: block ? 'noteMathBlock' : 'noteMathInline', level: block ? 'block' as const : 'inline' as const,
  start(source: string) {
    const matches = block ? source.match(/(?:^|\n) {0,3}(?:\$\$|\\\[)/) : source.match(/\$|\\\(/);
    return matches?.index;
  },
  tokenizer(source: string) {
    const value = mathAtStart(source, block);
    if (value) return { type: block ? 'noteMathBlock' : 'noteMathInline', raw: value.raw, text: value.source };
    return;
  },
  renderer(token: { text?: string }) {
    const markup = mathMarkup(token.text ?? '', block);
    return block ? '<p>' + markup + '</p>\n' : markup;
  }
})) });
