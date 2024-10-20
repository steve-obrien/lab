import twilioClient from './twilioClient.js';
/**
 * Manages WebSocket connections from the UI.
 * This has nothing to do with twilio sockets or the ai socket this 
 * exists purely to update the ui on the status of the call.
 * Each instance of the web page gets 1 websocket and currently this recieves all information about all calls.
 */
class WebSocketManager {

	constructor() {
		this.sockets = new Set();
	}

	addSocket(ws) {
		console.log('add socket')
		try {
			this.sockets.add(ws);

			ws.on('message', (message) => {
				try {
					message = JSON.parse(message);
				} catch (error) {
					console.error('log socket json parse error')
				}
				if (message.event === 'onCall') {
					ws.callSid = message.data.callSid
					console.log('WebLogManager: onCall')
				}
				if (message.event === 'hangup') {
					const callSid = message.data.callSid;
					twilioClient.calls(callSid)
						.update({ status: 'completed' })
						.then(call => console.log(`Call ${callSid} ended.`))
						.catch(error => console.error(`Error ending call ${callSid}:`, error));
					console.log('WebLogManager: hangup');
				}
			});
			ws.on('error', (event) => {
				console.error('LogWs: Error:', event);
			});
			ws.on('close', (event) => {
				console.error('LogWs: close', event);
				this.sockets.delete(ws)
			});

			console.log('sockets connected: ', this.sockets.size)

		} catch (error) {
			console.error('add socket error', error)
		}
	}

	/**
	 * Send a message to all connected sockets
	 * (this could in the future only send to a specific session)
	 * @param {string} event - The event type as a string
	 * @param {Object} [data={}] - The data to send with the event
	 */
	send(event, data = {}) {
		this.sockets.forEach(client => {
			client.send(JSON.stringify({ event, data }));
		});
	}

	sendItems(items) {
		this.send('items', items);
	}

	sendStatus(callSid, callStatus) {
		this.send('status', { callSid, callStatus });
	}

}

// Create and export the singleton instance
const webSocketManagerInstance = new WebSocketManager();
export default webSocketManagerInstance;