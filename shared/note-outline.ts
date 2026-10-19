export interface OutlineNode {
  start: number; contentStart: number; contentEnd: number; end: number;
  title: string; depth: number; parent: number | null;
}
export interface NoteOutline { preambleEnd: number; nodes: OutlineNode[]; }

/** Derive a display index without normalizing or modifying the original source. */
export function noteOutline(source: string, format: string): NoteOutline {
  const nodes: OutlineNode[] = [], levels: { level: number; index: number }[] = [];
  if (format !== 'markdown' && format !== 'text') return { preambleEnd: source.length, nodes };
  let offset = 0, fence: { character: string; length: number } | undefined, comment = false;
  for (const raw of source.match(/[^\n]*\n|[^\n]+$/g) ?? []) {
    const line = raw.replace(/\r?\n$/, '');
    let match: RegExpMatchArray | null = null, level = 0;
    if (format === 'markdown') {
      const delimiter = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
      if (fence) {
        if (delimiter && delimiter[1]![0] === fence.character && delimiter[1]!.length >= fence.length && !delimiter[2]!.trim()) fence = undefined;
        offset += raw.length; continue;
      }
      if (comment) { if (line.includes('-->')) comment = false; offset += raw.length; continue; }
      if (/^ {0,3}<!--/.test(line)) { comment = !line.includes('-->'); offset += raw.length; continue; }
      if (delimiter && !(delimiter[1]![0] === '`' && delimiter[2]!.includes('`'))) {
        fence = { character: delimiter[1]![0]!, length: delimiter[1]!.length }; offset += raw.length; continue;
      }
      match = line.match(/^ {0,3}(#{1,6})(?:[ \t]+(.*)|$)/);
      level = match?.[1]?.length ?? 0;
    } else {
      match = line.match(/^([ \t]*)-[ \t]+(\S.*)$/);
      for (const character of match?.[1] ?? '') level += character === '\t' ? 4 - level % 4 : 1;
    }
    if (match) {
      const title = format === 'markdown' ? (match[2] ?? '').replace(/[ \t]+#+[ \t]*$/, '').trim() : match[2]!.trim();
      while (levels.length && levels[levels.length - 1]!.level >= level) {
        const closed = levels.pop()!; nodes[closed.index]!.end = offset;
      }
      const previous = nodes[nodes.length - 1]; if (previous) previous.contentEnd = offset;
      nodes.push({ start: offset, contentStart: offset + raw.length, contentEnd: source.length, end: source.length, title, depth: levels.length, parent: levels.at(-1)?.index ?? null });
      levels.push({ level, index: nodes.length - 1 });
    }
    offset += raw.length;
  }
  return { preambleEnd: nodes[0]?.start ?? source.length, nodes };
}
