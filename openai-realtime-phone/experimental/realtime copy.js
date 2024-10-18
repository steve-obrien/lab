import Fastify from 'fastify';
import WebSocket from 'ws';
import fs from 'fs';
import dotenv from 'dotenv';
import fastifyFormBody from '@fastify/formbody';
import fastifyWs from '@fastify/websocket';
import twilio from 'twilio';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { RealtimeClient } from './src/realtime/index.js';
import registerInstructionsRoutes from './instructions.js';
// import fetch from 'node-fetch';
import jsdom from "jsdom";
const { JSDOM } = jsdom;
import { addTools } from './tools.js';



// Load environment variables from .env file
dotenv.config();

// Retrieve the OpenAI API key from environment variables. You must have OpenAI Realtime API access.
const { OPENAI_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_TWIML_APP_SID } = process.env;

if (!OPENAI_API_KEY) {
	console.error('Missing OpenAI API key. Please set it in the .env file.');
	process.exit(1);
}

const PORT = process.env.PORT || 5050; // Allow dynamic port assignment
// Twilio credentials
const TWILIO_PHONE_NUMBER = '+441202144991'; // Your Twilio phone number
// Initialize Twilio client
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);


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

let aiConfig = {
	voice: 'shimmer',
	instructions: 'You are a sales agent for Newicon.net trying to sell software app development.',
	silence: 1000
}

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
	console.log('make call')
	const to = request.body.to;
	Object.assign(aiConfig, { ...request.body });

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
	console.log('/outbound-call')
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
		let callSid = null;

		console.log('Client connected');

		const client = new RealtimeClient({
			apiKey: OPENAI_API_KEY
		});
		// Change the defaultFrequency to 8,000 Hz
		client.realtime.defaultFrequency = 8_000;

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
					silence_duration_ms: aiConfig.silence
				},
				input_audio_format: 'g711_ulaw',
				output_audio_format: 'g711_ulaw',
				voice: aiConfig.voice,
				instructions: aiConfig.instructions,
				modalities: ["text", "audio"],
				temperature: 0.8,
				input_audio_transcription: { model: 'whisper-1' }
			});
			addTools(client)
			client.addTool(
				{
					name: 'hangup',
					description:
						'Do not call this function without saying goodbye first',
					parameters: {},
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
			);
		
			// client.sendUserMessageContent([{
			// 	type: `input_text`,
			// 	text: ``
			// }]);
		}, 250);



		client.realtime.on('server.session.created', (event) => {
			console.log('session created', event)
			// event.session.id
			// multiple sessions can occur - group them by session id
		})

		let currentItem = { id: null };

		// response.item
		const audioBuffers = {}

		// this is triggered when the AI starts speaking
		client.realtime.on('server.conversation.item.created', (event) => {
			console.log('server.conversation.item.created', event.item.id)

			let item = client.conversation.getItem(event.item.id);
			item.startTime = Date.now();

			if (event.previous_item_id) {
				const previous_item = client.conversation.getItem(event.previous_item_id);
				previous_item.stopTime = item.startTime
				previous_item.duration = previous_item.stopTime - previous_item.starTime
			}


			if (item.role == 'user') {
			
				// If we have a speech item, can populate audio
				// For users speech the.conversation.item.created is called once speech stops
				// however it is called at the beggining for AI audio
				if (queuedSpeechItems[item.id]) {
					item.formatted.audio = queuedSpeechItems[item.id].audio;
					delete queuedSpeechItems[item.id]; // free up some memory
					return;
				}
			}


			audioBuffers[item.id] = new MuLawAudioBuffer();

			audioBuffers[item.id].startStreaming((chunk) => {
				//console.log("Streaming audio chunk:", audioBuffers[item.id].currentSample, audioBuffers[item.id].buffer.length);
				const audioDelta = {
					event: 'media',
					streamSid: streamSid,
					media: { payload: Buffer.from(chunk).toString('base64') }
				};
				twilioWs.send(JSON.stringify(audioDelta));
			});

			
		})

		let talkTime = null
		/**
		 * Handles audio response from OpenAI
		 * 
		 * @param {Object} response - The response object from OpenAI
		 * @param {Object} response.item - The item object
		 * @param {Object} response.delta - The delta object containing the audio data
		 */
		client.realtime.on('server.response.audio.delta', (response) => {
			// Define the callback to handle sending the audio chunks for playback
			client.appendInputAudio(response.delta)
			if (currentItem.id)
				audioBuffers[currentItem.id].append(Buffer.from(response.delta, 'base64'))
			// timer

			// const audioDelta = {
			// 	event: 'media',
			// 	streamSid: streamSid,
			// 	media: { payload: Buffer.from(chunk).toString('base64') }
			// };
			// twilioWs.send(JSON.stringify(audioDelta));
		});

		client.on('conversation.updated', async ({ item, delta }) => {
			// Send log to logWs
			if (delta?.audio) {
				currentItem = item;
			}
			if (logWs && logWs.readyState === WebSocket.OPEN) {
				logWs.send(JSON.stringify(item));
			} else {
				console.error('logWs is not open or not defined');
			}
		});

		// in VAD mode, the user starts speaking
		// we can use this to stop audio playback of a previous response if necessary
		client.on('conversation.interrupted', async () => {

			if (audioBuffers[currentItem.id] == undefined)
				return;

			let item = client.conversation.getItem(currentItem.id);
			let samples = audioBuffers[currentItem.id].interrupt();

			if (item) {
				item.playedAudio = audioBuffers[item.id].getAudioUntilInterrupt();
				item.audioFinished = true;
				logWs.send(JSON.stringify(item));
				// now we can delete the audio buffer to free memory
				// delete audioBuffers[item.id];
				console.log('>> Conversation interrupted', currentItem.id);
				item.elapsedTime = Date.now() - item.startTime;

				// if we have finished playing the audio we need to make the item null
				if (audioBuffers[item.id].finishedPlayback()) {
					item = null;
				}
				// truncate to whisper api to get the audio.
			}
			// 8000 Hz 8 samples per millisecond
			await client.cancelResponse(item?.id, samples);
			twilioWs.send(JSON.stringify({ event: 'clear', streamSid: streamSid }));
		});

		let userAudioBuffer = [];
		let userAudioRecord = false;
		let userAudioItem = null
		let inputAudioBuffer = []
		let queuedSpeechItems = []
		client.realtime.on('server.input_audio_buffer.speech_started', (event) => {
			const { item_id, audio_start_ms } = event;
			// this gives audio_start_ms
			console.log('speech started')
			userAudioRecord = true
			userAudioBuffer = []
			userAudioItem = event.item_id
			queuedSpeechItems[item_id] = { audio_start_ms };
		});

		client.realtime.on('server.input_audio_buffer.speech_stopped', (event) => {
			const { item_id, audio_end_ms } = event;
			if (!queuedSpeechItems[item_id]) {
				queuedSpeechItems[item_id] = { audio_start_ms: audio_end_ms };
			}
			let speech = queuedSpeechItems[item_id];
			console.log('speech stopped')
			// this gives audio_end_ms
			// meaning a buffer recording can
			// slice an input buffer
			speech.audio_end_ms = event.audio_end_ms;
			if (inputAudioBuffer) {
				const startIndex = Math.floor(
					(speech.audio_start_ms * client.realtime.defaultFrequency) / 1000,
				);
				const endIndex = Math.floor(
					(speech.audio_end_ms * client.realtime.defaultFrequency) / 1000,
				);
				speech.audio = inputAudioBuffer.slice(startIndex, endIndex);
			}

			userAudioRecord = false
			userAudioItem = event.item_id
		});


		// Handle incoming messages from Twilio
		twilioWs.on('message', (message) => {
			try {
				const data = JSON.parse(message);
				switch (data.event) {
					case 'start':
						streamSid = data.start.streamSid;
						callSid = data.start.callSid;
						console.log('Incoming stream has started', data, streamSid);

						break;
					case 'media':
						if (client.realtime.isConnected()) {
							if (userAudioRecord == true) {
								userAudioBuffer = userAudioBuffer.concat(Array.from(Buffer.from(data.media.payload, 'base64')));
							}
							let item = client.conversation.getItem(userAudioItem);
							// if (item) {
							// 	item.playedAudio = userAudioBuffer
							// 	logWs.send(JSON.stringify(item));
							// }
							client.realtime.send('input_audio_buffer.append', {
								audio: data.media.payload,
							});
							// client.appendInputAudio(Buffer.from(data.media.payload, 'base64'));
							// add to buffer
							inputAudioBuffer = inputAudioBuffer.concat(Array.from(Buffer.from(data.media.payload, 'base64')));
						}
						break;
					case 'dtmf':
						console.log('Received dtmf:', data.dtmf.digit);
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


	});
});

