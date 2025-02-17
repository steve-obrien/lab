<template>
	<div class="bg-neutral-200 h-screen flex flex-col gap-4 p-8 w-full border-8 border-white rounded-xl">

		<main v-if="workshopStore.isSetup" class="flex flex-col h-full">

			<div class=" flex-grow flex gap-6 rounded-lg p-8 w-full">
				<!-- intro-->
				<div class="flex flex-col justify-between items-start">
					<!-- title-->
					<div class="h-full flex items-center">
						<div>
							<!-- <img src="logo.png" alt="Logo" class="h-12 mb-4"> -->
							<h1 class="text-3xl font-bold">{{ workshopStore.name }}</h1>
							<input type="text" v-model="workshopName" class="text-3xl font-bold" />
							<p class="text-lg text-gray-600">New Icon</p>
						</div>
					</div>

					<!-- join instructions -->
					<div class="bg-neutral-300 border border-neutral-400 p-6 rounded-lg">
						<h2 class="text-xl font-bold mb-2">Let's Innovate Together</h2>
						<p class="text-gray-700 mb-4">
							This guided session will help us define your goals, explore opportunities, and craft a clear roadmap for success.
						</p>
						<p class="text-gray-700 mb-4">
							Join on <a href="#" class="text-blue-500 underline">{{ url }}</a> or scan the <strong>QR Code</strong>
						</p>
						Your room:
						<pre>{{ workshopId }}</pre>
						<canvas ref="qrcodeCanvas" class="h-24 w-24 mx-auto"></canvas>

					</div>

				</div>
				<!-- participants-->
				<div class="flex justify-between items-start w-full bg-white rounded-lg p-4">
					<div class="  ">
						<h2 class="text-xl font-bold mb-2">Participants</h2>
						<div :style="{ backgroundColor: client.color }" v-for="[key, client] in clientsList.entries()" :key="key" class="flex items-center justify-center px-5 py-2 m-4 rounded-sm bg-yellow-400  shadow-md">
							<img :src="avatarUrl(client.user.email)" alt="Avatar" class="w-6 h-6 rounded-full mr-2">
							<span class="text-white font-bold">{{ client.user.name }}</span>
						</div>
					</div>
				</div>
			</div>

			<div v-if="isFacilitator" class="flex justify-end mt-4 bg-neutral-400">
				<button @click="facilitatorExploreProblemsStart()" class="bg-black cursor-pointer text-white px-4 py-2 rounded-lg">Start</button>
			</div>

		</main>
		<main v-if="workshopStore.isExploreProblemsReady">
			<div class="flex items-end">
				<button v-if="isFacilitator" @click="broadcast('facilitatorExploreProblemsGo', {})" class="bg-black text-white px-4 py-2  cursor-pointer">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
						<path fill-rule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd" />
					</svg>
				</button>
				<div class="bg-black text-white px-4 py-2  cursor-pointer">
					{{ workshopStore.exploreProblems.time }}
				</div>
			</div>
			<h1 class="text-3xl font-bold">Explore Problems READY - {{ timerStore.status }}</h1>
		</main>

		<main v-if="workshopStore.isExploreProblemsGo">
			<div class="flex items-end">
				<div v-if="isFacilitator" class="flex gap-2">
					<button v-if="timerStore.status === 'running'" @click="broadcast('facilitatorExploreProblemsPause', {})" class="bg-black text-white px-4 py-2  cursor-pointer">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
							<path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clip-rule="evenodd" />
						</svg>
					</button>
					<button v-if="timerStore.status === 'paused'" @click="broadcast('facilitatorExploreProblemsResume', {})" class="bg-black text-white px-4 py-2  cursor-pointer">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="size-6">
							<path fill-rule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd" />
						</svg>
					</button>
				</div>
				<div class="bg-black text-white px-4 py-2  cursor-pointer">
					{{ timerStore.time }}
				</div>
			</div>
			<h1 class="text-3xl font-bold">Explore Problems GOGOGO! - {{ timerStore.status }}</h1>
		</main>


		<div class="absolute" v-for="[key, client] in clientsList.entries()" :key="key">
			<div v-if="client.user.id !== userStore.id" class="shadow-md flex client-cursor bg-gray-200 rounded-lg p-2 px-4 text-white absolute" :style="{ left: client.x + 'px', top: client.y + 'px', backgroundColor: client.color }">
				<img :src="avatarUrl(client.user.email)" alt="Avatar" class="w-6 h-6 rounded-full mr-2">
				{{ client.user.name }}
				<div class="absolute w-0 h-0 border-t-8 border-t-transparent border-b-5 border-b-transparent border-l-8" :style="{ borderLeftColor: client.color, top: '10%', left: '-5px', transform: 'translateY(-50%) rotate(200deg)' }"></div>
			</div>
		</div>

		<div v-if="state === 'joining'" class="fixed inset-0 flex items-center justify-center bg-black/20 backdrop-blur-s bg-opacity-50">
			<div class="bg-white p-8 rounded-lg shadow-2xl">
				<h2 class="text-xl font-bold mb-4">Joining...</h2>
			</div>
		</div>

	</div>

	<pre class="overflow-scroll max-w-full">

		{{ workshopStore }}


		State: {{ state }}
		=========
		ClientList:
{{ clientsList }}



