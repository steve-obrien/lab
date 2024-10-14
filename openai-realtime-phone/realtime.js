import Fastify from 'fastify';
import WebSocket from 'ws';
import fs from 'fs';
import dotenv from 'dotenv';
import fastifyFormBody from '@fastify/formbody';
import fastifyWs from '@fastify/websocket';
import twilio from 'twilio';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { RealtimeClient } from '@openai/realtime-api-beta';
import registerInstructionsRoutes from './instructions.js';
import fetch from 'node-fetch';

// Load environment variables from .env file
dotenv.config();

// Retrieve the OpenAI API key from environment variables. You must have OpenAI Realtime API access.
const { OPENAI_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_TWIML_APP_SID } = process.env;

if (!OPENAI_API_KEY) {
	console.error('Missing OpenAI API key. Please set it in the .env file.');
	process.exit(1);
}

// Twilio credentials
const TWILIO_PHONE_NUMBER = '+441202144991'; // Your Twilio phone number

// Initialize Twilio client
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

let instructions = 'You are a sales agent for Newicon.net trying to sell software app development.';

// Initialize Fastify
const fastify = Fastify();
fastify.register(fastifyFormBody);
fastify.register(fastifyWs);
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log(__dirname);
// Register static file serving
fastify.register(fastifyStatic, {
	root: path.join(__dirname, 'public'), // Ensure 'public' is the directory where 'index.html' is located
	prefix: '/', // Optional: default is '/'
});

registerInstructionsRoutes(fastify);

// Constants
const VOICE = 'shimmer';
const PORT = process.env.PORT || 5050; // Allow dynamic port assignment


// List of Event Types to log to the console. See OpenAI Realtime API Documentation. (session.updated is handled separately.)
const LOG_EVENT_TYPES = [
	'response.content.done',
	'rate_limits.updated',
	'response.done',
	'input_audio_buffer.committed',
	'input_audio_buffer.speech_stopped',
	'input_audio_buffer.speech_started',
	'session.created'
];

///89ff-2a00-23c7-8a8a-f401-9c5f-3bc4-77b8-abd8
const host = process.env.HOST

let logWs = null;

// Route to handle outbound call requests
fastify.post('/make-call', async (request, reply) => {
	const to = request.body.to;
	instructions = request.body.instructions;

	try {
		const call = await twilioClient.calls.create({
			url: `https://${host}/outbound-call`, // TwiML URL
			to,
			from: TWILIO_PHONE_NUMBER,
			record: true,
			statusCallback: `https://${host}/twilio-status-callback`,
		});

		reply.send({ message: 'Call initiated', callSid: call.sid });
	} catch (error) {
		console.error('Error making call:', error);
		reply.status(500).send({ error: 'Failed to make call' });
	}
});

