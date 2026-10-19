import type { SaveRequest } from './library';
export interface Folder { id: string; name: string; parentId: string | null; order?: number; }
export interface Tag { id: string; name: string; color: string; thunderbird?: { profileId: string; key: string; missing: boolean }; }
export interface Organization { schemaVersion: 1; version: number; folders: Folder[]; tags: Tag[]; }
export type OrganizationEditInput = { kind: 'folder' | 'tag'; id: string; name: string; parentId?: string | null; color?: string } | { kind: 'folder-order'; ids: string[] };
export type OrganizationEdit = OrganizationEditInput & { expectedVersion: number };
export interface NotePlacement { folderId: string | null; tagIds: string[]; pinned: boolean; }
export interface PlacementRequest extends Pick<SaveRequest, 'noteId' | 'token' | 'generation' | 'expectedVersion' | 'operationId'>, NotePlacement {}
export interface NoteQuery { text?: string; keywords?: string[]; matchMode?: 'AND' | 'OR'; folderId?: string | null; includeDescendants?: boolean; tagIds?: string[]; view?: 'all' | 'pinned' | 'recent' | 'trash'; offset?: number; limit?: number; }
