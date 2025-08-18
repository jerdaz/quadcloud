const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  setAudioOutput: (index, deviceId) => ipcRenderer.invoke('set-audio-output', { index, deviceId }),
  setController: (index, controller) => ipcRenderer.invoke('set-controller', { index, controller })
});
