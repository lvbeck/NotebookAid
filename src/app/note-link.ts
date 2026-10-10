import Link from 'quill/formats/link';

/** Validate relative URLs against a web base instead of Electron's file URL. */
export class NoteLink extends Link {
  static override sanitize(value: string): string {
    try {
      const url = new URL(value, 'https://notebookaid.invalid/');
      return ['http:', 'https:', 'mailto:', 'tel:', 'sms:'].includes(url.protocol) ? value : Link.SANITIZED_URL;
    } catch { return Link.SANITIZED_URL; }
  }
}
