const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('settingsAPI', {
    getSetting: (key) => ipcRenderer.invoke('get-setting', key),
    setSetting: (key, value) => ipcRenderer.invoke('set-setting', { key, value }),
    testApiKey: (provider, apiKey, model) => ipcRenderer.invoke('test-api-key', { 
        provider, 
        key: apiKey, 
        model 
    }),
     getAvailableProviders: () => ipcRenderer.invoke('get-available-providers')
});

