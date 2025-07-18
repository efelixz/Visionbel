const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('autocorrectionAPI', {
    closeWindow: () => ipcRenderer.send('close-autocorrection-window'),
    sendMessage: (message) => ipcRenderer.invoke('send-autocorrection-message', message),
    onCorrections: (callback) => ipcRenderer.on('send-corrections', callback)
});