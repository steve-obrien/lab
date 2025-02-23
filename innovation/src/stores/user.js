import { defineStore } from 'pinia'
import { watch } from 'vue';
import { avatarUrl } from '../lib/utils';
/**
 * Represents and tracks a single workshop with connected clients
 */
export const useUserStore = defineStore('user', {
	state: () => ({
		id: '',
		name: '',
		email: '',
		password: '',
		accessToken: null,
		user: null,
		showLoginDialog: false,
	}),
	getters: {
		isLoggedIn: (state) => state.accessToken !== null,
		isNotLoggedIn: (state) => state.accessToken === null,
		avatarUrl: (state) => {
			if (!state.email) return '';
			return avatarUrl(state.email);
		},
	},

	actions: {
		showLogin(onSuccessLogin) { this.$patch({ showLoginDialog: true, onSuccessLogin }) },
		hideLogin() { this.$patch({ showLoginDialog: false }) },
		async register(name, email, password) {
			const response = await fetch('http://localhost:8181/api/register', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({ name, email, password })
			});
			const json = await response.json();
			if (json.status == 'success') {
				Object.assign(this, json.data.user)
			}
			return json;
		},

		async authRefresh() {
			console.log('auth')
			if (!this.accessToken) {
				await this.refreshAccessToken();
			}
			if (this.accessToken) {
				await this.fetchUser();
			}
		},

		async fetchUser() {
			if (!this.accessToken) return;
			try {
				const response = await fetch("http://localhost:8181/api/me", {
					method: "GET",
					headers: {
						"Authorization": `Bearer ${this.accessToken}`,
						"Content-Type": "application/json",
					},
					credentials: "include", // Ensures cookies (if needed) are sent
				});
				if (!response.ok) {
					throw new Error("Failed to fetch user");
				}
				const json = await response.json();
				if (json.status == 'success') {
					this.$patch(json.data.user)
					// Object.assign(this, json.data.user)
				}
			} catch (error) {
				console.error("Failed to fetch user:", error.message);
			}
		},

		async refreshAccessToken() {
			try {
				const response = await fetch(import.meta.env.VITE_API_HOST + "/api/refresh", {
					method: "POST",
					credentials: "include", // Sends the refresh token cookie automatically
				});
				if (!response.ok) throw new Error("Token refresh failed");
				const data = await response.json();
				this.$patch({accessToken: data.accessToken})

				return true; // Token refreshed successfully
			} catch (error) {
				console.error("Failed to refresh token:", error.message);
				this.logout(); // Log out if refresh fails
				return false;
			}
		},

		// we could supply the password here rather than having it hang about in the state
		async login(email, password) {
			const response = await fetch('http://localhost:8181/api/login', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({ email: email, password: password }),
				credentials: "include",
			});
			const json = await response.json();
			if (json.status == 'success') {
				this.$patch((state) => {
					state.accessToken = json.data.accessToken;
					Object.assign(state, json.data.user)
				})
			}
			return json;
		},

		async logout() {
			const response = await fetch('http://localhost:8181/api/logout', {
				method: 'POST',
				credentials: "include",
			});
			this.accessToken = null;
			this.id = '';
			this.name = '';
			this.email = '';
			this.password = '';
		},

		async ensureUserLoggedIn() {
			await this.authRefresh();
			if (this.isLoggedIn) return;
			// show the user login modal
			this.showLogin();
			await new Promise((resolve) => {
				const unwatch = watch(() => this.isLoggedIn, (isLoggedIn) => {
					if (isLoggedIn) {
						this.hideLogin();
						unwatch(); // Stop watching once logged in
						resolve();
					}
				});
			});
		},
	},
})
