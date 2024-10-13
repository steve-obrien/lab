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

const host = 'da4a-109-157-217-62.ngrok-free.app';

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
					<Play>https://s3.amazonaws.com/plivocloud/Trumpet.mp3</Play>
					<Stream bidirectional="true" keepCallAlive="true" >wss://${request.headers.host}/media-stream</Stream>
				</Response>`;

	reply.type('text/xml').send(response);
});


// Function to resample the PCM16 data
// Resampling PCM16 array to target sample rate using linear interpolation
function resamplePCM(pcm16Array, originalSampleRate, targetSampleRate) {
	const resampleRatio = targetSampleRate / originalSampleRate;
	const targetLength = Math.ceil(pcm16Array.length * resampleRatio);
	const resampledArray = new Int16Array(targetLength);

	for (let i = 0; i < targetLength; i++) {
		// Find corresponding index in the original array
		const originalIndex = i / resampleRatio;
		const indexLow = Math.floor(originalIndex);
		const indexHigh = Math.ceil(originalIndex);

		// Interpolate between the two nearest samples
		const sampleLow = pcm16Array[indexLow] || 0;
		const sampleHigh = pcm16Array[indexHigh] || 0;
		const weightHigh = originalIndex - indexLow;
		const weightLow = 1 - weightHigh;

		// Calculate the interpolated sample
		resampledArray[i] = Math.round(sampleLow * weightLow + sampleHigh * weightHigh);
	}

	return resampledArray;
}


// Function to convert PCM16 to PCM8
function convert16BitPCMto8Bit(pcm16Array) {
	const pcm8Array = new Uint8Array(pcm16Array.length); // 8-bit array
	for (let i = 0; i < pcm16Array.length; i++) {
		// Scale 16-bit PCM (-32768 to 32767) to 8-bit PCM (0 to 255)
		const sample = pcm16Array[i];
		pcm8Array[i] = ((sample + 32768) >> 8); // Convert to range [0, 255]
	}
	return pcm8Array;
}



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
				voice: VOICE,
				instructions: instructions,
				modalities: ["text", "audio"],
				temperature: 0.8,
				input_audio_transcription: { model: 'whisper-1' }
			});
		}, 250);

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
				const audioDelta = {
					event: 'playAudio',
					media: {
						contentType: "audio/x-l16",
						// a base64 encoded string of 8000/mulaw
						payload: base64Audio
					}
				};
				console.log('Sending audio delta to Plivo', { event: 'playAudio', media: { payload: 'truncated' }});
				plivoWs.send(JSON.stringify(audioDelta));
			}
		});

		// Handle incoming messages from Twilio
		plivoWs.on('message', (message) => {
			try {
				const data = JSON.parse(message);
				switch (data.event) {
					case 'media':
						// console.log('Received media event', data);
						if (client.realtime.isConnected()) {
							client.realtime.send('input_audio_buffer.append', {
								audio: data.media.payload,
							});
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
			<Stream bidirectional="true" keepCallAlive="true" >wss://${request.headers.host}/media-stream</Stream>
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
