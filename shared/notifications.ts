export const notificationTypes = {
  importComplete: 'success',
  htmlCleaned: 'warning',
  saveSuccess: 'success', savedIndexPending: 'warning', settingsSaved: 'success', settingsFailed: 'error',
  rebuildSuccess: 'success', rebuildPartial: 'warning', rebuildFailed: 'error', operationFailed: 'error',
  libraryOpened: 'info', noteCreated: 'success', sqliteSuccess: 'success', sqliteFailed: 'error'
} as const;
export type NotificationCode = keyof typeof notificationTypes;
export type NotificationType = 'success' | 'info' | 'warning' | 'error';
export const notificationPositions = ['bottom-right', 'bottom-left', 'top-right', 'top-left'] as const;
export type NotificationPosition = typeof notificationPositions[number];
export const notificationOperations = ['save', 'open', 'create', 'rebuild', 'settings', 'diagnostic'] as const;
export type NotificationOperation = typeof notificationOperations[number];
export const notificationErrorCodes = ['INVALID_INPUT', 'WRITE_FAILED', 'INTEGRITY_CHECK_FAILED', 'VERSION_CONFLICT', 'SESSION_EXPIRED', 'NOTE_IN_USE', 'LIBRARY_IN_USE', 'NOT_FOUND_OR_UNAVAILABLE', 'COMMIT_STATUS_UNKNOWN'] as const;
export interface NotificationInput {
  code: NotificationCode;
  operation: NotificationOperation;
  libraryId?: string | null;
  errorCode?: typeof notificationErrorCodes[number] | null;
}
export interface NotificationRecord extends NotificationInput {
  id: string;
  type: NotificationType;
  createdAt: number;
  updatedAt: number;
  count: number;
  read: boolean;
}
export interface NotificationState { records: NotificationRecord[]; position: NotificationPosition; }
export type NotificationResult<T> = { ok: true; value: T } | { ok: false; code: 'INVALID_INPUT' | 'NOTIFICATION_STORAGE_UNAVAILABLE' };
export interface NotificationApi {
  state(): Promise<NotificationResult<NotificationState>>;
  publish(input: NotificationInput): Promise<NotificationResult<{ state: NotificationState; record: NotificationRecord; merged: boolean }>>;
  read(id: string | null): Promise<NotificationResult<NotificationState>>;
  remove(id: string): Promise<NotificationResult<NotificationState>>;
  clear(): Promise<NotificationResult<NotificationState>>;
  position(value: NotificationPosition): Promise<NotificationResult<NotificationState>>;
}
