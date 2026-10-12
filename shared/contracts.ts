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
  dialogs: import('./dialog').DialogApi;
  notifications: import('./notifications').NotificationApi;
  library: import('./library').LibraryApi;
  runtime(): Promise<RuntimeInfo>;
  probe(): Promise<ProbeResult>;
  hide(): Promise<void>;
  editorFullscreen(enabled: boolean): Promise<void>;
  quit(): Promise<void>;
}
