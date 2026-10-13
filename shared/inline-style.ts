export function safeColor(value:unknown):value is string{return typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);}
export function safeInlineStyle(value:string):boolean {
 const parts=value.split(';').map(part=>part.trim()).filter(Boolean);
 return parts.length>0&&parts.length<=2&&parts.every(part=>/^(?:color|background-color)\s*:\s*(?:#[0-9a-f]{6}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\))$/i.test(part)&&(!part.toLowerCase().includes('rgb(')||Array.from(part.matchAll(/\d+/g)).every(match=>Number(match[0])<=255)))&&new Set(parts.map(part=>part.split(':')[0].trim())).size===parts.length;
}
