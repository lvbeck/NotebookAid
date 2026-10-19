export interface TitlePart { text: string; matched: boolean; }
export function highlightTitle(title: string, keywords: string[]): TitlePart[] {
  const terms = keywords.map(word => word.normalize('NFKC').toLowerCase().trim()).filter(Boolean);
  if (!terms.length) return [{ text: title, matched: false }];
  const normalized = title.normalize('NFKC').toLowerCase();
  const positions: { start: number; end: number }[] = [];
  for (const { segment, index: start } of new Intl.Segmenter(undefined, { granularity:'grapheme' }).segment(title)) {
    const value = segment.normalize('NFKC').toLowerCase();
    for (let index = 0; index < value.length; index++) positions.push({ start, end:start + segment.length });
  }
  const marked = new Uint8Array(title.length);
  for (const term of terms) {
    let from = 0, index: number;
    while ((index = normalized.indexOf(term, from)) !== -1) {
      marked.fill(1, positions[index].start, positions[index + term.length - 1].end);
      from = index + 1;
    }
  }
  const parts: TitlePart[] = [];
  for (let index = 0; index < title.length; index++) {
    const matched = !!marked[index], previous = parts.at(-1);
    if (previous?.matched === matched) previous.text += title[index]; else parts.push({ text: title[index], matched });
  }
  return parts;
}
