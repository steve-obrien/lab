import WebSocket, { WebSocketServer } from 'ws';
import url from 'url';

// Function to generate a simple unique ID
function generateUniqueId() {
	return `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

// Create a WebSocket server
const wsServer = new WebSocketServer({ port: 8080 });

// Create a list to store connected clients
// @property {Map} ws - A map of connected clients, keyed by browserId
const clients = new Map();

wsServer.on('connection', (ws, req) => {

	// Parse the query parameters from the request URL

	const parameters = url.parse(req.url, true).query;
	ws.username = parameters.username;

	// The websocket and the browser need to negotiate a unique id 
	// to identify the client. For now we just accept the browserId
	ws.browserId = parameters.browserId;
	ws.code = parameters.code;

	// Check if a client with the same browserId already exists
	// This could be a user rejoining.
	let existingClient = null;
	clients.forEach((client) => {
		if (client.browserId === ws.browserId) {
			existingClient = client;
		}
	});

	if (existingClient) {
		// Update the existing client connection
		existingClient.terminate(); // Terminate the old connection
		clients.delete(existingClient.browserId); // Remove the old client from the map
	}

	// Add the new client to the list	
	clients.set(ws.browserId, ws);

	// Broadcast the updated client list to all connected clients
	broadcastClientList();

	console.log(`Client connected with ID: ${ws.browserId} and code: ${ws.code}`);

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
		clients.delete(ws.browserId);
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
		browserId: senderWs.browserId, 
		x: x, 
		y: y,
		// we should not have to send this now.
		// username: senderWs.username
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

	// get each client ws object and convert to an object with browserId and username
	const clientList = Array.from(clients.values()).map((client) => ({
		browserId: client.browserId,
		username: client.username
	}));
	
	const message = JSON.stringify({ type: 'clientList', clients: clientList });
	console.log('Broadcasting client list:', message);
	clients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(message);
		}
	});
}

console.log('WebSocket server is running on ws://localhost:8080');