<template>
	<div>
		<video ref="video" autoplay></video>
		<button @click="startRecording">Start Recording</button>
		<button @click="stopRecording">Stop Recording</button>
		<a :href="downloadLink" download="recording.webm" v-if="downloadLink">Download Recording</a>
	</div>
</template>

<script>
export default {
	data() {
		return {
			mediaRecorder: null,
			recordedChunks: [],
			downloadLink: null,
		};
	},
	methods: {
		async startRecording() {
			try {
				const displayStream = await navigator.mediaDevices.getDisplayMedia({
					video: true,
					audio: true,
				});

				this.$refs.video.srcObject = displayStream;

				this.mediaRecorder = new MediaRecorder(displayStream, {
					mimeType: 'video/webm; codecs=vp9',
				});

				this.mediaRecorder.ondataavailable = (event) => {
					if (event.data.size > 0) {
						this.recordedChunks.push(event.data);
					}
				};

				this.mediaRecorder.onstop = this.handleStop;
				this.mediaRecorder.start();
			} catch (error) {
				console.error('Error starting screen recording:', error);
			}
		},
		stopRecording() {
			if (this.mediaRecorder) {
				this.mediaRecorder.stop();
				const tracks = this.$refs.video.srcObject.getTracks();
				tracks.forEach((track) => track.stop());
			}
		},
		handleStop() {
			const blob = new Blob(this.recordedChunks, {
				type: 'video/webm',
			});
			this.downloadLink = URL.createObjectURL(blob);
			this.recordedChunks = [];
		},
	},
};
</script>

<style>
/* Add your styles here */
</style>