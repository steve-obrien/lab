/**
 * mounts the app to a DOM element
 */
import { createApp } from './main.js'

const { app, router, pinia } = createApp()

// Hydrate pinia state
// pinia.state.value = window.__pinia

// wait until router is ready before mounting to ensure hydration match
router.isReady().then(() => {
	app.mount('#app')
	console.log('hydrated')
})