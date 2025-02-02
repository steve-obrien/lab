import { defineStore } from 'pinia';

export const useTimerStore = defineStore('timer', {
	state: () => ({
		serverEndTime: null, // UNIX timestamp from server
		remainingTime: 0, // Time left in seconds
		intervalId: null, // as number or null
		onFinish: null // as (() => void) | null // Callback function
	}),

	getters: {
		// arguably a ui function - but this is derrived state
		time() {
			const hours = Math.floor(this.remainingTime / 3600);
			const minutes = Math.floor((this.remainingTime % 3600) / 60);
			const seconds = this.remainingTime % 60;
	
			const formattedHours = hours > 0 ? String(hours).padStart(2, '0') + ':' : '';
			const formattedMinutes = String(minutes).padStart(2, '0');
			const formattedSeconds = String(seconds).padStart(2, '0');
	
			return `${formattedHours}${formattedMinutes}:${formattedSeconds}`;
		},
	},

	actions: {
		initialize(endTimeInMilliseconds, callback) {
			// endTime expected in milliseconds (e.g., Date.now() + 15*60*1000).
			// Convert milliseconds to seconds by dividing by 1000.
			this.serverEndTime = endTimeInMilliseconds;
			this.onFinish = callback || null;

			// Current time in milliseconds
			const currentTime = Date.now();

			// Remaining time in seconds, ensuring it can't go below 0
			this.remainingTime = Math.max(0, Math.floor((this.serverEndTime - currentTime) / 1000));

			this.startCountdown();
		},

		startCountdown() {
			// If there's no time left, don't start
			if (this.remainingTime <= 0) {
				this.remainingTime = 0;
				return;
			}

			// Ensure any existing interval is cleared
			if (this.intervalId) {
				clearInterval(this.intervalId);
			}

			// Decrement remainingTime every second
			const updateRemainingTime = () => {
				this.remainingTime = Math.max(0, this.remainingTime - 1);

				if (this.remainingTime === 0) {
					this.stopCountdown();
					if (this.onFinish) {
						this.onFinish();
					}
				}
			};

			// Start immediately
			updateRemainingTime();

			// Then run every second
			this.intervalId = setInterval(updateRemainingTime, 1000);
		},

		stopCountdown() {
			if (this.intervalId) {
				clearInterval(this.intervalId);
				this.intervalId = null;
			}
		},

	}
});
