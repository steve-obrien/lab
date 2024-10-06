<template>
	<div id="app">
		<h1>Screen Recorder with Webcam</h1>
		<ScreenRecorder />
	</div>
</template>

<script>
import ScreenRecorder from './components/ScreenRecorder.vue';

export default {
	name: 'App',
	components: {
		ScreenRecorder,
	},
};
</script>

<style>
/* Add your styles here */
</style>