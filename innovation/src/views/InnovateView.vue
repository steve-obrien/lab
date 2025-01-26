<template>
	<main>
		<div class="bg-white shadow-md rounded-lg p-8 max-w-4xl w-full">
			<div class="flex justify-between items-start">
				<div>
					<!-- <img src="logo.png" alt="Logo" class="h-12 mb-4"> -->
					<h1 class="text-3xl font-bold">Innovation Day 2025</h1>
					<p class="text-lg text-gray-600">New Icon</p>
				</div>
				<div class="bg-gray-200 rounded-lg p-4">
					<h2 class="text-xl font-bold mb-2">Participants</h2>
					<div class="flex items-center justify-center h-16 w-16 bg-yellow-400 rounded-full shadow-md">
						<span class="text-white font-bold">S</span>
					</div>
				</div>
			</div>
			<div class="mt-8 bg-gray-200 p-6 rounded-lg">
				<h2 class="text-xl font-bold mb-2">Let’s Innovate Together</h2>
				<p class="text-gray-700 mb-4">
					This guided session will help us define your goals, explore opportunities, and craft a clear roadmap for success.
				</p>
				<p class="text-gray-700 mb-4">
					Join on <a href="#" class="text-blue-500 underline">newicon.net/innovationapp</a> or scan the <strong>QR Code</strong>
				</p>
				Yor code:
				<pre>{{ code }}</pre>
				<canvas ref="qrcodeCanvas" class="h-24 w-24 mx-auto"></canvas>
				<!-- <img src="qrcode.png" alt="QR Code" class="h-24 w-24 mx-auto"> -->
			</div>
			<div class="flex justify-end mt-4">
				<button class="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg">Start</button>
			</div>

			{{ clientsList }}
			{{ username }}
		</div>

		<div v-for="[key, client] in clientsList.entries()" :key="key">
			<div class="shadow-md bg-gray-200 rounded-lg p-4 absolute" :style="{ left: client.x + 'px', top: client.y + 'px' }"> {{ key }} {{ client.x }} {{ client.y }} </div>
		</div>
	</main>
</template>

<script>

import QRCode from 'qrcode'

export default {
	props: {
		code: String
	},
	data() {
		return {
			socket: null,
			username: this.getUsername(),
			clientsList: new Map()
		}
	},
	mounted() {
		window.app = this;
		this.generateQRCode(location + this.code);
		this.setupWebSocket();
		this.trackCursorMovement();
	},
	methods: {
		getUsername() {
			// return a random username
			return 'User ' + Math.floor(Math.random() * 1000000);
		},
		generateQRCode(url) {
			const canvas = this.$refs.qrcodeCanvas;
			QRCode.toCanvas(canvas, url, function (error) {
				if (error) console.error(error);
				console.log('QR code generated!');
			});
		},
		trackCursorMovement() {
			window.addEventListener('mousemove', this.sendCursorPosition);
		},
		sendCursorPosition(event) {
			this.socket.send(JSON.stringify({ 
				type: 'cursorUpdate',
				clientId: this.clientId,
				x: event.clientX,
				y: event.clientY
			}));
		},
		handleClientList(data) {
			data.clients.forEach(client => {
				this.clientsList.set(client, {
					x: 0,
					y: 0
				});
			});
		},
		// update th cursor of one of the clinets to display it on the screen
		updateCursor(data) {
			console.log('updateCursor', data);
			// this.cursor = data.cursor;
			if (data.clientId === undefined)
				return;
			this.clientsList.set(data.clientId, {
				x: data.x,
				y: data.y
			});
		},
		setupWebSocket() {
			// Include the code as a query parameter in the WebSocket URL
			this.socket = new WebSocket(`ws://localhost:8080?code=${this.code}&username=${this.username}`);

			this.socket.onopen = () => {
				console.log('WebSocket connection established');
			};

			this.socket.onmessage = (event) => {
				console.log('Received onmessage:', event);
				if (event.data instanceof Blob) {
					const reader = new FileReader();
					reader.onload = () => {
						const data = JSON.parse(reader.result);
						this.handleSocketData(data);
					};
					reader.readAsText(event.data);
				} else {
					const data = JSON.parse(event.data);
					this.handleSocketData(data);
				}
			}

			this.socket.onclose = () => {
				console.log('WebSocket connection closed');
			};

			this.socket.onerror = (error) => {
				console.error('WebSocket error:', error);
			};
		},
		handleSocketData(data) {
			console.log('handleSocketData:', data);
			switch (data.type) {
				case 'participantJoined':
					this.handleParticipantJoined(data);
					break;
				case 'clientList':
					this.handleClientList(data);
					break;
				case 'cursorUpdate':
					this.updateCursor(data);
					break;
			}
		}
	}
}
</script>
