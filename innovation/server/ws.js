import WebSocket, { WebSocketServer } from 'ws';
import url from 'url';

// Function to generate a simple unique ID
function generateUniqueId() {
	return `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

// Create a WebSocket server
const wsServer = new WebSocketServer({ port: 8080 });

// Create a list to store connected clients
const clients = new Map();

wsServer.on('connection', (ws, req) => {

	// Parse the query parameters from the request URL
	const parameters = url.parse(req.url, true).query;
	const code = parameters.code;
	const username = parameters.username;
	// Generate a unique ID for the client
	const clientId = generateUniqueId();
	ws.clientId = clientId; // Assign the ID to the WebSocket instance
	ws.username = username; // Assign the username to the WebSocket instance

	// Add the new client to the list
	clients.set(clientId, ws);

	// Broadcast the updated client list to all connected clients
	broadcastClientList();

	console.log(`Client connected with ID: ${clientId} and code: ${code}`);

	// Verify the code (replace this with your actual verification logic)
	// if (!isValidCode(code)) {
	// 	ws.close(1008, 'Invalid code'); // Close connection with policy violation code
	// 	return;
	// }


	ws.on('message', (message) => {
		console.log('Received:', message);

		const data = JSON.parse(message);
		switch (data.type) {
			case 'cursorUpdate':
				updateCursor(data.x, data.y, ws);
				break;
		}


		// Broadcast the message to all connected clients
		wsServer.clients.forEach((client) => {
			if (client !== ws && client.readyState === WebSocket.OPEN) {
				client.send(message);
			}
		});
	});

	ws.on('close', () => {
		clients.delete(clientId);
		broadcastClientList();
		console.log('Client disconnected');
	});

	ws.on('error', (error) => {
		console.error('WebSocket error:', error);
	});
});

function updateCursor(x, y, senderWs) {
	const cursorData = JSON.stringify({ 
		type: 'cursorUpdate', 
		clientId: senderWs.clientId, 
		x: x, 
		y: y 
	});
	console.log('updateCursor data:', cursorData);
	clients.forEach((client) => {
		if (client !== senderWs && client.readyState === WebSocket.OPEN) {
			client.send(cursorData);
		}
	});
}

// Function to broadcast the list of client IDs to all clients
function broadcastClientList() {
	const clientList = Array.from(clients.keys());
	const message = JSON.stringify({ type: 'clientList', clients: clientList });
	console.log('Broadcasting client list:', message);
	clients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(message);
		}
	});
}

console.log('WebSocket server is running on ws://localhost:8080');