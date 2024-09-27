<template>
	<div id="app" class="relative w-full h-screen overflow-hidden">
		<!-- Canvas for combining streams -->
		<canvas ref="canvas" class="hidden"></canvas>

		<!-- Draggable and resizable webcam overlay -->
		<div ref="overlay" :style="overlayStyles" @mousedown="startDrag" @touchstart="startDrag" class="absolute z-10 cursor-move">
			<video ref="overlayVideo" autoplay muted :class="['w-full h-full object-cover', isCircle ? 'rounded-full' : '']"></video>
			<!-- Resize handle -->
			<div ref="resizeHandle" class="absolute bottom-0 right-0 w-4 h-4 bg-white border border-gray-400 cursor-se-resize" @mousedown.stop="startResize" @touchstart.stop="startResize"></div>
		</div>

		<!-- Device Selection Panel -->
		<DeviceSelector v-model:videoDevice="selectedVideoDevice" v-model:audioDevice="selectedAudioDevice" />

		<!-- Control buttons -->
		<div class="fixed bottom-4 left-4 flex space-x-2">
			<button v-if="!isRecording" @click="startRecording" class="px-4 py-2 bg-blue-500 text-white rounded">
				Start Recording
			</button>
			<button v-if="isRecording" @click="stopRecording" class="px-4 py-2 bg-red-500 text-white rounded">
				Stop Recording
			</button>
			<button v-if="videoURL && !isUploading" @click="uploadVideo" class="px-4 py-2 bg-green-500 text-white rounded">
				Upload Video
			</button>
		</div>

		<!-- Shape toggle button -->
		<button
		@click="toggleShape"
		class="fixed bottom-4 right-4 px-4 py-2 bg-gray-500 text-white rounded">
			Toggle Shape
		</button>

		<!-- Video preview -->
		<div v-if="videoURL" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center">
			<video autoplay :src="videoURL" controls class="max-w-full max-h-full"></video>
		</div>
	</div>
</template>

<script>
import DeviceSelector from './DeviceSelector.vue';

