import { defineStore } from 'pinia';

export const useSharedStore = defineStore('shared', {
	state: () => ({
		counter: 0,
		message: 'Hello, world!',
	}),
	actions: {
		increaseCounter() {
			this.counter++;
			this.syncState(); // Sync state on change
		},
		setMessage(newMessage) {
			this.message = newMessage;
			this.syncState();
		},
		syncState() {
			if (this.ws && this.ws.readyState === WebSocket.OPEN) {
				this.ws.send(JSON.stringify({ 
					type: 'updateState', 
					data: {
						state: this.$state 
					}
				}));
			}
		},
		initializeWebSocket(workshopId, userId, username) {
			this.ws = new WebSocket(`ws://localhost:8181?room=${workshopId}&userId=${userId}&username=${username}&browserId=${userId}`);

			this.ws.onopen = () => {
				console.log('Connected to WebSocket');
			};

			this.ws.onmessage = (event) => {
				const packet = JSON.parse(event.data);
				if (packet.type === 'updateState') {
					console.log('UPDATE STATE!', packet.data.state);
					this.$patch(packet.data.state); // Apply received state
				}
			};

			this.ws.onclose = () => {
				console.log('WebSocket disconnected. Reconnecting...');
				setTimeout(() => this.initializeWebSocket(), 1000);
			};
		},
	},
});