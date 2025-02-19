import WebSocket, { WebSocketServer } from 'ws';
import url from 'url';
import User from './models/User.js';
import Workshop from './models/Workshop.js';
import db from './db/knex.js';

// each room id - has a clients map.
const rooms = new Map();



export function setupWebSocketServer(server) {

	// Create a WebSocket server
	const wsServer = new WebSocketServer({ server });

	let globalState = {}

	wsServer.on('connection', async (ws, req) => {
		// Parse the query parameters from the request URL
		// The websocket and the browser need to negotiate a unique id 
		// to identify the client. For now we just accept the browserId
		const parameters = url.parse(req.url, true).query;
		ws.username = parameters.username;
		ws.userId = parameters.userId;
		// fetch the user details:
		const user = await User.find(ws.userId);
		ws.user = user;

		ws.browserId = parameters.browserId;
		ws.room = parameters.room;

		// Insert or update client in the database
		// await db('workshop_users')
		// 	.insert({
		// 		user_id: ws.userId,
		// 		workshop_id: ws.room.replace(/-/g, ''),
		// 		status: 'connected',
		// 	})
		// 	.onConflict(['user_id', 'workshop_id'])
		// 	.merge();

		// if the room does not exist, create it
		if (!rooms.has(ws.room)) {
			rooms.set(ws.room, new Map());
		}



		ws.send(JSON.stringify({ type: 'client:updateState', data: { state: globalState } }));

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

		ws.on('message', async (message) => {

			const packet = JSON.parse(message);

			switch (packet.type) {
				// send the mouse positions to other clients
				case 'cursorUpdate':
					updateCursor(packet.x, packet.y, ws);
					break;

				case 'facilitatorExploreProblemsStart':
					facilitatorExploreProblemsStart(ws);
					break;

				// send data to all clients in the room
				case 'broadcastDataToClients':
					broadcastDataToClients(ws.room, packet.data);
					break;

				case 'updateWorkshop':
					console.log('updateWorkshop', packet);
					await updateWorkshop(ws, packet.data);
					break;

				case 'client:workshop:update':
					await updateWorkshop(ws, packet.data);
					break;

				case 'server:updateState':
					globalState = packet.data.state;
					console.log('State updated:', globalState);
					const clients = rooms.get(ws.room);
					// Broadcast new state to all connected clients
					clients.forEach(client => {
						if (client.readyState === WebSocket.OPEN) {
							client.send(JSON.stringify({ 
								type: 'client:updateState',  
								data: { 
									state: globalState 
								}
							}));
						}
					});
					break;
			}

		});

		ws.on('close', async () => {
			clients.delete(ws.browserId);
			broadcastClientList(ws.room);
			console.log('Client disconnected');
			try {
			await db('workshop_users')
				.where({user_id: ws.userId, workshop_id: ws.room.replace(/-/g, '')})
				.update({
					status: 'disconnected',
					disconnected_at: new Date()
				})
			} catch (error) {
				console.error('Error updating workshop user status', error);
			}

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
			// we should not have to send this now.
			// username: senderWs.username
		});
		clients.forEach((client) => {
			if (client !== senderWs && client.readyState === WebSocket.OPEN) {
				client.send(cursorData);
			}
		});
	}

	function facilitatorExploreProblemsStart(ws) {

		broadcastDataToClients(ws.room, {
			type: 'facilitatorExploreProblemsStart',
		});
	}

	// Function to broadcast the list of client IDs to all clients
	function broadcastClientList(room) {
		const clients = rooms.get(room);

		// get each client ws object and convert to an object with browserId and username
		const clientList = Array.from(clients.values()).map((client) => ({
			userId: client.userId,
			user: client.user,
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

	async function updateWorkshop(ws, updates) {
		console.log('updateWorkshopName inside', updates)
		const workshop = await Workshop.find(ws.room);
		console.log('found workshop', workshop);
		Object.assign(workshop, updates);
		await workshop.save();
		broadcastDataToClients(ws.room, {
			type: 'data:workshop',
			data: {
				workshop: workshop.toJSON()
			}
		});
	}

	console.log('WebSocket server is running on ws://localhost:' + process.env.SERVER_PORT);
}