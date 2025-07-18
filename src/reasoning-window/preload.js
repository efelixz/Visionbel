const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('reasoningAPI', {
    // Controles da janela
    closeWindow: () => ipcRenderer.send('close-reasoning-window'),
    minimizeWindow: () => ipcRenderer.send('minimize-reasoning-window'),
    moveWindow: () => ipcRenderer.send('move-reasoning-window'),
    
    // Eventos de raciocínio
    onReceiveReasoning: (callback) => ipcRenderer.on('send-reasoning', callback),
    applyReasoning: (reasoning) => ipcRenderer.send('apply-reasoning', reasoning),
    copyReasoning: (text) => ipcRenderer.send('copy-reasoning', text),
    
    // Eventos de atualização de passos
    onReasoningStep: (callback) => ipcRenderer.on('reasoning-step', callback),
    onReasoningComplete: (callback) => ipcRenderer.on('reasoning-complete', callback),
    
    // Limpeza de eventos
    removeReasoningStepListener: (callback) => ipcRenderer.removeListener('reasoning-step', callback),
    removeReasoningCompleteListener: (callback) => ipcRenderer.removeListener('reasoning-complete', callback)
});