export default {
	name: 'ScreenRecorder',
	components: {
		DeviceSelector,
	},
	data() {
		return {
			screenStream: null,
			webcamStream: null,
			recorder: null,
			chunks: [],
			videoURL: null,
			isRecording: false,
			isDragging: false,
			isResizing: false,
			dragStartX: 0,
			dragStartY: 0,
			resizeStartX: 0,
			resizeStartY: 0,
			overlayPosition: { x: 20, y: 20 },
			overlaySize: { width: 200, height: 150 },
			isCircle: false,
			isUploading: false,
			selectedVideoDevice: null,
			selectedAudioDevice: null,
		};
	},
	computed: {
		overlayStyles() {
			return {
				top: `${this.overlayPosition.y}px`,
				left: `${this.overlayPosition.x}px`,
				width: `${this.overlaySize.width}px`,
				height: `${this.overlaySize.height}px`,
			};
		},
	},
	methods: {
		async startRecording() {
			try {

				const constraints = {
					video: {
						deviceId: this.selectedVideoDevice ? { exact: this.selectedVideoDevice } : undefined,
					},
					audio: {
						deviceId: this.selectedAudioDevice ? { exact: this.selectedAudioDevice } : undefined,
					},
				};

				// Capture screen
				this.screenStream = await navigator.mediaDevices.getDisplayMedia({
					video: true,
					audio: false, // Set to true if you want to capture system audio
				});

				// Capture webcam
				this.webcamStream = await navigator.mediaDevices.getUserMedia(constraints);

				// Set the webcam video source
				this.$refs.overlayVideo.srcObject = this.webcamStream;

				// Start combining streams
				this.combineStreams();

				this.isRecording = true;
			} catch (error) {
				console.error('Error accessing media devices.', error);
				alert('Error accessing media devices.');
			}
		},
		combineStreams() {
			const canvas = this.$refs.canvas;
			const ctx = canvas.getContext('2d');

			// Set canvas dimensions
			canvas.width = window.screen.width;
			canvas.height = window.screen.height;

			// Create video elements
			const screenVideo = document.createElement('video');
			screenVideo.srcObject = this.screenStream;
			screenVideo.onloadedmetadata = () => {
				screenVideo.play();
			};

			const overlayVideo = this.$refs.overlayVideo;
			overlayVideo.onloadedmetadata = () => {
				overlayVideo.play();
			};

			const drawFrame = () => {
				if (!this.isRecording) return;

				// Draw screen
				ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);

				// Draw webcam overlay
				const { x, y } = this.overlayPosition;
				const { width, height } = this.overlaySize;
				ctx.drawImage(overlayVideo, x, y, width, height);

				requestAnimationFrame(drawFrame);
			};

			Promise.all([
				new Promise((resolve) => {
					screenVideo.onloadedmetadata = resolve;
				}),
				new Promise((resolve) => {
					overlayVideo.onloadedmetadata = resolve;
				}),
			]).then(() => {
				drawFrame();
			});

			// Start recording the canvas
			const canvasStream = canvas.captureStream(30); // 30 FPS
			const mimeType = 'video/webm';

			if (!MediaRecorder.isTypeSupported(mimeType)) {
				console.error('MIME type or codec not supported:', mimeType);
				alert('Your browser does not support the required video format.');
				return;
			}

			// Initialize the recorder with the chosen MIME type
			this.recorder = new MediaRecorder(canvasStream, { mimeType });

			// Initialize chunks array
			this.chunks = [];

			this.recorder.ondataavailable = (event) => {
				if (event.data && event.data.size > 0) {
					this.chunks.push(event.data);
				}
			};

			this.recorder.onstop = this.handleStopRecording;

			this.recorder.start();
		},
		handleStopRecording() {
			const blob = new Blob(this.chunks, { type: this.recorder.mimeType });
			console.log('Recording stopped. Blob size:', blob.size);
			this.videoURL = URL.createObjectURL(blob);
		},
		stopRecording() {
			this.isRecording = false;

			// Request the final data
			this.recorder.requestData();

			this.recorder.stop();

			// Stop all tracks
			this.screenStream.getTracks().forEach((track) => track.stop());
			this.webcamStream.getTracks().forEach((track) => track.stop());
		},
		/**
		 * Upload the video to the server
		 */
		async uploadVideo() {
			if (!this.videoURL) return;

			this.isUploading = true;

			const blob = await fetch(this.videoURL).then((r) => r.blob());
			const chunkSize = 1024 * 1024; // 1MB
			const totalSize = blob.size;
			let offset = 0;
			let chunkIndex = 0;

			while (offset < totalSize) {
				const chunk = blob.slice(offset, offset + chunkSize);
				const formData = new FormData();
				formData.append('file', chunk);
				formData.append('index', chunkIndex);
				formData.append('totalChunks', Math.ceil(totalSize / chunkSize));

				await fetch('YOUR_UPLOAD_ENDPOINT', {
					method: 'POST',
					body: formData,
				});

				offset += chunkSize;
				chunkIndex += 1;
			}

			alert('Upload complete!');
			this.isUploading = false;
		},
		toggleShape() {
			this.isCircle = !this.isCircle;
		},
		startDrag(event) {
			event.preventDefault();
			this.isDragging = true;
			const clientX = event.clientX || event.touches[0].clientX;
			const clientY = event.clientY || event.touches[0].clientY;
			this.dragStartX = clientX - this.overlayPosition.x;
			this.dragStartY = clientY - this.overlayPosition.y;

			window.addEventListener('mousemove', this.drag);
			window.addEventListener('touchmove', this.drag);
			window.addEventListener('mouseup', this.stopDrag);
			window.addEventListener('touchend', this.stopDrag);
		},
		drag(event) {
			if (!this.isDragging) return;
			const clientX = event.clientX || event.touches[0].clientX;
			const clientY = event.clientY || event.touches[0].clientY;
			this.overlayPosition.x = clientX - this.dragStartX;
			this.overlayPosition.y = clientY - this.dragStartY;
		},
		stopDrag() {
			this.isDragging = false;
			window.removeEventListener('mousemove', this.drag);
			window.removeEventListener('touchmove', this.drag);
			window.removeEventListener('mouseup', this.stopDrag);
			window.removeEventListener('touchend', this.stopDrag);
		},
		startResize(event) {
			event.preventDefault();
			this.isResizing = true;
			this.resizeStartX = event.clientX || event.touches[0].clientX;
			this.resizeStartY = event.clientY || event.touches[0].clientY;

			window.addEventListener('mousemove', this.resize);
			window.addEventListener('touchmove', this.resize);
			window.addEventListener('mouseup', this.stopResize);
			window.addEventListener('touchend', this.stopResize);
		},
		resize(event) {
			if (!this.isResizing) return;
			const clientX = event.clientX || event.touches[0].clientX;
			const clientY = event.clientY || event.touches[0].clientY;
			const deltaX = clientX - this.resizeStartX;
			const deltaY = clientY - this.resizeStartY;
			this.overlaySize.width += deltaX;
			this.overlaySize.height += deltaY;
			this.resizeStartX = clientX;
			this.resizeStartY = clientY;
		},
		stopResize() {
			this.isResizing = false;
			window.removeEventListener('mousemove', this.resize);
			window.removeEventListener('touchmove', this.resize);
			window.removeEventListener('mouseup', this.stopResize);
			window.removeEventListener('touchend', this.stopResize);
		},
	},
};
</script>

<style scoped>
/* Additional styles if needed */
</style>