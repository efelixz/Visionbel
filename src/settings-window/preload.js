const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('settingsAPI', {
    getSetting: (key) => ipcRenderer.invoke('get-setting', key),
    setSetting: (key, value) => ipcRenderer.invoke('set-setting', { key, value }),
    getCustomPrompts: () => ipcRenderer.invoke('get-custom-prompts'),
    setCustomPrompt: (mode, prompt) => ipcRenderer.invoke('set-custom-prompt', { mode, prompt }),
    resetCustomPrompt: (mode) => ipcRenderer.invoke('reset-custom-prompt', mode),
    getDefaultPrompts: () => ipcRenderer.invoke('get-default-prompts'),
    // Novas funções para API
    getApiSettings: () => ipcRenderer.invoke('get-api-settings'),
    setApiSettings: (settings) => ipcRenderer.invoke('set-api-settings', settings),
    testApiKey: (settings) => ipcRenderer.invoke('test-api-key', settings)
});