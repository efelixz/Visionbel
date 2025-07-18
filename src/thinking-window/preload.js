const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('windowAPI', {
    closeWindow: () => ipcRenderer.send('window-action', { action: 'close' }),
    minimizeWindow: () => ipcRenderer.send('window-action', { action: 'minimize' }),
    moveWindow: (position) => ipcRenderer.send('move-thinking-window', position)
});