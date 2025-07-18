const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('reasoningAPI', {
    closeWindow: () => ipcRenderer.send('close-reasoning-window'),
    sendMessage: (message) => ipcRenderer.invoke('send-reasoning-message', message),
    onAnalysis: (callback) => ipcRenderer.on('send-analysis', callback)
});