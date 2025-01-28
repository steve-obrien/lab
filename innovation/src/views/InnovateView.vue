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
					<div :style="{ backgroundColor: client.color }" v-for="[key, client] in clientsList.entries()" :key="key" class="flex items-center justify-center px-5 py-2 m-4 rounded-sm bg-yellow-400  shadow-md">
						<span class="text-white font-bold">{{ client.username }}</span>
					</div>
				</div>
			</div>
			<div class="mt-8 bg-gray-200 p-6 rounded-lg">
				<h2 class="text-xl font-bold mb-2">Let's Innovate Together</h2>
				<p class="text-gray-700 mb-4">
					This guided session will help us define your goals, explore opportunities, and craft a clear roadmap for success.
				</p>
				<p class="text-gray-700 mb-4">
					Join on <a href="#" class="text-blue-500 underline">newicon.net/innovationapp</a> or scan the <strong>QR Code</strong>
				</p>
				Your room:
				<pre>{{ room }}</pre>
				<canvas ref="qrcodeCanvas" class="h-24 w-24 mx-auto"></canvas>
				<!-- <img src="qrcode.png" alt="QR Code" class="h-24 w-24 mx-auto"> -->
			</div>
			<div class="flex justify-end mt-4">
				<button class="bg-gray-300 cursor text-gray-700 px-4 py-2 rounded-lg">Start</button>
			</div>

		</div>

		<div v-for="[key, client] in clientsList.entries()" :key="key">
			<div v-if="client.browserId !== browserId" class="shadow-md client-cursor bg-gray-200 rounded-lg p-2 px-4 text-white absolute" :style="{ left: client.x + 'px', top: client.y + 'px', backgroundColor: client.color }">
				{{ client.username }}
				<div class="absolute w-0 h-0 border-t-8 border-t-transparent border-b-5 border-b-transparent border-l-8" :style="{ borderLeftColor: client.color, top: '10%', left: '-5px', transform: 'translateY(-50%) rotate(200deg)' }"></div>
			</div>
		</div>
	</main>

	<div v-if="this.state === 'join' || this.state === 'joining'" class="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-s bg-opacity-50">
		<div class="bg-white p-8 rounded-lg shadow-2xl">
			<div v-if="this.state === 'join'">
				<h2 class="text-xl font-bold mb-4">Tell us who you are</h2>
				<form @submit.prevent="saveUsername()">
					<input ref="usernameInput" v-model="username" required minlength="3" class="mb-4 w-full block rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-black-600" placeholder="Your name" />
					<button type="submit" class="bg-black text-white px-4 py-2 rounded-lg cursor-pointer">Save</button>
				</form>
			</div>
			<div v-if="this.state === 'joining'">
				<h2 class="text-xl font-bold mb-4">Joining...</h2>
			</div>
		</div>
	</div>

	<pre>
		State: {{ state }}
		BrowserId: {{ browserId }}
		Username: {{ username }}
		=========
		ClientList:
{{ clientsList }}
	</pre>

</template>

<script>

import QRCode from 'qrcode'
import { nextTick } from 'vue'
import { debounce } from 'lodash'

export default {
	props: {
		room: String
	},
	data() {
		return {
			state: 'start', // ['join', 'joining', 'joined', 'ready']
			socket: null,
			username: '',
			clientsList: new Map()
		}
	},
	mounted() {
		window.app = this;
		this.generateQRCode(location + this.room);
		this.trackCursorMovement();
		this.setUpState();

	},
	methods: {
		setUpState() {
			let storedUsername = localStorage.getItem('username');
			if (storedUsername) {
				this.username = storedUsername;
				this.joinWebSocket();
			} else {
				this.state = 'join';
				nextTick(() => {
					this.$refs.usernameInput.focus();
				});
			}
		},
		saveUsername() {
			//this.state = 'join';
			// validation
			localStorage.setItem('username', this.username);
			this.joinWebSocket();
			//	this.state = 'ready';
		},
		getBrowserUuid() {
			this.browserId = localStorage.getItem('browserId')
			if (this.browserId === null) {
				this.browserId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
				localStorage.setItem('browserId', this.browserId);
			}
			return this.browserId;
		},
		joinWebSocket() {
			// validate the entry state.
			// you can only join if you have a unique username.

			this.state = 'joining';

			// first we need to login this browser - and identify it - so we have a unique id to join the socket with.
			// and if we refresh the page - we don't create a new participant.
			this.getBrowserUuid();

			// Include the code as a query parameter in the WebSocket URL
			this.socket = new WebSocket(`ws://localhost:8080?room=${this.room}&username=${this.username}&browserId=${this.browserId}`);

			this.socket.onopen = () => {
				console.log('WebSocket connection established');
				this.state = 'joined';
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
			if (this.state !== 'joined')
				return;
			this.socket.send(JSON.stringify({
				type: 'cursorUpdate',
				browserId: this.browserId,
				x: event.clientX,
				y: event.clientY
			}));
		},
		handleClientList(data) {
			console.log('handleClientList', data);

			// Create a set of current client browserIds
			const currentClientIds = new Set(data.clients.map(client => client.browserId));

			// Remove clients that are not in the current data
			this.clientsList.forEach((_, browserId) => {
				if (!currentClientIds.has(browserId)) {
					this.clientsList.delete(browserId);
				}
			});

			data.clients.forEach(client => {
				this.clientsList.set(client.browserId, {
					username: client.username,
					browserId: client.browserId,
					color: '#' + Math.floor(Math.random() * 16777215).toString(16)
				});
			});
		},
		// update th cursor of one of the clinets to display it on the screen
		updateCursor(data) {
			console.log('updateCursor', data);
			// this.cursor = data.cursor;
			if (data.browserId === undefined)
				return;
			const client = this.clientsList.get(data.browserId);
			if (client) {
				client.x = data.x;
				client.y = data.y;
			}
		},
	},
	onUnmounted() {
		window.removeEventListener('mousemove', this.sendCursorPosition);
	}
}
</script>

<style>
</style>
