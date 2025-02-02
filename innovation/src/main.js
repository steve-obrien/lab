// app.js (shared between server and client - univseral)
import './assets/main.css'

// import { createSSRApp } from 'vue'
import { createApp as createSpaApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

export function createApp() {
	// const app = createSSRApp(App)
	const app = createSpaApp(App)
	const pinia = createPinia()
	app.use(pinia)
	app.use(router)
	
	// global components
	// import PrimaryButton from './components/PrimaryButton.vue';
	// app.component('PrimaryButton', PrimaryButton);

	return { app, router, pinia };
}