// Just for sending logs
fastify.register(async (fastify) => {
	fastify.get('/log-stream', { websocket: true }, async (ws, req) => {
		logWs = ws;
		logWs.on('message', (message) => {
			console.log('LogWs: message:', message);
			if (message.equals(Buffer.from('ping'))) {
				logWs.send('pong');
			}
		});
		logWs.on('error', (event) => {
			console.error('LogWs: Error:', event);
		});
		logWs.on('close', (event) => {
			console.error('LogWs: close', event);
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




fastify.listen({ port: PORT }, (err) => {
	if (err) {
		console.error(err);
		process.exit(1);
	}
	console.log(`Server is listening on port ${PORT}`);
});


class MuLawAudioBuffer {
	constructor(sampleRate = 8000, chunkSize = 8000) {
		this.sampleRate = sampleRate;  // 8000 Hz
		this.chunkSize = chunkSize;    // 250ms chunks
		this.buffer = [];              // Holds the encoded audio data
		this.currentSample = 0;        // Tracks current playback position
		this.isPlaying = false;        // Indicates whether audio is playing
		this.sendCallback = () => { };      // Function to send audio chunks
		this.finishedCallback = () => { };
		this.checkInterval = 50;       // Check for new audio every 50ms
		this.checkCounter = 0;         // Counter to track when to send audio
		this.start = null;         // Counter to track when to send audio
	}

	// Append new μ-law encoded audio data to the buffer
	append(audioData) {
		this.buffer = this.buffer.concat(Array.from(audioData));
		//console.log('append chunk', this.buffer.length)
	}

	// Start streaming the audio in chunks of 1 second
	startStreaming(sendCallback) {
		this.start = Date.now();
		this.sendCallback = sendCallback;
		this.isPlaying = true;
		this._stream();
	}

	audioFinished(finishedCallback) {
		this.finishedCallback = finishedCallback
	}

	// Internal method to handle streaming
	_stream() {
		if (!this.isPlaying) return;

		// Check for new audio data every 50ms
		this.checkCounter++;
		if (this.checkCounter >= 5) { // Send audio every 0.25 second (5 * 50ms)
			const nextChunkEnd = Math.min(this.currentSample + this.chunkSize, this.buffer.length);
			const chunk = this.buffer.slice(this.currentSample, nextChunkEnd);

			// Send chunk through callback
			this.sendCallback(chunk);

			this.currentSample = nextChunkEnd;
			this.checkCounter = 0; // Reset counter after sending

			// Check if we've reached the end of the buffer
			if (this.finishedPlayback()) {
				this.finishedCallback(); // Call finished callback
				// just in case the audio is jittery we wait before canneling the loop
				setTimeout(() => { this.isPlaying = false }, 2000)
				// we should stop the timeout function 
			}
		}

		// Set a timeout for the next check
		setTimeout(() => this._stream(), this.checkInterval);
	}

	// Stop streaming and return the current sample number
	interrupt() {
		this.isPlaying = false;
		return this.currentSample;
	}

	// Get the audio from the start up to the current sample
	getAudioUntilInterrupt() {
		return this.buffer.slice(0, this.currentSample);
	}

	getTotalSamples() {
		return this.buffer.length;
	}

	finishedPlayback() {
		return (this.currentSample >= this.buffer.length);
	}

	getPlayedDuration() {
		// Calculate the duration of the played audio in seconds
		return (this.currentSample / this.sampleRate);
	}
}

// Example usage:

// const audioBuffer = new MuLawAudioBuffer();

// // Simulate appending new μ-law encoded audio data (replace with actual data)
// const newAudioData = new Uint8Array([/* ... μ-law encoded data ... */]);
// audioBuffer.append(newAudioData);


// // Simulate interrupt after 3 seconds
// setTimeout(() => {
// 	const interruptedAtSample = audioBuffer.interrupt();
// 	console.log("Playback interrupted at sample:", interruptedAtSample);
// 	const audioDataUntilInterrupt = audioBuffer.getAudioUntilInterrupt();
// 	console.log("Audio until interrupt:", audioDataUntilInterrupt);
// }, 3000);
