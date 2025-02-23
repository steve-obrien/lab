import express from 'express'
import http from 'http';
import dotenv from 'dotenv';
import { setupWebSocketServer } from './ws.js'; // Import the WebSocket setup function
import defineServerApi from './api.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const port = process.env.SERVER_PORT;


// Setup WebSocket server
setupWebSocketServer(server);

defineServerApi(app)

// Start the server
server.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});