import { contextBridge, ipcRenderer } from 'electron';
import type { PrototypeApi } from '../shared/contracts';

const api: PrototypeApi = {
  thirdPartyCatalog: () => ipcRenderer.invoke('information:third-party'),
  openInformationLink: target => ipcRenderer.invoke('information:open-link',target),
  updates: { state: () => ipcRenderer.invoke('updates:state'), check: () => ipcRenderer.invoke('updates:check'), install: () => ipcRenderer.invoke('updates:install'), onState: callback => { const listener = (_event: Electron.IpcRendererEvent, state: import('../shared/updates').UpdateState) => callback(state); ipcRenderer.on('updates:state', listener); return () => ipcRenderer.removeListener('updates:state', listener); } },
  editCommand:action=>ipcRenderer.invoke('prototype:edit-command',action),
  uiZoom: percent => ipcRenderer.invoke('prototype:ui-zoom', percent),
  folderBulk:{preview:(folderId,includeChildren)=>ipcRenderer.invoke('folder-bulk:preview',folderId,includeChildren),confirm:(token,mode)=>ipcRenderer.invoke('folder-bulk:confirm',token,mode),cancel:token=>ipcRenderer.invoke('folder-bulk:cancel',token),onProgress:callback=>{const listener=(_event:Electron.IpcRendererEvent,value:import('../shared/batch').BatchProgress)=>callback(value);ipcRenderer.on('folder-bulk:progress',listener);return()=>ipcRenderer.removeListener('folder-bulk:progress',listener);}},
  tasks: {preview:()=>ipcRenderer.invoke('tasks:preview'),confirm:(token,indices,folderId,force)=>ipcRenderer.invoke('tasks:confirm',token,indices,folderId,force),cancel:token=>ipcRenderer.invoke('tasks:cancel',token),onProgress:callback=>{const listener=(_event:Electron.IpcRendererEvent,value:import('../shared/batch').BatchProgress)=>callback(value);ipcRenderer.on('tasks:progress',listener);return()=>ipcRenderer.removeListener('tasks:progress',listener);}},
  ai: { request: input => ipcRenderer.invoke('ai:request', input) },
  writing: { request: input => ipcRenderer.invoke('writing:request', input) },
  onAddonChanged: callback => { const listener = () => callback(); ipcRenderer.on('prototype:addon-changed', listener); return () => ipcRenderer.removeListener('prototype:addon-changed', listener); },
  openDesktopTarget: callback => { const listener = (_event: Electron.IpcRendererEvent, id: string, target: import('../shared/addon').DesktopNoteTarget) => { void callback(target).then(ok => ipcRenderer.send('prototype:open-note-result', id, ok)).catch(() => ipcRenderer.send('prototype:open-note-result', id, false)); }; ipcRenderer.on('prototype:open-note', listener); return () => ipcRenderer.removeListener('prototype:open-note', listener); },
  appPasskeys: action => ipcRenderer.invoke('prototype:passkeys', action),
  dialogs: {
    onRequest: callback => {
      const listener = (_event: Electron.IpcRendererEvent, request: import('../shared/dialog').AppDialog) => callback(request);
      ipcRenderer.on('app-dialog:request', listener);
      return () => ipcRenderer.removeListener('app-dialog:request', listener);
    },
    onDismiss: callback => {
      const listener = (_event: Electron.IpcRendererEvent, id: string) => callback(id);
      ipcRenderer.on('app-dialog:dismiss', listener);
      return () => ipcRenderer.removeListener('app-dialog:dismiss', listener);
    },
    respond: (id, accepted) => ipcRenderer.invoke('app-dialog:respond', id, accepted)
  },
  notifications: {
    state: () => ipcRenderer.invoke('notifications:state'),
    publish: input => ipcRenderer.invoke('notifications:publish', input),
    read: id => ipcRenderer.invoke('notifications:read', id),
    remove: id => ipcRenderer.invoke('notifications:remove', id),
    clear: () => ipcRenderer.invoke('notifications:clear'),
    position: value => ipcRenderer.invoke('notifications:position', value)
  },
  library: {
    onStartupProgress: callback => { const listener = (_event: Electron.IpcRendererEvent, value: import('../shared/startup').StartupProgress) => callback(value); ipcRenderer.on('library:startup-progress', listener); return () => ipcRenderer.removeListener('library:startup-progress', listener); },
    backups: () => ipcRenderer.invoke('library:backups'),
    onBackupStatus: callback => { const listener = (_event: Electron.IpcRendererEvent, value: { ok: boolean; libraryId: string | null }) => callback(value); ipcRenderer.on('library:backup-status', listener); return () => ipcRenderer.removeListener('library:backup-status', listener); },
    configureBackup: (id, enabled, chooseDirectory) => ipcRenderer.invoke('library:configureBackup', id, enabled, chooseDirectory),
    maintenance: (id, action) => ipcRenderer.invoke('library:maintenance', id, action),
    backupProgress: () => ipcRenderer.invoke('library:backupProgress'),
    onBackupProgress: callback => { const listener = (_event: Electron.IpcRendererEvent, value: import('../shared/backup').BackupJob | null) => callback(value); ipcRenderer.on('library:backup-progress', listener); return () => ipcRenderer.removeListener('library:backup-progress', listener); },
    printRecovery: (mode, key) => ipcRenderer.invoke('library:printRecovery', mode, key),
    upgradeLibrary: (id, expected) => ipcRenderer.invoke('library:upgradeLibrary', id, expected),
    security: request => ipcRenderer.invoke('library:security', request),
    encryptedNotes: () => ipcRenderer.invoke('library:encryptedNotes'),
    decryptNotes: credential => ipcRenderer.invoke('library:decryptNotes', credential),
    onDecryptProgress: callback => { const listener = (_event: Electron.IpcRendererEvent, value: import('../shared/security').DecryptProgress) => callback(value); ipcRenderer.on('library:decryptProgress', listener); return () => ipcRenderer.removeListener('library:decryptProgress', listener); },
    securityPreference: value => ipcRenderer.invoke('library:securityPreference', value),
    protectNote: (id, version, encrypted) => ipcRenderer.invoke('library:protectNote', id, version, encrypted),
    noteVisibility: (id, version, visible) => ipcRenderer.invoke('library:noteVisibility', id, version, visible),
    onSecurityLocked: callback => { const listener = () => callback(); ipcRenderer.on('library:locked', listener); return () => ipcRenderer.removeListener('library:locked', listener); },
    cleanHistory: (id, version, retain, op) => ipcRenderer.invoke('library:cleanHistory', id, version, retain, op),
    trashNote: (id, version, op) => ipcRenderer.invoke('library:trashNote', id, version, op),
    restoreNote: (id, version, op) => ipcRenderer.invoke('library:restoreNote', id, version, op),
    purgeNote: (id, version, op) => ipcRenderer.invoke('library:purgeNote', id, version, op),
    history: (id, offset) => ipcRenderer.invoke('library:history', id, offset),
    revision: (id, revision) => ipcRenderer.invoke('library:revision', id, revision),
    restoreRevision: (id, revision, version, op) => ipcRenderer.invoke('library:restoreRevision', id, revision, version, op),
    deleteOrganization: (kind, id, version) => ipcRenderer.invoke('library:deleteOrganization', kind, id, version),
    attachments: noteId => ipcRenderer.invoke('library:attachments', noteId),
    addAttachment: request => ipcRenderer.invoke('library:addAttachment', request),
    unlinkAttachment: (request, id) => ipcRenderer.invoke('library:unlinkAttachment', request, id),
    renameAttachment: (request, id, name) => ipcRenderer.invoke('library:renameAttachment', request, id, name),
    previewAttachment: (noteId, id) => ipcRenderer.invoke('library:previewAttachment', noteId, id),
    exportAttachment: (noteId, id) => ipcRenderer.invoke('library:exportAttachment', noteId, id),
    previewLibraryImport: credential => ipcRenderer.invoke('library:previewImport', credential),
    cancelLibraryImport: () => ipcRenderer.invoke('library:cancelImport'),
    confirmLibraryImport: token => ipcRenderer.invoke('library:confirmImport', token),
    organization: () => ipcRenderer.invoke('library:organization'),
    editOrganization: input => ipcRenderer.invoke('library:editOrganization', input),
    place: request => ipcRenderer.invoke('library:place', request),
    query: input => ipcRenderer.invoke('library:query', input),
    settings: legacy => ipcRenderer.invoke('library:settings', legacy),
    updateSettings: patch => ipcRenderer.invoke('library:updateSettings', patch),
    librarySettings: (id, value) => ipcRenderer.invoke('library:librarySettings', id, value),
    registry: () => ipcRenderer.invoke('library:registry'),
    chooseNotebookCover: id => ipcRenderer.invoke('library:chooseNotebookCover', id),
    setNotebookAppearance: (id, value) => ipcRenderer.invoke('library:setNotebookAppearance', id, value),
    register: mode => ipcRenderer.invoke('library:register', mode),
    activate: id => ipcRenderer.invoke('library:activate', id),
    rename: (id, name) => ipcRenderer.invoke('library:rename', id, name),
    relocate: id => ipcRenderer.invoke('library:relocate', id),
    remove: id => ipcRenderer.invoke('library:remove', id),
    status: () => ipcRenderer.invoke('library:status'),
    list: () => ipcRenderer.invoke('library:list'),
    create: (operationId, input) => ipcRenderer.invoke('library:create', operationId, input),
    duplicate:(request,title)=>ipcRenderer.invoke('library:duplicate',request,title),
    importFile: () => ipcRenderer.invoke('library:importFile'),
    exportFile: input => ipcRenderer.invoke('library:exportFile', input),
    begin: noteId => ipcRenderer.invoke('library:begin', noteId),
    end: (token, generation) => ipcRenderer.invoke('library:end', token, generation),
    save: request => ipcRenderer.invoke('library:save', request),
    rebuild: () => ipcRenderer.invoke('library:rebuild'),
    onExit: callback => {
      const listener = async (_event: Electron.IpcRendererEvent, id: string, command: import('../shared/dialog').ExitCommand) => { let state: import('../shared/dialog').ExitState | null = null; try { state = await callback(command); } finally { ipcRenderer.send('library:exit-result', id, state); } };
      ipcRenderer.on('library:flush-exit', listener);
      return () => ipcRenderer.removeListener('library:flush-exit', listener);
    }
  },
  runtime: () => ipcRenderer.invoke('prototype:runtime'),
  probe: () => ipcRenderer.invoke('prototype:sqlite'),
  hide: () => ipcRenderer.invoke('prototype:hide'),
  editorFullscreen: enabled => ipcRenderer.invoke('prototype:editor-fullscreen', enabled),
  quit: () => ipcRenderer.invoke('prototype:quit')
};
contextBridge.exposeInMainWorld('notebookAid', api);

let lastActivity = 0;
for (const event of ['pointerdown', 'pointermove', 'keydown', 'wheel']) window.addEventListener(event, input => {
  if (input.isTrusted && Date.now() - lastActivity > 1000) { lastActivity = Date.now(); ipcRenderer.send('library:activity'); }
}, { passive: true });