USEr:
{{ userStore }}
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
import { throttle } from '../lib/utils'
import { useWorkshopStore } from '../stores/workshop'
import { useTimerStore } from '../stores/timer'
import { useUserStore } from '../stores/user'
import { avatarUrl } from '../lib/utils'

export default {
	props: {
		workshopId: String
	},
	data() {
		return {
			state: 'start', // ['join', 'joining', 'joined', 'ready']
			socket: null,
			name: '',
			clientsList: new Map(),
			isRemoteUpdate: false,
		}
	},
	mounted() {
		window.app = this;
		this.generateQRCode(this.url);
		this.setUpState();
		this.trackCursorMovement();
	},
	computed: {
		workshopName: {
			get() {
				return this.workshopStore.name;
			},
			set(value) {
				if (value !== this.workshopStore.name) {
					//this.workshopStore.updateName(value);
					this.workshopStore.name = value;
					this.socket.send(JSON.stringify({
						type: 'updateWorkshop',
						data: {
							name: this.workshopStore.name
						}
					}));
					//this.notifyWebSocket();
					//this.updateDatabase();
				}
			}
		},
		url() {
			return location.origin + '/' + this.workshopId;
		},
		userStore() {
			return useUserStore();
		},
		workshopStore() {
			return useWorkshopStore();
		},
		timerStore() {
			return useTimerStore();
		},
		isFacilitator() {
			return this.userStore.id === this.workshopStore.facilitatorId;
		},
	},
	methods: {
		async setUpState() {

			// get the workshop.
			try {
				await this.workshopStore.load(this.workshopId);
			} catch (error) {
				// 404
				alert('not found')
				return;
			}

			// Wait for the user to log in
			this.state = 'join';
			await this.userStore.ensureUserLoggedIn();

			this.joinWebSocket();

		},
		updateWorkshop(data) {
			this.socket.send(JSON.stringify({
				type: 'updateWorkshop',
				data: data
			}));
		},
		joinWebSocket() {
			// validate the entry state.
			// you can only join if you have a unique username.

			this.state = 'joining';

			// first we need to login this browser - and identify it - so we have a unique id to join the socket with.
			// and if we refresh the page - we don't create a new participant.
			// geerate a server token for this browser.
			// Include the code as a query parameter in the WebSocket URL
			const host = import.meta.env.VITE_WS_HOST;
			this.socket = new WebSocket(`${host}/?room=${this.workshopId}&userId=${this.userStore.id}&username=${this.userStore.name}&browserId=${this.userStore.id}`);

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
				// attempt to reconnect
				this.joinWebSocket();
				console.log('WebSocket connection closed');
			};

			this.socket.onerror = (error) => {
				console.error('WebSocket error:', error);
			};

			// experimental
			// ideally we could just sync the workshopstore across all connected clients
			// then updating the state would work for everyone.
			// This works for updating the name - via this.workshopName = 'new name';
			// but we get some infinite looping over the socket with generic subscriber.
			// this.workshopStore.$subscribe((mutation, state) => {
			// 	if (!this.isRemoteUpdate) {
			// 		console.log('workshopStore changed:', mutation, state);
			// 		this.updateWorkshop({
			// 			data: state
			// 		});
			// 	}
			// 	this.isRemoteUpdate = false; // Reset the flag after sending
			// });
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
				case 'data:workshop':
					this.isRemoteUpdate = true;
					this.workshopStore.$patch(data.data.workshop);
					break;
			}
		},
		facilitatorExploreProblemsStart() {
			this.workshopStore.exploreProblemsStart(this.socket);
		},
		broadcast(type, data) {
			console.log('broadcast:', type, data);
			this.socket.send(JSON.stringify({
				type: 'broadcastDataToClients',
				data: {
					type: type,
					data: data
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
				browserId: this.userStore.id,
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
					color: '#' + Math.floor(Math.random() * 16777215).toString(16),
					...client
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

		avatarUrl(email) {
			return avatarUrl(email);
		},
	},
	onUnmounted() {
		window.removeEventListener('mousemove', this.throttledSendCursorPosition);
	}
}
</script>

<style></style>
