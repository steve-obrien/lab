const { app, BrowserWindow } = require('electron');

function createWindow() {
	const win = new BrowserWindow({
		width: 640,
		height: 480,
		alwaysOnTop: true,
		frame: false,
		transparent: false,
		resizable: true,
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			preload: __dirname + '/preload.js'
		}
	});

	win.loadFile('index.html');

	// Open the DevTools (optional)
	// win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
	// On macOS, it's common for applications to stay open until the user quits explicitly
	if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
	// On macOS, recreate a window when the dock icon is clicked
	if (BrowserWindow.getAllWindows().length === 0) createWindow();
});


const { ipcMain } = require('electron');

ipcMain.on('resize-window', (event, size) => {
	const win = BrowserWindow.fromWebContents(event.sender);
	let width, height;

	if (size === 'small') {
		width = 320;
		height = 240;
	} else if (size === 'medium') {
		width = 640;
		height = 480;
	} else if (size === 'large') {
		width = 1280;
		height = 720;
	}

	win.setSize(width, height);
});