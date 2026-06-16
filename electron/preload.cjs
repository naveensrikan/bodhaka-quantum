const { contextBridge, ipcRenderer } = require('electron')

// The only surface the UI can touch. No Node, no filesystem, no token ever reaches the renderer.
contextBridge.exposeInMainWorld('summit', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (cfg) => ipcRenderer.invoke('config:save', cfg),
  run: (code, target) => ipcRenderer.invoke('run', { code, target }),
  getStats: () => ipcRenderer.invoke('stats:get'),
  getHistory: () => ipcRenderer.invoke('history:get'),
  getNotice: () => ipcRenderer.invoke('notice:get'),
  agreeNotice: () => ipcRenderer.invoke('notice:agree'),
  getStorage: () => ipcRenderer.invoke('storage:get'),
  chooseStorage: () => ipcRenderer.invoke('storage:choose'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
})
