<template>
	<div>
		HELLO!
		<video ref="video" autoplay></video>
	</div>
</template>

<script>
export default {
	mounted() {
		this.startWebcam();
	},
	methods: {
		async startWebcam() {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: true,
					audio: false,
				});
				this.$refs.video.srcObject = stream;
			} catch (error) {
				console.error('Error accessing webcam:', error);
			}
		},
	},
};
</script>

<style>
/* Add your styles here */
</style>