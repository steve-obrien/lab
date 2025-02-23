import WebSocket, { WebSocketServer } from 'ws';
import url from 'url';
import User from './models/User.js';
import Workshop from './models/Workshop.js';
import db from './db/knex.js';

// each room id - has a clients map.
const rooms = new Map();

function sendPacket(type, data) {
	return JSON.stringify({
		type: type,
		data: data
	});
}

export function broadcastWorkshopUpdates(workshopId, workshopData) {
	broadcastDataToClients(workshopId, 'client:updateState', { state: workshopData });
}

export function broadcastDataToClients(workshopId, type, data) {
	const clients = rooms.get(workshopId);
	const message = sendPacket(type, data);
	clients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(message);
		}
	});
}

export function setupWebSocketServer(server) {

	// Create a WebSocket server
	const wsServer = new WebSocketServer({ server });


	wsServer.on('connection', async (ws, req) => {
		// Parse the query parameters from the request URL
		// The websocket and the browser need to negotiate a unique id 
		const parameters = url.parse(req.url, true).query;
		ws.userId = parameters.userId;
		// fetch the user details:
		const user = await User.find(ws.userId);
		// reject if no user found
		if (user == null) {
			ws.close(3000, 'User not found');
			return;
		}
		ws.user = user;
		ws.workshop_id = parameters.workshop.replace(/-/g, '');

		// Add the user to the workshop room!
		// Insert or update client in the database
		// actually not sure we need this - the rooms[id] holds a map of all clients.
		await db('workshop_users')
			.insert({
				user_id: ws.userId,
				workshop_id: ws.workshop_id,
				status: 'connected',
			})
			.onConflict(['user_id', 'workshop_id'])
			.merge();

		// Get the workshop
		const workshop = await Workshop.find(ws.workshop_id);
		console.log('workshop', workshop);
		if (workshop == null) {
			// prevent connection
			ws.close(3000, 'Workshop not found');
			return;
		}

		// if the room does not exist, create it
		if (!rooms.has(ws.workshop_id)) {
			rooms.set(ws.workshop_id, new Map());
		}
		// add the client to the room
		const clients = rooms.get(ws.workshop_id)

		// Check if a client with the same userId already exists
		// This could be a user rejoining.
		if (clients.has(ws.userId)) {
			// Update the existing client connection
			const existingClient = clients.get(ws.userId);
			existingClient.terminate(); // Terminate the old connection
			clients.delete(existingClient.userId); // Remove the old client from the map
		}

		// Add the new client to the list	
		clients.set(ws.userId, ws);

		// Broadcast the updated client list to all connected clients
		broadcastClientList(ws.workshop_id);

		console.log(`Client connected with ID: ${ws.userId} and code: ${ws.workshop_id}`);

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
					broadcastDataToClients(ws.workshop_id, packet.type, packet.data);
					break;

				case 'updateWorkshop':
					console.log('updateWorkshop', packet);
					await updateWorkshop(ws, packet.data);
					break;

				case 'server:updateState':
					await updateWorkshop(ws, packet.data.state);
					// Broadcast new state to all connected clients
					break;
				default:
					broadcastDataToClients(ws.workshop_id, packet.type, packet.data);
					console.log('unknown packet type', packet);
					break;
			}

		});

		ws.on('close', async () => {
			clients.delete(ws.userId);
			broadcastClientList(ws.workshop_id);
			console.log('Client disconnected');
			try {
			await db('workshop_users')
				.where({user_id: ws.userId, workshop_id: ws.workshop_id})
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
		const clients = rooms.get(senderWs.workshop_id);
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

		broadcastDataToClients(ws.workshop_id, {
			type: 'facilitatorExploreProblemsStart',
		});
	}

	// Function to broadcast the list of client IDs to all clients
	function broadcastClientList(workshopId) {
		const clients = rooms.get(workshopId);

		// const clientList = {};
		// // Iterate over each entry in the Map
		// for (const [userId, client] of clients.entries()) {
		// 	clientList[userId] = client.user
		// }
		// get each client ws object and convert to an object with browserId and username
		const clientList = Array.from(clients.values()).map((client) => ( client.user ));

		broadcastDataToClients(workshopId, 'clientList',  { clients: clientList });
	}

	async function updateWorkshop(ws, updates) {
		console.log('updateWorkshopName inside', updates)
		const workshop = await Workshop.find(ws.workshop_id);
		console.log('found workshop', workshop);
		Object.assign(workshop, updates);
		await workshop.save();
		broadcastWorkshopUpdates(ws.workshop_id, workshop.toJSON());
	}

	console.log('WebSocket server is running on ws://localhost:' + process.env.SERVER_PORT);

}
