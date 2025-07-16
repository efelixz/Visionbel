const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('floatingButtonAPI', {
    buttonClicked: () => ipcRenderer.send('floating-button-clicked'),
    setPosition: (x, y) => ipcRenderer.send('set-floating-position', { x, y }),
    getCurrentPosition: () => ipcRenderer.invoke('get-floating-position'),
    getScreenBounds: () => ipcRenderer.invoke('get-screen-bounds')
});