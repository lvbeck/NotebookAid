export interface ProbeResult {
  value: string;
  writes: number;
  sqliteVersion: string;
  integrity: string;
}

export interface RuntimeInfo {
  version: string;
  electron: string;
  node: string;
  chrome: string;
  platform: string;
  dataPath: string;
  packaged: boolean;
  pid: number;
}

export interface PrototypeApi {
  ai: import('./ai').AiApi;
  appPasskeys(action: 'status' | 'enable' | 'unlock' | 'disable' | 'lock'): Promise<{ enabled: boolean; locked: boolean; count: number; supported: boolean; locale: string; theme: 'system' | 'light' | 'dark'; error?: string }>;
  onAddonChanged(callback: () => void): () => void;
  openDesktopTarget(callback: (target: import('./addon').DesktopNoteTarget) => Promise<boolean>): () => void;
  dialogs: import('./dialog').DialogApi;
  notifications: import('./notifications').NotificationApi;
  library: import('./library').LibraryApi;
  runtime(): Promise<RuntimeInfo>;
  probe(): Promise<ProbeResult>;
  hide(): Promise<void>;
  editorFullscreen(enabled: boolean): Promise<void>;
  quit(): Promise<void>;
}
