<template>
	<canvas ref="aiCanvas"></canvas>
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
		wavStreamPlayer: Object,
		type: {
			type: String,
			default: 'waveform'
		}
	},
	mounted() {
		this.render()
	},
	methods: {
		render() {
			const aiCanvas = this.$refs.aiCanvas;
			if (aiCanvas) {
				const pixelRatio = window.devicePixelRatio || 1;
				aiCanvas.width = aiCanvas.clientWidth * pixelRatio;
				aiCanvas.height = aiCanvas.clientHeight * pixelRatio;
				this.context2d = this.context2d || aiCanvas.getContext('2d');
				this.context2d.scale(pixelRatio, pixelRatio);
				if (this.context2d) {
					this.context2d.clearRect(0, 0, aiCanvas.width, aiCanvas.height);
					const result = this.wavStreamPlayer.analyser ? this.wavStreamPlayer.getFrequencies('voice') : { values: new Float32Array([0]) };
					if (this.type == 'waveform') {
						WavRenderer.drawWaveform(aiCanvas, this.context2d, result.values, '#D93A63'); //var(--color-primary)
					} else if (this.type == 'bars') {
						WavRenderer.drawSymmetricBarsRounded(aiCanvas, this.context2d, result.values, '#D93A63', 20, 0, 8);
					} else if (this.type == 'circle') {
						WavRenderer.drawWaveformCircle(aiCanvas, this.context2d, result.values, '#D93A63', 20, 0, 8);
					}
				}
				
			}
			this.animationFrameId = window.requestAnimationFrame(this.render);
		},
	},
	beforeUnmount() { // Use beforeUnmount if using Vue 3
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
		}
	},
}
</script>