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
	pinia.use(function mutationWarningPlugin({ store }) {
		store.$subscribe((mutation, state) => {
			console.log('mutation', mutation)
			if (mutation.type == 'direct') {
				console.log('Careful with direct mutation!', mutation)
			}
			// if (!mutation.events.some(event => event.type === 'action')) {
			// 	console.warn(
			// 		`[Pinia Warning]: Direct mutation detected in store "${store.$id}". ` +
			// 		`Mutate state inside actions instead.`
			// 	);
			// }
		});
	});

	app.use(pinia)
	app.use(router)

	// global components
	// import PrimaryButton from './components/PrimaryButton.vue';
	// app.component('PrimaryButton', PrimaryButton);

	return { app, router, pinia };
}