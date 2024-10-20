const net = require('net');
const http = require('http');
const WebSocket = require('ws');

const ws = new WebSocket.Server({ port: 8081 });

let wsClient = null

ws.on('connection', (socket) => {
	console.log('A new client connected');
	wsClient = socket;
	wsClient.on('close', () => {
		console.log('Client disconnected');
	});

})


// Create an HTTP server on port 8080
const server = http.createServer((req, res) => {
	// Handle HTTP requests and forward them to the WebSocket client


	// Assuming a single client
	if (wsClient != null) {

		// send to the local tunnel client.js
		wsClient.send(JSON.stringify({
			method: req.method,
			url: req.url,
			headers: req.headers,
			body: req.body // Include the request body
		}));

		// local client sends to local server

		// recieve from local tunnel client.js
		 // Send the response body
		 wsClient.on('message', (data) => {
			console.log('Received: %s', data);

			/**
			 * The data received from the local tunnel client.js will be a JSON string
			 * Parse the JSON string to an object
			 * @param {string} data - JSON string containing the response details
			 * @property {number} response.status - The HTTP status code
			 * @property {Object} response.headers - The HTTP headers
			 * @property {string} response.body - The response body
			 */
			const response = JSON.parse(data);

			// Extract the status, headers, and body from the response object
			const { status, headers, body } = response;
   
			// Set the response status code
			try {
				res.writeHead(status, headers);
				res.end(body);
			} catch (error) {
				console.error('Error sending response:', error);
			}
		});


	} else {
		res.writeHead(503, { 'Content-Type': 'text/plain' });
		res.end('No WebSocket client connected');
	}
});

// Start the HTTP server on port 8080
server.listen(8080, () => {
	console.log('HTTP server is listening on port 8080');
});
