const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  onWindowStateChanged: (callback) => {
    ipcRenderer.on('window-state-changed', (_event, isMaximized) => callback(isMaximized))
  },
  isElectron: true
})
