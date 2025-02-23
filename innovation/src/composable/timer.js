import { ref, computed, watch } from 'vue';

export function useTimer(stopTime, timerStatus, onComplete) {
	const remainingTime = ref(0);
	const intervalId = ref(null);

	const timer = computed(() => {
		const hours = Math.floor(remainingTime.value / 3600);
		const minutes = Math.floor((remainingTime.value % 3600) / 60);
		const seconds = remainingTime.value % 60;

		const formattedHours = hours > 0 ? String(hours).padStart(2, '0') + ':' : '';
		const formattedMinutes = String(minutes).padStart(2, '0');
		const formattedSeconds = String(seconds).padStart(2, '0');

		return `${formattedHours}${formattedMinutes}:${formattedSeconds}`;
	});

	const updateRemainingTime = () => {
		console.log('tick')
		const currentTime = Date.now();
		console.log('remainingTime',stopTime, Math.max(0, Math.floor((stopTime - currentTime) / 1000)))
		remainingTime.value = Math.max(0, Math.floor((stopTime - currentTime) / 1000));

		if (remainingTime.value === 0) {
			clearInterval(intervalId.value);
			intervalId.value = null;
			if (onComplete) {
				onComplete(); // Trigger the callback
			}
		}
	};

	watch(timerStatus, (newStatus) => {
		console.log('timerStatus WATCH TRIGGERED', newStatus);
		if (newStatus === 'running') {
			if (intervalId.value) {
				clearInterval(intervalId.value);
			}
			updateRemainingTime();
			intervalId.value = setInterval(updateRemainingTime, 1000);
		} else {
			clearInterval(intervalId.value);
			intervalId.value = null;
		}
	});

	// Expose timer properties
	return {
		timer,
		remainingTime,
		timerStatus
	};
}
