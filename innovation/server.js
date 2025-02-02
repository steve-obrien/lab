import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { createServer as createViteServer } from 'vite'
import defineServerApi from './server/api.js';
import dotenv from 'dotenv';
import { SSRContextClass } from './src/ssr/context.js'


// Load environment variables.
// This is used to set the NODE_ENV variable.
// process.env.NODE_ENV is used to determine the mode of the server.
// NODE_ENV=development or NODE_ENV=production
// in the .env file
const result = dotenv.config();
if (result.error) {
	throw new Error(".env file not found or could not be loaded. Please ensure it exists and is properly configured. Use the .env.example");
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const renderTemplateHtml = (template, appHtml, ssrContext, manifest, piniaData) => {
	const ssr = new SSRContextClass(ssrContext)
	const html = template
		.replace(`<!--meta-tags-->`, () => ssr.getMetaTagsHtml() || '')
		.replace(`<!--ssr-html-->`, () => appHtml)
		.replace(`<!--preload-links-->`, () => ssr.getPreloadLinksHtml(manifest))
		.replace(`<!--ssr-pinia-->`, () => 'window.__pinia = ' + piniaData)

	return html
}

/**
 * The production server
 * @param {*} expressApp 
 */
async function createServerProduction(expressApp) {

	console.log('PRODUCTION MODE');

	// Define API endpoints
	defineServerApi(expressApp);
	console.log('DEFINED API');

	// Add compression middleware
	expressApp.use((await import('compression')).default())
	// Setup static file server
	expressApp.use((await import('serve-static')).default(path.resolve(__dirname, 'dist/client'), {
		index: false,
	}))

	// Catch-all route for other requests
	expressApp.use('*', async (req, res) => {
		const url = req.originalUrl
		console.log('Production mode handle request', url);

		try {
			// 1. Read dist/client/index.html
			let template = fs.readFileSync(path.resolve(__dirname, 'dist/client/index.html'), 'utf-8')

			// 2. Load the server entry
			const { render } = await import('./dist/server/entry-server.js')

			// 3. Load manifest file
			//    This file is created by Vite during the build process
			const manifest = JSON.parse(fs.readFileSync(
				path.resolve(__dirname, 'dist/client/.vite/ssr-manifest.json'), 'utf-8'
			))

			// 4. Create a new SSR context object
			//    This Object is modified by the vue app to give us http status code and meta tags etc
			const ssrContext = SSRContextClass.createNewSsrObject()
			const ssr = new SSRContextClass(ssrContext)
			
			// 5. Render the app HTML
			//    This runs the client application on the server and returns the HTML
			//    Plus additional data
			const [appHtml, piniaData] = await render(url, ssr.context)

			// 6. Inject the app-rendered HTML into the template
			const html = renderTemplateHtml(template, appHtml, ssr.context, manifest, piniaData)

			// 7. Send the rendered HTML back
			res.status(ssr.getHttpStatus()).set({ 'Content-Type': 'text/html' }).end(html)

		} catch (e) {
			if (e.code === 404) {
				console.error('404: ERROR', e)
				res.status(404).end('Page not found')
			} else {
				console.error('500: ERROR', e)
				res.status(500).end('Internal Server Error')
			}
		}
	})

}

/**
 * The development server
 * @param {*} expressApp 
 */
async function createServerDevelopment(expressApp) {

	console.log('DEVELOPMENT MODE');
	// Add compression middleware
	// expressApp.use(compression());

	// Development mode: use Vite server
	// Create Vite server in middleware mode and configure the app type as
	// 'custom', disabling Vite's own HTML serving logic so parent server
	// can take control
	const vite = await createViteServer({
		server: { middlewareMode: true },
		appType: 'custom'
	})

	expressApp.use(vite.middlewares)

	// Define API endpoints
	defineServerApi(expressApp);

	expressApp.use('*', async (req, res, next) => {
		const url = req.originalUrl
		console.info('Dev mode handle request', url);

		try {
			// 1. Read index.html
			let template = fs.readFileSync(path.resolve(__dirname, 'index.html'),'utf-8')

			// 2. Apply Vite HTML transforms. This injects the Vite HMR client
			template = await vite.transformIndexHtml(url, template)

			// 3. Load the server entry
			const { render } = await vite.ssrLoadModule('/src/entry-server.js')

			// 4. Create a new SSR context object
			//    This Object is modified by the vue app to give us http status code and meta tags etc
			const ssrContext = SSRContextClass.createNewSsrObject()
			const ssr = new SSRContextClass(ssrContext)
			
			// 5. Render the app HTML
			//    This runs the client application on the server and returns the HTML
			//    Plus additional data
			const [appHtml, piniaData] = await render(url, ssr.context)

			// 6. Inject the app-rendered HTML into the template
			const html = renderTemplateHtml(template, appHtml, ssr.context, {}, piniaData)

			// 7. Send the rendered HTML back
			res.status(ssr.getHttpStatus()).set({ 'Content-Type': 'text/html' }).end(html)
		} catch (e) {
			// If an error is caught, let Vite fix the stack trace so it maps back
			// to your actual source code.
			vite.ssrFixStacktrace(e)
			console.log(e, 'ERROR');
			next(e)
		}
	})
}

async function createServer() {
	const expressApp = express()

	if (process.env.NODE_ENV === 'production') {
		createServerProduction(expressApp, true)
	} else {
		createServerDevelopment(expressApp, false)
	}

	expressApp.listen(process.env.PORT, () => {
		console.log('Server is listening on http://localhost:' + process.env.PORT);
	})
}

createServer()