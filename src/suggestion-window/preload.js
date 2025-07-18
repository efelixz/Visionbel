const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('suggestion', {
    minimize: () => ipcRenderer.send('minimize-suggestion-window'),
    close: () => ipcRenderer.send('close-suggestion-window'),
    onSuggestions: (callback) => {
        ipcRenderer.on('send-suggestions', (event, data) => callback(data));
    },
    applySuggestion: (suggestion) => ipcRenderer.send('apply-suggestion', suggestion),
    copySuggestion: (suggestion) => ipcRenderer.send('copy-suggestion', suggestion)
});

contextBridge.exposeInMainWorld('electronAPI', {
    onDisplaySuggestions: (callback) => ipcRenderer.on('display-suggestions', callback),
    onSuggestionError: (callback) => ipcRenderer.on('suggestion-error', callback),
    onProcessingStart: (callback) => ipcRenderer.on('processing-start', callback),
    onChatMessage: (callback) => ipcRenderer.on('chat-message', callback),
    sendChatMessage: (message) => ipcRenderer.send('send-chat-message', message),
    requestNewCapture: () => ipcRenderer.send('request-new-capture')
});