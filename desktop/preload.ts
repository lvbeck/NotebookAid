import { contextBridge, ipcRenderer } from 'electron';
import type { PrototypeApi } from '../shared/contracts';

const api: PrototypeApi = {
  notifications: {
    state: () => ipcRenderer.invoke('notifications:state'),
    publish: input => ipcRenderer.invoke('notifications:publish', input),
    read: id => ipcRenderer.invoke('notifications:read', id),
    remove: id => ipcRenderer.invoke('notifications:remove', id),
    clear: () => ipcRenderer.invoke('notifications:clear'),
    position: value => ipcRenderer.invoke('notifications:position', value)
  },
  library: {
    attachments: noteId => ipcRenderer.invoke('library:attachments', noteId),
    addAttachment: request => ipcRenderer.invoke('library:addAttachment', request),
    unlinkAttachment: (request, id) => ipcRenderer.invoke('library:unlinkAttachment', request, id),
    renameAttachment: (request, id, name) => ipcRenderer.invoke('library:renameAttachment', request, id, name),
    previewAttachment: (noteId, id) => ipcRenderer.invoke('library:previewAttachment', noteId, id),
    exportAttachment: (noteId, id) => ipcRenderer.invoke('library:exportAttachment', noteId, id),
    previewLibraryImport: () => ipcRenderer.invoke('library:previewImport'),
    confirmLibraryImport: token => ipcRenderer.invoke('library:confirmImport', token),
    organization: () => ipcRenderer.invoke('library:organization'),
    editOrganization: input => ipcRenderer.invoke('library:editOrganization', input),
    place: request => ipcRenderer.invoke('library:place', request),
    query: input => ipcRenderer.invoke('library:query', input),
    settings: legacy => ipcRenderer.invoke('library:settings', legacy),
    updateSettings: patch => ipcRenderer.invoke('library:updateSettings', patch),
    librarySettings: (id, value) => ipcRenderer.invoke('library:librarySettings', id, value),
    registry: () => ipcRenderer.invoke('library:registry'),
    register: mode => ipcRenderer.invoke('library:register', mode),
    activate: id => ipcRenderer.invoke('library:activate', id),
    rename: (id, name) => ipcRenderer.invoke('library:rename', id, name),
    relocate: id => ipcRenderer.invoke('library:relocate', id),
    remove: id => ipcRenderer.invoke('library:remove', id),
    status: () => ipcRenderer.invoke('library:status'),
    list: () => ipcRenderer.invoke('library:list'),
    create: (operationId, input) => ipcRenderer.invoke('library:create', operationId, input),
    importFile: () => ipcRenderer.invoke('library:importFile'),
    exportFile: input => ipcRenderer.invoke('library:exportFile', input),
    begin: noteId => ipcRenderer.invoke('library:begin', noteId),
    end: (token, generation) => ipcRenderer.invoke('library:end', token, generation),
    save: request => ipcRenderer.invoke('library:save', request),
    rebuild: () => ipcRenderer.invoke('library:rebuild'),
    onExit: callback => {
      const listener = async () => { let saved = false; try { saved = await callback(); } finally { ipcRenderer.send('library:exit-result', saved); } };
      ipcRenderer.on('library:flush-exit', listener);
      return () => ipcRenderer.removeListener('library:flush-exit', listener);
    }
  },
  runtime: () => ipcRenderer.invoke('prototype:runtime'),
  probe: () => ipcRenderer.invoke('prototype:sqlite'),
  hide: () => ipcRenderer.invoke('prototype:hide'),
  quit: () => ipcRenderer.invoke('prototype:quit')
};
contextBridge.exposeInMainWorld('notebookAid', api);
