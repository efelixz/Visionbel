const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('autocorrection', {
    minimize: () => ipcRenderer.send('minimize-autocorrection-window'),
    close: () => ipcRenderer.send('close-autocorrection-window'),
    onCorrections: (callback) => {
        ipcRenderer.on('send-corrections', (event, data) => callback(data));
    }
});
contextBridge.exposeInMainWorld('electronAPI', {
    onDisplayCorrections: (callback) => ipcRenderer.on('display-corrections', callback),
    onCorrectionError: (callback) => ipcRenderer.on('correction-error', callback),
    onProcessingStart: (callback) => ipcRenderer.on('processing-start', callback)
});