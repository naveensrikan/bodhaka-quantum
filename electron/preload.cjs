const { contextBridge, ipcRenderer } = require('electron')

// The only surface the UI can touch. No Node, no direct filesystem, no token leaks.
contextBridge.exposeInMainWorld('summit', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (cfg) => ipcRenderer.invoke('config:save', cfg),
  run: (code, target) => ipcRenderer.invoke('run', { code, target }),
  getStats: () => ipcRenderer.invoke('stats:get'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
})
