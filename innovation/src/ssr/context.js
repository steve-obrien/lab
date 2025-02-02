/**
 * A helper class to manage the SSRContext object.
 * This really just helps standardise how we exchange information.
 * Essentially hiding away the actual structure of the context object.
 * The context object by its nature is passed around by referece.
 * So this class when created provides methods to update the object, and render
 * html state from it - but it does not encapualte it.
 * So the Object passed in during constuct needs to either be a brand new object created form the server.
 * OR during standard development the useSSRContext().
 */
export class SSRContextClass {

	/**
	 * Pass in a new ssr context on the server - or an existing one
	 * Within the vue app new SSRContextClass(useSSRContext())
	 * @param {Object} context - The SSR context object.
	 * @param {Object} context.head - Contains metadata for the HTML head.
	 * @param {string} context.head.title - The title of the page.
	 * @param {Array<Object>} context.head.meta - An array of meta tag attributes.
	 * @param {number} context.httpStatus - The HTTP status code for the response.
	 * @param {Set<string>} context.modules - A set of module identifiers used for rendering.
	 * @param {Array<string>} context.prefetchImages - An array of meta preloadimage tags to be added.
	 */
	constructor(context) {
		this.context = context;
	}

	static createNewSsrObject() {
		return { 
			head: { 
				title: '', 
				meta: [] 
			},
			// Vue & Vite adds the modules propoerty to the context object
			// modules: new Set()
			httpStatus: 200, 
			prefetchImages: [] 
		}
	}


	getSSRContext() {
		return this.context
	}
	
	setHttpStatus(code) {
		this.context.httpStatus = code;
	}

	getHttpStatus() {
		return this.context.httpStatus ? this.context.httpStatus : 200;
	}

	getPreloadLinksHtml(manifest) {
		let preloadLinks = renderPreloadLinks(this.context.modules ?? [], manifest);
		preloadLinks += this.context.prefetchImages.join('');
		return preloadLinks
	}

	getMetaTagsHtml() {
		return renderMetaTags(this.context.head);
	}

}

function renderPreloadLink(file) {
	if (file.endsWith('.js')) {
		return `<link rel="modulepreload" crossorigin href="${file}">`
	} else if (file.endsWith('.css')) {
		return `<link rel="stylesheet" href="${file}">`
	} else if (file.endsWith('.woff')) {
		return ` <link rel="preload" href="${file}" as="font" type="font/woff" crossorigin>`
	} else if (file.endsWith('.woff2')) {
		return ` <link rel="preload" href="${file}" as="font" type="font/woff2" crossorigin>`
	} else if (file.endsWith('.gif')) {
		return ` <link rel="preload" href="${file}" as="image" type="image/gif">`
	} else if (file.endsWith('.jpg') || file.endsWith('.jpeg')) {
		return ` <link rel="preload" href="${file}" as="image" type="image/jpeg">`
	} else if (file.endsWith('.png')) {
		return ` <link rel="preload" href="${file}" as="image" type="image/png">`
	} else {
		return ''
	}
}

function basename(path) {
	return path.split('/').pop().split('\\').pop();
}

function renderPreloadLinks(modules, manifest) {
	let links = ''
	const seen = new Set()
	modules.forEach((id) => {
		const files = manifest[id]
		if (files) {
			files.forEach((file) => {
				if (!seen.has(file)) {
					seen.add(file)
					const filename = basename(file)
					if (manifest[filename]) {
						for (const depFile of manifest[filename]) {
							links += renderPreloadLink(depFile)
							seen.add(depFile)
						}
					}
					links += renderPreloadLink(file)
				}
			})
		}
	})
	return links
}
	
function renderMetaTags(head) {
	let tags = '';
	if (head.title) {
		tags += `<title>${head.title}</title>\n`;
	}
	if (head.meta) {
		head.meta.forEach(attrs => {
			tags += '<meta';
			Object.keys(attrs).forEach(key => {
				tags += ` ${key}="${attrs[key]}"`;
			});
			tags += '>\n';
		});
	}
	return tags;
}