<template>
	<div class="device-selection-panel">
		<label for="videoSelect">Select Webcam:</label>
		<select id="videoSelect" :value="selectedVideoDevice" @change="updateVideoDevice">
			<option v-for="device in videoDevices" :key="device.deviceId" :value="device.deviceId">
				{{ device.label || 'Webcam ' + device.deviceId }}
			</option>
		</select>

		<label for="audioSelect">Select Microphone:</label>
		<select id="audioSelect" :value="selectedAudioDevice" @change="updateAudioDevice">
			<option v-for="device in audioDevices" :key="device.deviceId" :value="device.deviceId">
				{{ device.label || 'Microphone ' + device.deviceId }}
			</option>
		</select>
	</div>
</template>

<script>
export default {
	props: {
		selectedVideoDevice: {
			type: String,
			required: true,
		},
		selectedAudioDevice: {
			type: String,
			required: true,
		},
	},
	data() {
		return {
			videoDevices: [],
			audioDevices: [],
		};
	},
	methods: {
		async getMediaDevices() {
			try {
				const devices = await navigator.mediaDevices.enumerateDevices();
				this.videoDevices = devices.filter(device => device.kind === 'videoinput');
				this.audioDevices = devices.filter(device => device.kind === 'audioinput');
			} catch (error) {
				console.error('Error enumerating devices:', error);
			}
		},
		updateVideoDevice(event) {
			this.$emit('update:selectedVideoDevice', event.target.value);
		},
		updateAudioDevice(event) {
			this.$emit('update:selectedAudioDevice', event.target.value);
		},
	},
	mounted() {
		this.getMediaDevices();
	},
};
</script>

<style scoped>
.device-selection-panel {
	margin-bottom: 20px;
}
</style>