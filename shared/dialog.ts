export interface AppDialog {
  id: string;
  title: string;
  message: string;
  detail?: string;
  cancelLabel: string;
  confirmLabel: string;
  discardLabel?: string;
  kind: 'info' | 'warning';
}
export interface DialogApi {
  onRequest(callback: (request: AppDialog) => void): () => void;
  onDismiss(callback: (id: string) => void): () => void;
  respond(id: string, accepted: DialogAnswer): Promise<void>;
}

export type DialogAnswer = boolean | 'discard';
export type ExitCommand = 'inspect' | 'save' | 'resume';
export interface ExitState { dirty: boolean; busy: boolean; saved: boolean; }
