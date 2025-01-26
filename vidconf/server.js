const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve the index.html file
app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
	console.log('User connected:', socket.id);

	socket.on('offer', (data) => {
		socket.broadcast.emit('offer', data);
	});

	socket.on('answer', (data) => {
		socket.broadcast.emit('answer', data);
	});
	socket.on('candidate', (data) => {
		socket.broadcast.emit('candidate', data);
	});
});

server.listen(3000, () => console.log('Signaling server running on port 3000'));

