const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('suggestionAPI', {
    closeSuggestionWindow: () => ipcRenderer.send('close-suggestion-window'),
    sendMessage: (message) => ipcRenderer.invoke('send-message', message),
    onSuggestions: (callback) => ipcRenderer.on('send-suggestions', callback)
});