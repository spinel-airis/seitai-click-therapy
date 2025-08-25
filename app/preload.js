const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('native', {
  readText: (relPath) => ipcRenderer.invoke('readText', relPath)
});