export default function defineServerApi(app) {

	app.get('/api/hello', (req, res) => {
		res.send('Hello World')
	})
}
