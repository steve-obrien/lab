import { defineStore } from 'pinia'

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
	}),
	actions: {
		async register() {
			const response = await fetch('http://localhost:8181/api/register', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ name: this.name, email: this.email, password: this.password })
			});
			const json = await response.json();
			const user = json.data.user;
			this.id = user.id;
			this.name = user.name;
			this.email = user.email;
			this.password = user.password;
			return response;
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

				const data = await response.json();
				//this.user = data.user; // Store user in Pinia state
				this.id = data.user.id;
				this.name = data.user.name;
				this.email = data.user.email;
				this.password = '';


			} catch (error) {
				console.error("Failed to fetch user:", error.message);
			}
		},

		async refreshAccessToken() {
			try {
				const response = await fetch("http://localhost:8181/api/refresh", {
					method: "POST",
					credentials: "include", // Sends the refresh token cookie automatically
				});

				if (!response.ok) throw new Error("Token refresh failed");

				const data = await response.json();
				this.accessToken = data.accessToken;
				return true; // Token refreshed successfully
			} catch (error) {
				console.error("Failed to refresh token:", error.message);
				this.logout(); // Log out if refresh fails
				return false;
			}
		},

		// we could supply the password here rather than having it hang about in the state
		async login() {

			const response = await fetch('http://localhost:8181/api/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email: this.email, password: this.password }),
				credentials: "include",
			});
			const data = await response.json();
			// remove the password from the user object
			this.password = '';

			return this.id;
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
		}
	},
})
