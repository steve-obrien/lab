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
					type: 'server:updateState', 
					data: {
						state: this.$state 
					}
				}));
			}
		},
		initializeWebSocket(socket) {
			this.ws = socket
		},
	},
});