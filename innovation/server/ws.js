import WebSocket, { WebSocketServer } from 'ws';
import url from 'url';

// Function to generate a simple unique ID
function generateUniqueId() {
	return `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

// Create a WebSocket server
const wsServer = new WebSocketServer({ port: 8080 });

// Create a list to store connected clients
// const clients = new Map();

// each room id - has a clients map.
const rooms = new Map();


wsServer.on('connection', (ws, req) => {

	// Parse the query parameters from the request URL
	// The websocket and the browser need to negotiate a unique id 
	// to identify the client. For now we just accept the browserId
	const parameters = url.parse(req.url, true).query;
	ws.username = parameters.username;
	ws.browserId = parameters.browserId;
	ws.room = parameters.room;

	// if the room does not exist, create it
	if (!rooms.has(ws.room)) {
		rooms.set(ws.room, new Map());
	}

	// add the client to the room
	const clients = rooms.get(ws.room)

	// Check if a client with the same browserId already exists
	// This could be a user rejoining.
	if (clients.has(ws.browserId)) {
		// Update the existing client connection
		const existingClient = clients.get(ws.browserId);
		existingClient.terminate(); // Terminate the old connection
		clients.delete(existingClient.browserId); // Remove the old client from the map
	}

	// Add the new client to the list	
	clients.set(ws.browserId, ws);

	// Broadcast the updated client list to all connected clients
	broadcastClientList(ws.room);

	console.log(`Client connected with ID: ${ws.browserId} and code: ${ws.room}`);

	// when connected we need to figure out who they are where they are get their data and that sort of thing.


	ws.on('message', (message) => {
		console.log('Received:', message);

		const data = JSON.parse(message);

		switch (data.type) {
			case 'cursorUpdate':
				updateCursor(data.x, data.y, ws);
				break;
			case 'facilitatorStartExploreProblems':
				facilitatorStartExploreProblems(ws);
				break;
		}

	});

	ws.on('close', () => {
		clients.delete(ws.browserId);
		broadcastClientList(ws.room);
		console.log('Client disconnected');
	});

	ws.on('error', (error) => {
		console.error('WebSocket error:', error);
	});
});

function updateCursor(x, y, senderWs) {
	const clients = rooms.get(senderWs.room);
	const cursorData = JSON.stringify({
		type: 'cursorUpdate',
		browserId: senderWs.browserId,
		x: x,
		y: y,
		username: senderWs.username
	});
	clients.forEach((client) => {
		if (client !== senderWs && client.readyState === WebSocket.OPEN) {
			client.send(cursorData);
		}
	});
}

function facilitatorStartExploreProblems(ws) {
	broadcastDataToClients(ws.room, {
		type: 'facilitatorStartExploreProblems',
	});
}



// Function to broadcast the list of client IDs to all clients
function broadcastClientList(room) {
	const clients = rooms.get(room);

	// get each client ws object and convert to an object with browserId and username
	const clientList = Array.from(clients.values()).map((client) => ({
		browserId: client.browserId,
		username: client.username
	}));

	broadcastDataToClients(room, { type: 'clientList', clients: clientList });
}

function broadcastDataToClients(room, data) {
	const clients = rooms.get(room);
	const message = JSON.stringify(data);
	clients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(message);
		}
	});
}



console.log('WebSocket server is running on ws://localhost:8080');