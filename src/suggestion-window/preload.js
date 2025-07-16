const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('suggestionAPI', {
    onReceiveSuggestions: (callback) => ipcRenderer.on('send-suggestions', callback),
    closeWindow: () => ipcRenderer.send('close-suggestion-window'),
    applyFix: (code) => ipcRenderer.send('apply-fix', code) // NOVO
});