import Fastify from 'fastify';
import WebSocket from 'ws';
import fs from 'fs';
import dotenv from 'dotenv';
import fastifyFormBody from '@fastify/formbody';
import fastifyWs from '@fastify/websocket';
import twilio from 'twilio';
import fastifyStatic from '@fastify/static';
import path from 'path';
import plivo from 'plivo';
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
const PLIVO_PHONE_NUMBER = '+441172050425'; // Your Plivo phone number

// Initialize Plivo client
const plivoClient = new plivo.Client(PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN);

let instructions = 'You are a sales agent for Newicon.net trying to sell software app development.';

// Initialize Fastify
const fastify = Fastify();
fastify.register(fastifyFormBody);
fastify.register(fastifyWs);
// Register the instructions routes

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
	'session.created',
	'conversation.item.truncate',
	'conversation.item.create',
];

const host = 'da4a-109-157-217-62.ngrok-free.app';

// Route to handle outbound call requests
fastify.post('/make-call', async (request, reply) => {
	const to = request.body.to;
	instructions = request.body.instructions;

	try {
		const response = await plivoClient.calls.create(
			PLIVO_PHONE_NUMBER, // From number
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
	const plivoResponse = `<?xml version="1.0" encoding="UTF-8"?>
				<Response>
					<Play>https://s3.amazonaws.com/plivocloud/Trumpet.mp3</Play>
					<Stream bidirectional="true" keepCallAlive="true" >wss://${request.headers.host}/media-stream</Stream>
				</Response>`;

	reply.type('text/xml').send(plivoResponse);
});


// WebSocket route for media-stream
fastify.register(async (fastify) => {
	fastify.get('/media-stream', { websocket: true }, (plivoWs, req) => {
		console.log('Client connected');

		const openAiWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01', {
			headers: {
				Authorization: `Bearer ${OPENAI_API_KEY}`,
				"OpenAI-Beta": "realtime=v1"
			}
		});

		let streamSid = null;
		let item_id = null
		const tools = {}
		tools.sort_code_lookup = {
			config: {
				type: 'function',
				name: 'sort_code_lookup',
				description: 'Looks up a bank account sort code to check it is valid and return information on the specific bank allowing the user to confirm',
				parameters: {
					type: 'object',
					properties: {
						sort_code: { type: 'string', description: 'The sort code for example: 40-14-21' }
					},
					required: ['sort_code']
				}
			},
			handler: async ({ sort_code }) => {
				return {
					result: "VALID",
					bank: "HSBC, Downend branch"
				}
			}
		}


		const sendSessionUpdate = () => {
			const sessionUpdate = {
				type: 'session.update',
				session: {
					turn_detection: { type: 'server_vad' },
					input_audio_format: 'g711_ulaw',
					output_audio_format: 'g711_ulaw',
					voice: VOICE,
					instructions: instructions,
					modalities: ["text", "audio"],
					temperature: 0.8,
					tools: [tools.sort_code_lookup.config],
					tool_choice: 'auto'
				}
			};

			console.log('Sending session update:', JSON.stringify(sessionUpdate));
			openAiWs.send(JSON.stringify(sessionUpdate));
		};


		// Open event for OpenAI WebSocket
		openAiWs.on('open', () => {
			console.log('Connected to the OpenAI Realtime API');
			setTimeout(sendSessionUpdate, 250); // Ensure connection stability, send after .25 seconds
		});

		// Listen for messages from the OpenAI WebSocket (and send to Twilio if necessary)
		openAiWs.on('message', async (data) => {
			try {
				const response = JSON.parse(data);

				if (LOG_EVENT_TYPES.includes(response.type)) {
					console.log(`Received event: ${response.type}`, response);
				}

				if (response.type === 'session.updated') {
					console.log('Session updated successfully:', response);
				}
				// sending audio to plivo
				if (response.type === 'response.audio.delta' && response.delta) {
					//console.log('Sending audio delta to Twilio:', response);
					// this keeps sending even when cancelled?
					item_id = response.item_id;
					const audioDelta = {
						event: 'playAudio',
						media: { 
							contentType: "audio/x-l16",
							"sampleRate": 8000,
							payload: response.delta
						}
					};
					//console.log('Sending audio delta to Plivo:', {event: 'playAudio', media: "." });
					plivoWs.send(JSON.stringify(audioDelta));
				}

				if (response.type === 'response.function_call_arguments.delta' && response.delta) {
					console.log('Function call arguments delta:', response);
				}

				if (response.type === 'response.output_item.done' && response.delta) {
					console.log('Output item done:', response);
				};

				if (response.type === 'response.function_call_arguments.done' && response.delta) {
					console.log('Function call arguments done:', response);
				}

				if (response.type === 'input_audio_buffer.speech_started') {
					console.log('!!!!!!!!!!!!Cancelling response');
					openAiWs.send(JSON.stringify({ type: 'response.cancel' }));
					if (item_id) {
						openAiWs.send(JSON.stringify({
							type: 'conversation.item.truncate',
							item_id: item_id,
							content_index: 0,
							audio_end_ms: 1500
						}));
					}
				}

			} catch (error) {
				console.error('Error processing OpenAI message:', error, 'Raw message:', data);
			}
		});



		// Handle incoming messages from Plivo
		plivoWs.on('message', (message) => {
			try {
				const data = JSON.parse(message);

				switch (data.event) {
					case 'media':
						if (openAiWs.readyState === WebSocket.OPEN) {
							const audioAppend = {
								type: 'input_audio_buffer.append',
								audio: data.media.payload
							};
							console.log('Sending audio delta to OpenAI:', {type: 'input_audio_buffer.append', audio: "." });
							openAiWs.send(JSON.stringify(audioAppend));
						}
						break;
					case 'start':
						streamSid = data.start.streamSid;
						console.log('Incoming stream has started', data, streamSid);
						break;
					default:
						console.log('Received non-media event:', data);
						break;
				}
			} catch (error) {
				console.error('Error parsing message:', error, 'Message:', message);
			}
		});

		// Handle connection close
		plivoWs.on('close', () => {
			if (openAiWs.readyState === WebSocket.OPEN) {
				openAiWs.close();
			}
			console.log('Client disconnected.');
		});

		// Handle WebSocket close and errors
		openAiWs.on('close', () => {
			plivoWs.close();
			console.log('Disconnected from the OpenAI Realtime API');
		});

		openAiWs.on('error', (error) => {
			console.error('Error in the OpenAI WebSocket:', error);
		});

	});
});




// Route for Twilio to handle incoming and outgoing calls
// <Say> punctuation to improve text-to-speech translation
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
