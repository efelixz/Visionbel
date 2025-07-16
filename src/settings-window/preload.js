const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('settingsAPI', {
    getSetting: (key) => ipcRenderer.invoke('get-setting', key),
    setSetting: (key, value) => ipcRenderer.invoke('set-setting', { key, value }),
    // NOVO: Funções para prompts customizados
    getCustomPrompts: () => ipcRenderer.invoke('get-custom-prompts'),
    setCustomPrompt: (mode, prompt) => ipcRenderer.invoke('set-custom-prompt', { mode, prompt }),
    resetCustomPrompt: (mode) => ipcRenderer.invoke('reset-custom-prompt', mode),
    getDefaultPrompts: () => ipcRenderer.invoke('get-default-prompts')
});