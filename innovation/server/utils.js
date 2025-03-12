export class HttpError extends Error {
	constructor(status, message = 'Error') {
		super(message);
		this.status = status;
		this.timestamp = new Date().toISOString();
		this.logError(); // Automatically log error when created
	}

	logError() {
		const logMessage = `[${this.timestamp}] ERROR ${this.status}: ${this.message}\n`;
		console.error(logMessage);
		// Write to a log file (optional)
		//fs.appendFileSync(path.join(__dirname, 'error.log'), logMessage);
	}
}

// Global abort function
export function abort(status = 404, message = 'Not Found') {
	throw new HttpError(status, message);
}