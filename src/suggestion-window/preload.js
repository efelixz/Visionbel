const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('suggestionAPI', {
    onReceiveSuggestions: (callback) => ipcRenderer.on('send-suggestions', callback),
    closeWindow: () => ipcRenderer.send('close-suggestion-window'),
    applyFix: (code) => ipcRenderer.send('apply-fix', code),
    sendAdditionalContext: (context) => ipcRenderer.send('send-additional-context', context),
    requestNewCapture: () => ipcRenderer.send('request-new-capture'),
    setPinned: (pinned) => ipcRenderer.send('set-suggestion-pinned', pinned),
    moveWindow: () => ipcRenderer.send('move-suggestion-window'),
    minimizeWindow: () => ipcRenderer.send('minimize-suggestion-window'),
    // Eventos para chat e verificação de contexto
    onChatLoading: (callback) => ipcRenderer.on('chat-loading', callback),
    onChatResponse: (callback) => ipcRenderer.on('chat-response', callback),
    onShowInteractionArea: (callback) => ipcRenderer.on('show-interaction-area', callback),
    // Métodos para remover listeners (para limpeza)
    removeChatLoadingListener: (callback) => ipcRenderer.removeListener('chat-loading', callback),
    removeChatResponseListener: (callback) => ipcRenderer.removeListener('chat-response', callback),
    removeShowInteractionListener: (callback) => ipcRenderer.removeListener('show-interaction-area', callback),
    // Função para enviar mensagens de chat
    sendChatMessage: (prompt) => ipcRenderer.invoke('send-chat-message', prompt)
});