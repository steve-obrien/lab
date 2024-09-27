const activeWin = require('active-win');
const fs = require('fs');

let currentWindow = null;
let lastWindow = null;
let startTime = new Date();

function formatDuration(durationInSeconds) {
	const hours = Math.floor(durationInSeconds / 3600);
	const minutes = Math.floor((durationInSeconds % 3600) / 60);
	const seconds = durationInSeconds % 60;

	return [
		hours > 0 ? `${hours}h` : '',
		minutes > 0 ? `${minutes}m` : '',
		`${seconds.toFixed(0)}s`
	].filter(Boolean).join(' ');
}

function formatDate(date) {
	const options = { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
	return date.toLocaleString('en-US', options).replace(/,/, '');
}
function logFocusTime(window) {
	const now = new Date();
	const focusDurationInSeconds = (now - startTime) / 1000; // Time in seconds
	const focusTimeFormatted = formatDuration(focusDurationInSeconds);
	const logEntry = `${formatDate(startTime)}: ${window.title} (${window.owner.name}) was in focus for ${focusTimeFormatted}\n`;
	console.log(logEntry)
	fs.appendFileSync('./focus_log.txt', logEntry);
}

async function checkActiveWindow() {
	try {
		currentWindow = await activeWin();
		if (!lastWindow || currentWindow.title !== lastWindow.title) {
			if (lastWindow) {
				logFocusTime(lastWindow);
			}
			startTime = new Date();
			lastWindow = currentWindow;
		}
	} catch (error) {
		console.error('Error:', error);
	}
}

// Check active window every 5 seconds
setInterval(checkActiveWindow, 1000);