import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('browser', {
  runtime: { sendMessage: (request: unknown) => ipcRenderer.invoke('addon-test:request', request), onMessage: { addListener: () => {} } },
  storage: { local: { get: (key: string) => ipcRenderer.invoke('addon-test:storage', 'get', key), set: (value: unknown) => ipcRenderer.invoke('addon-test:storage', 'set', value) } }
});
