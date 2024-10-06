const { app, BrowserWindow } = require('electron');
const path = require('path');


let webcamWindow;
function createWebcamWindow() {
	webcamWindow = new BrowserWindow({
		width: 320,
		height: 240,
		alwaysOnTop: true,
		resizable: true,
		frame: true,
		transparent: true,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			nodeIntegration: false,
			contextIsolation: true,
		},
	});

	// if (process.env.NODE_ENV === 'development') {
	// 	webcamWindow.loadURL('http://localhost:3000/webcam.html');
	// } else {
		webcamWindow.loadFile(path.join(__dirname, '../renderer/webcam.html'));
	// }

	webcamWindow.on('closed', () => {
		webcamWindow = null;
	});
}


function createMainWindow() {
	const mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			nodeIntegration: false,
			contextIsolation: true,
		},
	});

	if (!process.env.NODE_ENV) {
		process.env.NODE_ENV = 'development'; // or 'production' based on your needs
	}
	console.log(process.env.NODE_ENV);

	// if (process.env.NODE_ENV === 'development') {
	// 	mainWindow.loadURL('http://localhost:3000/index.html');
	// } else {
		mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
	// }

	if (process.env.NODE_ENV === 'development') {
		mainWindow.webContents.openDevTools();
	}

	createWebcamWindow();
}

app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
	app.quit();
});
