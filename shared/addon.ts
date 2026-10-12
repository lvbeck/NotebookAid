export const addonProtocolVersion = 1;
export interface ThunderbirdTag { key: string; name: string; color: string; }
export interface AddonRequest { method: string; protocolVersion?: number; libraryId?: string; params?: Record<string, unknown>; }
export interface DesktopNoteTarget { libraryId: string; noteId: string; }
