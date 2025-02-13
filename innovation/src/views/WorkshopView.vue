<template>
	<main v-if="workshopStore.isSetup">

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
					Join on <a href="#" class="text-blue-500 underline">{{url}}</a> or scan the <strong>QR Code</strong>
				</p>
				Your room:
				<pre>{{ room }}</pre>
				<canvas ref="qrcodeCanvas" class="h-24 w-24 mx-auto"></canvas>
				<!-- <img src="qrcode.png" alt="QR Code" class="h-24 w-24 mx-auto"> -->
			</div>

			<div v-if="isFacilitator" class="flex justify-end mt-4">
				<button @click="facilitatorExploreProblemsStart()" class="bg-black cursor-pointer text-white px-4 py-2 rounded-lg">Start</button>
			</div>

		</div>

	</main>
	<main v-if="workshopStore.isExploreProblemsReady">
		<div class="flex items-end">
			<button v-if="isFacilitator" @click="broadcast('facilitatorExploreProblemsGo', {})" class="bg-black text-white px-4 py-2  cursor-pointer">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6"><path fill-rule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd" /></svg>
			</button>
			<div class="bg-black text-white px-4 py-2  cursor-pointer">
				{{ workshopStore.exploreProblems.time }}
			</div>
		</div>
		<h1 class="text-3xl font-bold">Explore Problems READY - {{timerStore.status}}</h1>
	</main>

	<main v-if="workshopStore.isExploreProblemsGo">
		<div class="flex items-end">
			<div v-if="isFacilitator" class="flex gap-2">
				<button  v-if="timerStore.status === 'running'"  @click="broadcast('facilitatorExploreProblemsPause', {})" class="bg-black text-white px-4 py-2  cursor-pointer">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6"><path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clip-rule="evenodd" /></svg>
				</button>
				<button  v-if="timerStore.status === 'paused'"  @click="broadcast('facilitatorExploreProblemsResume', {})" class="bg-black text-white px-4 py-2  cursor-pointer">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6"><path fill-rule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd" /></svg>
				</button>
			</div>
			<div class="bg-black text-white px-4 py-2  cursor-pointer">
				{{ timerStore.time }}
			</div>
		</div>
		<h1 class="text-3xl font-bold">Explore Problems GOGOGO! - {{timerStore.status}}</h1>
	</main>


	<div v-for="[key, client] in clientsList.entries()" :key="key">
		<div v-if="client.browserId !== browserId" class="shadow-md client-cursor bg-gray-200 rounded-lg p-2 px-4 text-white absolute" :style="{ left: client.x + 'px', top: client.y + 'px', backgroundColor: client.color }">
			{{ client.username }}
			<div class="absolute w-0 h-0 border-t-8 border-t-transparent border-b-5 border-b-transparent border-l-8" :style="{ borderLeftColor: client.color, top: '10%', left: '-5px', transform: 'translateY(-50%) rotate(200deg)' }"></div>
		</div>
	</div>

	<div v-if="state === 'join' || state === 'joining'" class="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-s bg-opacity-50">
		<div class="bg-white p-8 rounded-lg shadow-2xl">
			<div v-if="state === 'join'">
				<h2 class="text-xl font-bold mb-4">Tell us who you are</h2>
				<form @submit.prevent="saveUsername()">
					<input ref="usernameInput" v-model="username" required minlength="3" class="mb-4 w-full block rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-black-600" placeholder="Your name" />
					<button type="submit" class="bg-black text-white px-4 py-2 rounded-lg cursor-pointer">Save</button>
				</form>
			</div>	
			<div v-if="state === 'joining'">
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

{{ workshopStore }}
	</pre>

</template>

<script>

/**
 * Remember: Everything works better when the components render from pure state.
 * TODO: move all relevent state into store.
 * TODO: use the store state to render the UI.
 * The flows are complex - as we have facilitator state, client state, and overall workshop progress state.  
 * Where everyone is collectivly. We also have the websocet to syncronise state.
 * Then we have connections dropping *browsers refreshing*.
 */

import QRCode from 'qrcode'
import { nextTick } from 'vue'
import { throttle } from '../lib/utils'
import { useWorkshopStore } from '../stores/workshop'
import { useTimerStore } from '../stores/timer'

export default {
	props: {
		room: String
	},
	data() {
		return {
			state: 'start', // ['join', 'joining', 'joined', 'ready']
			socket: null,
			name: '',
			clientsList: new Map(),
			browserId: '',

		}
	},
	mounted() {
		window.app = this;
		this.generateQRCode(this.url);
		this.trackCursorMovement();
		this.setUpState();

	},
	computed: {
		url() {
			return location.origin + '/' + this.room;
		},
		workshopStore() {
			return useWorkshopStore();
		},
		timerStore() {
			return useTimerStore();
		},
		isFacilitator() {
			return this.browserId === this.workshopStore.facilitatorId;
		}
	},
	methods: {
		setUpState() {
			userStore.loadState();
		},
		saveUsername() {
			//this.state = 'join';
			// validation
			//localStorage.setItem('username', this.username);

			// save the user.

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
			const host = import.meta.env.VITE_WS_HOST;
			this.socket = new WebSocket(`${host}/?room=${this.room}&username=${this.username}&browserId=${this.browserId}`);

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
				case 'clientList':
					this.handleClientList(data);
					break;
				case 'cursorUpdate':
					this.handleUpdateCursor(data);
					break;
				case 'facilitatorExploreProblemsStart':
					this.workshopStore.exploreProblemsStart();
					break;
				case 'facilitatorExploreProblemsGo':
					this.workshopStore.exploreProblemsGo();
					break;
				case 'facilitatorExploreProblemsPause':
					this.workshopStore.exploreProblemsPause();
					break;
				case 'facilitatorExploreProblemsResume':
					this.workshopStore.exploreProblemsResume();
					break;
			}
		},
		facilitatorExploreProblemsStart() {
			this.socket.send(JSON.stringify({
				type: 'facilitatorExploreProblemsStart',
			}));
		},
		broadcast(type, data) {
			console.log('broadcast:', type, data);
			this.socket.send(JSON.stringify({
				type: 'broadcastDataToClients',
				data: {
					type:type, 
					data:data
				}
			}));
		},
		generateQRCode(url) {
			const canvas = this.$refs.qrcodeCanvas;
			QRCode.toCanvas(canvas, url, function (error) {
				if (error) console.error(error);
				console.log('QR code generated!');
			});
		},
		trackCursorMovement() {
			this.throttledSendCursorPosition = throttle(this.sendCursorPosition, 10);
			window.addEventListener('mousemove', this.throttledSendCursorPosition);
		},
		sendCursorPosition(event) {
			if (this.state !== 'joined') return;
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
		handleUpdateCursor(data) {
			if (data.browserId === undefined) return;
			const client = this.clientsList.get(data.browserId);
			if (client) {
				client.x = data.x;
				client.y = data.y;
			}
		},


	},
	onUnmounted() {
		window.removeEventListener('mousemove', this.throttledSendCursorPosition);
	}
}
</script>

<style>
</style>
