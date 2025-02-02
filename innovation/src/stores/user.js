import { defineStore } from 'pinia'

/**
 * Represents and tracks a single workshop with connected clients
 */
export const useUserStore = defineStore('user', {
	state: () => ({
		id: '',
	}),
	actions: {
		login() {
			// this might handshake a session token with the server I guess or log in.
			this.id = localStorage.getItem('browserId')
			if (this.id === null) {
				this.id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
				localStorage.setItem('browserId', this.id);
			}
			return this.id;
		},
	},
})
