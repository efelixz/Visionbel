const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('historyAPI', {
  getAllHistory: () => ipcRenderer.invoke('get-all-history'),
  getModeStats: () => ipcRenderer.invoke('get-mode-stats'),
  // NOVOS: Métodos para deletar
  deleteHistoryItem: (id) => ipcRenderer.invoke('delete-history-item', id),
  deleteMultipleItems: (ids) => ipcRenderer.invoke('delete-multiple-history-items', ids),
  clearAllHistory: () => ipcRenderer.invoke('clear-all-history'),
  deleteOlderThan: (date) => ipcRenderer.invoke('delete-history-older-than', date)
});