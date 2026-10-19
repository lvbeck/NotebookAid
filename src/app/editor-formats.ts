import Quill from 'quill';
import Image from 'quill/formats/image';
import { BlockEmbed } from 'quill/blots/block';
import Embed from 'quill/blots/embed';
import { formulaHtml } from '../../shared/math-render';
import { mathMarkup } from '../../shared/math-source';
import { Attributor, Scope } from 'parchment';

export const codeLanguages = ['plain', 'python', 'javascript', 'typescript', 'json', 'bash', 'css', 'xml', 'sql', 'java', 'cpp', 'csharp', 'markdown'];
export function safeImage(value: string): boolean {
  return /^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(value) || /^(?:https?:\/\/|\.{0,2}\/|#)/i.test(value) || /^[\w-][^:<>]*$/.test(value);
}
const placeholder = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="64"><rect width="240" height="64" fill="#393447"/><text x="12" y="37" fill="#ddd" font-size="14">Image (offline)</text></svg>');
export class NoteImage extends Image {
  static override create(value: string): Element {
    const node = document.createElement('img');
    const source = safeImage(value) ? value : '';
    node.setAttribute('data-note-src', source);
    node.setAttribute('src', /^data:image\/(png|jpeg|gif|webp);base64,/i.test(source) ? source : placeholder);
    return node;
  }
  static override value(node: Element): string { return node.getAttribute('data-note-src') ?? node.getAttribute('src') ?? ''; }
  static override formats(node: Element): Record<string, string | null> { return { ...super.formats(node), ...(node.hasAttribute('title') ? { title: node.getAttribute('title') } : {}) }; }
  override format(name: string, value: string): void {
    if (name === 'title') { if (value) this.domNode.setAttribute(name, value); else this.domNode.removeAttribute(name); }
    else super.format(name, value);
  }
  html(): string {
    const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let attributes = ` src="${escape(NoteImage.value(this.domNode))}"`;
    for (const name of ['alt', 'title', 'width', 'height']) if (this.domNode.hasAttribute(name)) attributes += ` ${name}="${escape(this.domNode.getAttribute(name)!)}"`;
    return `<img${attributes}>`;
  }
}
export class NoteDivider extends BlockEmbed {
  static override blotName = 'divider';
  static override tagName = 'HR';
  static override value(): boolean { return true; }
  html(): string { return '<hr>'; }
}
function populateMath(node: HTMLElement, source: string): void {
  node.setAttribute('data-note-math', source); node.setAttribute('contenteditable', 'false'); node.setAttribute('tabindex', '0'); node.setAttribute('role', 'button');
  try { node.innerHTML = formulaHtml(source); } catch { node.textContent = source; node.classList.add('math-invalid'); }
}
export class NoteMath extends Embed {
  static override blotName = 'note-math'; static override tagName = 'SPAN'; static override className = 'ql-note-math';
  static override create(source: string): HTMLElement { const node = super.create() as HTMLElement; populateMath(node, source); return node; }
  static override value(node: HTMLElement): string { return node.getAttribute('data-note-math') ?? ''; }
  html(): string { return mathMarkup(NoteMath.value(this.domNode as HTMLElement), false); }
}
export class NoteMathBlock extends BlockEmbed {
  static override blotName = 'note-math-block'; static override tagName = 'DIV'; static override className = 'ql-note-math-block';
  static override create(source: string): HTMLElement { const node = super.create() as HTMLElement; populateMath(node, source); return node; }
  static override value(node: HTMLElement): string { return node.getAttribute('data-note-math') ?? ''; }
  html(): string { return '<p>' + mathMarkup(NoteMathBlock.value(this.domNode), true) + '</p>'; }
}
export function registerNoteFormats(): void {
  Quill.register(NoteMath, true); Quill.register(NoteMathBlock, true);
  Quill.register(NoteDivider, true);
  Quill.register('formats/image', NoteImage, true);
  Quill.register(new Attributor('cell-header', 'data-cell-header', { scope: Scope.BLOCK, whitelist: ['true'] }), true);
  Quill.register(new Attributor('cell-align', 'data-cell-align', { scope: Scope.BLOCK, whitelist: ['left', 'center', 'right'] }), true);
}
