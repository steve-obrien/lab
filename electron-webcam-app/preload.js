const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
	resizeWindow: (size) => ipcRenderer.send('resize-window', size)
});