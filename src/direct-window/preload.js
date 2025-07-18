const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('directAPI', {
    closeWindow: () => ipcRenderer.send('close-direct-window'),
    sendMessage: (message) => ipcRenderer.invoke('send-direct-message', message),
    onResponse: (callback) => ipcRenderer.on('send-response', callback)
});