const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startFullFlow: (mode) => ipcRenderer.invoke('start-full-flow', mode),
  openHistoryWindow: () => ipcRenderer.send('open-history-window'),
  openSettingsWindow: () => ipcRenderer.send('open-settings-window'),
  toggleAssistantWindow: () => ipcRenderer.send('toggle-assistant-window'),
  getSetting: (key) => ipcRenderer.invoke('get-setting', key),
  onStartCapture: (callback) => ipcRenderer.on('start-capture-from-main', callback),
  // NOVO: Funções para controle de análise
  cancelAnalysis: () => ipcRenderer.invoke('cancel-analysis'),
  getAnalysisState: () => ipcRenderer.invoke('get-analysis-state'),
  onAnalysisStateChanged: (callback) => ipcRenderer.on('analysis-state-changed', callback),
  // NOVO: Função para definir o modo selecionado
  setMode: (mode) => ipcRenderer.invoke('set-mode', mode),
  getSelectedMode: () => ipcRenderer.invoke('get-selected-mode')
});