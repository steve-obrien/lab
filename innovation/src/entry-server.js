/**
 * renders the app using the framework's SSR API
 */
import { renderToString } from 'vue/server-renderer'
import { createApp } from './main.js'

/**
 * This function renders the client side app to a string.
 * It returns the html string and the pinia data.
 */
export async function render(url, ssrContext) {
	console.log('RENDER SERVER');
	
	const { app, router, pinia } = createApp()

	// set the router to the desired URL before rendering
	await router.push(url)
	await router.isReady()

	const appHtml = await renderToString(app, ssrContext)
	const piniaData = JSON.stringify(pinia.state.value);

	return [appHtml, piniaData];
}