// TwiML for outbound call
fastify.all('/outbound-call', async (request, reply) => {
	const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
						<Response>
							<Connect>
								<Stream url="wss://${request.headers.host}/media-stream" />
							</Connect>
						</Response>`;

	reply.type('text/xml').send(twimlResponse);
});

// WebSocket route for media-stream
fastify.register(async (fastify) => {
	fastify.get('/media-stream', { websocket: true }, async (twilioWs, req) => {

		let streamSid = null;

		console.log('Client connected');

		const client = new RealtimeClient({
			apiKey: OPENAI_API_KEY
		});

		// Change the defaultFrequency to 8,000 Hz
		//client.conversation.defaultFrequency = 8_000;

		// This timeout is important - the twilio connection must be established before the first message is sent
		// Otherwise we do not get the streamSid back from twilio.
		// We should see the following in the logs: 
		// Client connect 
		// Incoming stream has started 
		// Received non-media event: connected
		// Incoming stream has started {start object containing streamSid}
		setTimeout(async () => {
			await client.connect();
			client.updateSession({
				turn_detection: {
					type: 'server_vad',
					threshold: 0.5,
					prefix_padding_ms: 300,
					silence_duration_ms: 1000
				},
				input_audio_format: 'g711_ulaw',
				output_audio_format: 'g711_ulaw',
				voice: VOICE,
				instructions: instructions,
				modalities: ["text", "audio"],
				temperature: 0.8,
				input_audio_transcription: { model: 'whisper-1' }
			});
			addTools(client)
		}, 250);


		client.realtime.on('server.response.audio.delta', (response) => {
			// console.log('Sending audio delta to Twilio:', response);
			// this keeps sending even when cancelled?
			const audioDelta = {
				event: 'media',
				streamSid: streamSid,
				media: { payload: Buffer.from(response.delta, 'base64').toString('base64') }
			};

			// console.log('Sending audio delta to Twilio:', audioDelta);
			twilioWs.send(JSON.stringify(audioDelta));

		});

		client.on('conversation.updated', async ({ item, delta }) => {
			// Send log to logWs
			if (logWs && logWs.readyState === WebSocket.OPEN) {
				logWs.send(JSON.stringify(item));
			} else {
				console.error('logWs is not open or not defined');
			}

			if (delta?.audio) {

				// const resampledAudio = resamplePCM(delta.audio, 24000);
				const base64Audio = Buffer.from(delta.audio).toString('base64');
				// const base64Audio = convertPcm16ToMulawBase64(Buffer.from(delta.audio));
				const audioDelta = {
					event: 'media',
					streamSid: streamSid,
					media: {
						// a base64 encoded string of 8000/mulaw
						payload: base64Audio
					}
				};

				console.log('Sending audio delta to Twilio', { event: 'media', streamSid: streamSid, media: { payload: 'truncated' } });

				// twilioWs.send(JSON.stringify(audioDelta));
			}

		});

		// Handle incoming messages from Twilio
		twilioWs.on('message', (message) => {
			try {
				const data = JSON.parse(message);
				switch (data.event) {
					case 'media':
						// aparently I should be using this:  client.appendInputAudio(data);
						if (client.realtime.isConnected()) {
							client.realtime.send('input_audio_buffer.append', {
								audio: data.media.payload,
							});
						}
						break;
					case 'start':
						streamSid = data.start.streamSid;
						console.log('Incoming stream has started', data, streamSid);
						break;
					default:
						console.log('Received non-media event:', data.event);
						break;
				}
			} catch (error) {
				console.error('Error parsing message:', error, 'Message:', message);
			}
		});

		// Handle connection close
		twilioWs.on('close', () => {
			console.log('Client disconnected.');
			client.disconnect();
		});

		// errors like connection failures
		client.on('error', (event) => {
			console.error('Error:', event);
		});

		// in VAD mode, the user starts speaking
		// we can use this to stop audio playback of a previous response if necessary
		client.on('conversation.interrupted', (event) => {
			console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!Conversation interrupted', event);
			/* do something */
		});


	});
});

// Just for sending logs
fastify.register(async (fastify) => {
	fastify.get('/log-stream', { websocket: true }, async (ws, req) => {
		logWs = ws;
		logWs.on('message', (message) => {
			console.log('Log message:', message);
		});
	});
});


// TwiML for outbound call
fastify.all('/twilio-status-callback', async (request, reply) => {
	console.log('Recording complete', request.body);
	reply.sendStatus(200);
});


// Route for Twilio to handle incoming calls
fastify.all('/incoming-call', async (request, reply) => {
	const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
						<Response>
							<Connect>
								<Stream url="wss://${request.headers.host}/media-stream" />
							</Connect>
						</Response>`;

	reply.type('text/xml').send(twimlResponse);
});

/**
 * Add tools to the client
 * @param {RealtimeClient} client 
 */
function addTools(client) {

	/**
	 * Enable the AI to get the weather
	 */
	client.addTool(
		{
			name: 'get_weather',
			description:
				'Retrieves the weather for a given lat, lng coordinate pair. Specify a label for the location.',
			parameters: {
				type: 'object',
				properties: {
					lat: {
						type: 'number',
						description: 'Latitude',
					},
					lng: {
						type: 'number',
						description: 'Longitude',
					},
					location: {
						type: 'string',
						description: 'Name of the location',
					},
				},
				required: ['lat', 'lng', 'location'],
			},
		},
		async ({ lat, lng, location }) => {
			//setMarker({ lat, lng, location }); (used to set cords on a map)
			//setCoords({ lat, lng, location });
			const result = await fetch(
				`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m`
			);
			const json = await result.json();
			const temperature = {
				value: json.current.temperature_2m,
				units: json.current_units.temperature_2m,
			};
			const wind_speed = {
				value: json.current.wind_speed_10m,
				units: json.current_units.wind_speed_10m,
			};
			// setMarker({ lat, lng, location, temperature, wind_speed });
			return json;
		}
	);

}

fastify.listen({ port: PORT }, (err) => {
	if (err) {
		console.error(err);
		process.exit(1);
	}
	console.log(`Server is listening on port ${PORT}`);
});
