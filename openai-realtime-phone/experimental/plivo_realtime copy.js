import Fastify from 'fastify';
import WebSocket from 'ws';
import fs from 'fs';
import dotenv from 'dotenv';
import fastifyFormBody from '@fastify/formbody';
import fastifyWs from '@fastify/websocket';
import plivo from 'plivo';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { RealtimeClient } from '@openai/realtime-api-beta';
import registerInstructionsRoutes from './instructions.js';

// Load environment variables from .env file
dotenv.config();

// Retrieve the OpenAI API key from environment variables. You must have OpenAI Realtime API access.
const { OPENAI_API_KEY, PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN } = process.env;

if (!OPENAI_API_KEY) {
	console.error('Missing OpenAI API key. Please set it in the .env file.');
	process.exit(1);
}

// Twilio credentials
const PHONE_NUMBER = '+441172050425'; 

// Initialize Plivo client
const plivoClient = new plivo.Client(PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN);

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

const host = process.env.HOST

let logWs = null;

// Route to handle outbound call requests
// Route to handle outbound call requests
fastify.post('/make-call', async (request, reply) => {
	const to = request.body.to;
	instructions = request.body.instructions;

	try {
		const response = await plivoClient.calls.create(
			PHONE_NUMBER, // From number
			to, // To number
			`https://${host}/outbound-call`, // Answer URL
			{ answerMethod: 'GET' }
		);

		reply.send({ message: 'Call initiated', callUuid: response.messageUuid });
	} catch (error) {
		console.error('Error making call:', error);
		reply.status(500).send({ error: 'Failed to make call' });
	}
});

// TwiML for outbound call
fastify.all('/outbound-call', async (request, reply) => {
	
	const response = `<?xml version="1.0" encoding="UTF-8"?>
				<Response>
					<Stream contentType="audio/x-mulaw;rate=8000" bidirectional="true" keepCallAlive="true">wss://${request.headers.host}/media-stream</Stream>
				</Response>`;

	reply.type('text/xml').send(response);
});




// WebSocket route for media-stream
fastify.register(async (fastify) => {
	fastify.get('/media-stream', { websocket: true }, async (plivoWs, req) => {

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
			client.sendUserMessageContent({
				type: `input_text`,
				text: 'Hello'
			});
		}, 250);

		client.realtime.on('server.response.audio.delta', (response) => {
			// console.log('Sending audio delta to Twilio:', response);
			// this keeps sending even when cancelled?
			const audioDelta = {
				event: 'playAudio',
				media: {
					contentType: "audio/x-mulaw",
					sampleRate: "8000",
					// a base64 encoded string of 8000/mulaw
					payload: Buffer.from(response.delta, 'base64').toString('base64')
				}
			};

			// console.log('Sending audio delta to Twilio:', audioDelta);
			plivoWs.send(JSON.stringify(audioDelta));
		});

		client.on('conversation.updated', async ({ item, delta }) => {
			// Send log to logWs
			if (logWs && logWs.readyState === WebSocket.OPEN) {
				logWs.send(JSON.stringify(item));
			} else {
				console.error('logWs is not open or not defined');
			}
		});

		let audioBuffer = [];
		let audioBufferStartTime = Date.now();
		// Handle incoming messages from Plivo
		plivoWs.on('message', (message) => {
			
			try {
				const data = JSON.parse(message);
				switch (data.event) {
					case 'media':
						if (client.realtime.isConnected()) {
							// Log data.media without payload
							// const mediaWithoutPayload = { ...data.media };
							// delete mediaWithoutPayload.payload;
							// console.log('Send to Plivo:', mediaWithoutPayload);
							
							// // Collect audio payloads
							// if (!audioBuffer) {
							// 	audioBuffer = [];
							// 	audioBufferStartTime = Date.now();
							// }
							
							// audioBuffer.push(data.media.payload);
							
							// // Check if we have collected 1 second worth of audio
							// if (Date.now() - audioBufferStartTime >= 1000) {
							// 	const combinedAudio = audioBuffer.join('');
								client.appendInputAudio(data.media.payload);
								// client.realtime.send('input_audio_buffer.append', {
								// 	audio: combinedAudio,
								// });
								
								// Reset buffer and start time
								// audioBuffer = [];
								// audioBufferStartTime = Date.now();
							// }
						}
						break;
					case 'start':
						console.log('Incoming stream has started', data);
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
		plivoWs.on('close', () => {
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


// Route to generate Twilio Client token
fastify.get('/token', async (request, reply) => {
	const identity = 'user'; // You can customize this identity
	const token = new twilio.jwt.ClientCapability({
		accountSid: TWILIO_ACCOUNT_SID,
		authToken: TWILIO_AUTH_TOKEN,
	});

	token.addScope(new twilio.jwt.ClientCapability.OutgoingClientScope({
		applicationSid: TWILIO_TWIML_APP_SID,
	}));

	reply.send({ token: token.toJwt(), identity });
});

// Route for Plivo to handle incoming calls
fastify.all('/incoming-call', async (request, reply) => {
	const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
			<Response>
			<Play>https://s3.amazonaws.com/plivocloud/Trumpet.mp3</Play>
			<Stream bidirectional="true" keepCallAlive="true" audioTrack="both" contentType="audio/x-mulaw;rate=8000" >wss://${request.headers.host}/media-stream</Stream>
			</Response>`;

	reply.type('text/xml').send(twimlResponse);
});


fastify.listen({ port: PORT }, (err) => {
	if (err) {
		console.error(err);
		process.exit(1);
	}
	console.log(`Server is listening on port ${PORT}`);
});
