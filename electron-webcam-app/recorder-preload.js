const { contextBridge, ipcRenderer, desktopCapturer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
	send: (channel, data) => {
		const validChannels = ['save-recording'];
		if (validChannels.includes(channel)) {
			ipcRenderer.send(channel, data);
		}
	},
	on: (channel, callback) => {
		const validChannels = ['stop-recording'];
		if (validChannels.includes(channel)) {
			ipcRenderer.on(channel, (event, args) => callback(args));
		}
	},
	getSources: async (opts) => {
		return await desktopCapturer.getSources(opts);
	}
});