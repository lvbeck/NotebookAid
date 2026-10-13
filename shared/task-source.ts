export interface TaskSource {
  version: 1;
  uid: string;
  fields: Record<string, string>;
}
export const taskFieldNames = ['status','priority','percent-complete','dtstart','due','completed','duration','categories','location','url','rrule','rdate','exdate','recurrence-id','sequence','created','last-modified'] as const;
export function validateTaskSource(value: unknown): asserts value is TaskSource {
  const source = value as TaskSource;
  if (!source || typeof source !== 'object' || Array.isArray(source) || Object.keys(source).some(key => !['version','uid','fields'].includes(key)) || source.version !== 1 || typeof source.uid !== 'string' || !source.uid.trim() || source.uid.length > 1024 || /[\r\n\0]/.test(source.uid) || !source.fields || typeof source.fields !== 'object' || Array.isArray(source.fields)) throw Error('INVALID_INPUT');
  for (const [key, text] of Object.entries(source.fields)) if (!(taskFieldNames as readonly string[]).includes(key) || typeof text !== 'string' || text.length > 10000 || text.includes('\0')) throw Error('INVALID_INPUT');
}
