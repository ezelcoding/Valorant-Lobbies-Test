const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  pythonInvoke: (channel, data) =>
    ipcRenderer.invoke('python:invoke', { channel, data }),

  selectFiles: (filters) =>
    ipcRenderer.invoke('dialog:selectFiles', filters),

  selectDirectory: () =>
    ipcRenderer.invoke('dialog:selectDirectory'),

  openExternal: (url) =>
    ipcRenderer.invoke('shell:openExternal', url),

  getDataPath: () =>
    ipcRenderer.invoke('app:getDataPath'),

  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),

  onPythonEvent: (channel, callback) => {
    const subscription = (_event, data) => callback(data)
    ipcRenderer.on(`python:event:${channel}`, subscription)
    return () => ipcRenderer.removeListener(`python:event:${channel}`, subscription)
  },
})
