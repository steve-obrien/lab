const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
	resizeWindow: (size) => ipcRenderer.send('resize-window', size),
	toggleShape: (shape) => ipcRenderer.send('toggle-shape', shape),
	closeWindow: () => ipcRenderer.send('close-window'),
});
