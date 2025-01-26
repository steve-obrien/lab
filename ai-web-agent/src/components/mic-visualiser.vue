<template>
	<canvas ref="micCanvas"></canvas>
</template>

<script>
import { WavRenderer } from '../wavtools/wav_renderer.js';

export default {
	name: 'AiVisualiser',
	data() {
		return {
			animationFrameId: null,
			context2d: null
		}
	},
	props: {
		wavRecorder: Object,
		options: Object
	},
	mounted() {
		this.render()
	},
	methods: {
		render() {
			const micCanvas = this.$refs.micCanvas

			if (micCanvas) {

				const pixelRatio = window.devicePixelRatio || 1;
				micCanvas.width = micCanvas.clientWidth * pixelRatio;
				micCanvas.height = micCanvas.clientHeight * pixelRatio;
				this.context2d = this.context2d || micCanvas.getContext('2d');
				this.context2d.scale(pixelRatio, pixelRatio);
				if (this.context2d) {
					this.context2d.clearRect(0, 0, micCanvas.width, micCanvas.height);
					const result = this.wavRecorder.recording
						? this.wavRecorder.getFrequencies('voice')
						: { values: new Float32Array([0]) };
					WavRenderer.drawSymmetricBarsRounded(
						micCanvas, 
						this.context2d, 
						result.values, 
						'#ccc', 
						this.options.bars ?? 10, 
						0, 
						this.options.barSpacing ?? 8);
				}
			}
			this.animationFrameId = requestAnimationFrame(this.render);
		}
	},
	beforeUnmount() { // Use beforeUnmount if using Vue 3
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
		}
	},
}
</script>