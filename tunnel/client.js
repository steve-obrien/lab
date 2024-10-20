const axios = require('axios');
const express = require('express');
const morgan = require('morgan');
const net = require('net');
const WebSocket = require('ws');


// Local service setup
const localServiceUrl = 'http://localhost:5050';  // Your local service URL
const clientId = 'my-client-id';  // Unique ID for this client


// Connect to the remote TCP server
const ws = new WebSocket('ws://159.65.62.206:8081');
ws.on('open', () => {
	console.log('Connected to remote WebSocket server');
});


ws.on('message', async (data) => {
	console.log('Received: %s', data);

	try {
		// Decode the JSON string
		const requestData = JSON.parse(data);

		// Make a request to the local service
		const response = await axios({
			method: requestData.method,
			url: `${localServiceUrl}${requestData.url}`,
			headers: requestData.headers,
			data: requestData.body
		});

		// Send the response back to the TCP server
		ws.send(JSON.stringify({
			status: response.status,
			headers: response.headers,
			body: response.data
		}));
	} catch (error) {
		console.error('Error processing data:', error);
		ws.send(JSON.stringify({ error: 'Failed to process request' }));
	}

});

// Log requests
// const app = express();
// app.use(morgan('combined'));

// app.listen(3000, () => {
// 	console.log('Local service running on port 3000');
// });