import twilioClient from './src/twilioClient.js';

const definition = {
	name: 'get_weather',
	description:
		'Retrieves the weather for a given lat, lng coordinate pair. Specify a label for the location.',
	parameters: {
		type: 'object',
		properties: {
			lat: {
				type: 'string',
				description: 'Latitude',
			},
			lng: {
				type: 'string',
				description: 'Longitude',
			},
			location: {
				type: 'string',
				description: 'Name of the location',
			},
		},
		required: ['lat', 'lng', 'location'],
	}
}

async function get_weather({ lat, lng, location }) {

	console.log('params:', lat, lng, location);
	//setMarker({ lat, lng, location }); (used to set cords on a map)
	//setCoords({ lat, lng, location });
	const result = await fetch(
		`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`
	);
	const json = await result.json();
	const weatherCodeDescriptions = {
		0: "Clear sky",
		1: "Mainly clear",
		2: "Partly cloudy",
		3: "Overcast",
		45: "Fog",
		48: "Depositing rime fog",
		51: "Light drizzle",
		53: "Moderate drizzle",
		55: "Dense drizzle",
		61: "Slight rain",
		63: "Moderate rain",
		65: "Heavy rain",
		71: "Slight snow fall",
		73: "Moderate snow fall",
		75: "Heavy snow fall",
		80: "Slight rain showers",
		81: "Moderate rain showers",
		82: "Violent rain showers",
		95: "Thunderstorm"
	};

	const weatherCode = json.current_weather.weathercode;
	const weatherDescription = weatherCodeDescriptions[weatherCode] || "Unknown weather";

	const out = {
		"wmo_code": weatherCode,
		"description": weatherDescription,
		"temperature": json.current_weather.temperature + ' ' + json.current_weather_units.temperature,
		"wind_speed": json.current_weather.windspeed + ' ' + json.current_weather_units.windspeed
	}
	// setMarker({ lat, lng, location, temperature, wind_speed });

	return out;
}

get_weather.definition = definition;

export { get_weather };

/**
 * @param {import('@openai/realtime-api-beta').RealtimeClient} client
 */
function addTools(client, callSid) {


	/**
	 * Enable the AI to get the weather
	 */
	client.addTool(get_weather.definition, get_weather);

	client.addTool(
		{
			name: 'sort_code_lookup',
			description:
				'Looks up a bank account sort code to check it is valid and return information on the specific bank allowing the user to confirm',
			parameters: {
				type: 'object',
				properties: {
					sort_code: {
						type: 'string',
						description: 'The sort code for example: 40-14-21',
					},
				},
				required: ['sort_code'],
			},
		},
		async ({ sort_code }) => {

			return {
				"result": "VALID",
				"bank": "HSBC, Downend branch"
			}

		}
	);

	client.addTool(
		{
			name: 'account_number_lookup',
			description:
				'Looks up a bank account number to check it is valid',
			parameters: {
				type: 'object',
				properties: {
					sort_code: {
						type: 'string',
						description: 'The sort code for example: 40-14-21',
					},
					account_number: {
						type: 'number',
						description: 'The account number',
					},
				},
				required: ['sort_code', 'account_number'],
			},
		},
		async ({ sort_code, account_number }) => {

			return {
				"result": "VALID",
				"bank": "HSBC"
			}

		}
	);

	client.addTool(
		{
			name: 'donation',
			description:
				'Registers a direct debit subscription payment',
			parameters: {
				type: 'object',
				properties: {
					sort_code: {
						type: 'string',
						description: 'The sort code for example: 40-14-21',
					},
					account_number: {
						type: 'number',
						description: 'The account number',
					},
					amount: {
						type: 'number',
						description: 'The donation amount in pounds sterling',
					},
				},
				required: ['sort_code', 'account_number', 'amount'],
			},
		},
		async ({ sort_code, account_number, amount }) => {

			return {
				"result": "success"
			}

		}
	);

	client.addTool(
		{
			name: 'website_lookup',
			description: 'Visit a website and return its content',
			parameters: {
				type: 'object',
				properties: {
					url: {
						type: 'string',
						description: 'The URL of the website to visit',
					},
				},
				required: ['url'],
			},
		},
		async ({ url }) => {
			const response = await fetch(url);
			const webpage = await response.text();
			return { content: webpage };
		}
	);

	client.addTool(
		{
			name: 'website_click',
			description: 'Click on a specific element on a website',
			parameters: {
				type: 'object',
				properties: {
					url: {
						type: 'string',
						description: 'The URL of the website to visit',
					},
					selector: {
						type: 'string',
						description: 'The CSS selector of the element to click',
					},
					content: {
						type: 'string',
						description: 'The content of the website to use - passed into JSDOM(content)',
					},
				},
				required: ['url', 'selector', 'content'],
			},
		},
		async ({ url, selector, content }) => {
			const dom = new JSDOM(content);
			const element = dom.window.document.querySelector(selector);
			if (element) {
				element.click();
				return { result: 'success', message: 'Element clicked' };
			} else {
				return { result: 'failure', message: 'Element not found' };
			}
		}
	);


	client.addTool(
		{
			name: 'hangup',
			description: 'Do not call this function without saying goodbye first',
		},
		async () => {
			twilioClient.calls(callSid)
				.update({ status: 'completed' })
				.then(call => {
					console.log(`Call ${call.sid} has been terminated.`)
					client.disconnect();
				})
				.catch(err => {
					console.error(err);
					client.disconnect();
				});
		}
	)


}

export { addTools }