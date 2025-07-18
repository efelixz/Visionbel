const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('windowAPI', {
    closeWindow: () => ipcRenderer.send('window-action', { action: 'close' }),
    minimizeWindow: () => ipcRenderer.send('window-action', { action: 'minimize' }),
    sendMessage: (message) => ipcRenderer.invoke('window-message', { type: 'ethical', message }),
    onMessage: (callback) => ipcRenderer.on('window-update', callback)
});

contextBridge.exposeInMainWorld('ethicalAPI', {
    closeWindow: () => ipcRenderer.send('close-ethical-window'),
    sendMessage: (message) => ipcRenderer.invoke('send-ethical-message', message),
    onGuidance: (callback) => ipcRenderer.on('send-guidance', callback)
});