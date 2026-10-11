export const attachmentLimit = 20 * 1024 * 1024;
export interface Attachment { id: string; name: string; size: number; sha256: string; mediaType: string; }
export interface AttachmentRequest { noteId: string; token: string; generation: string; expectedVersion: number; operationId: string; }
export interface AttachmentView extends Attachment { available: boolean; }
export interface AttachmentPreview { removedUnsafeSvg?: number; mediaType: string; dataUrl?: string; text?: string; }
