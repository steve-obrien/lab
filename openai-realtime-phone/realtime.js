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
import twilioClient from './src/twilioClient.js';

// Load environment variables from .env file
dotenv.config();

// Retrieve the OpenAI API key from environment variables. You must have OpenAI Realtime API access.
const { OPENAI_API_KEY } = process.env;

if (!OPENAI_API_KEY) {
	console.error('Missing OpenAI API key. Please set it in the .env file.');
	process.exit(1);
}

const PORT = process.env.PORT || 5050; // Allow dynamic port assignment
// Twilio credentials
const TWILIO_PHONE_NUMBER = '+441202144991'; // Your Twilio phone number

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

const host = process.env.HOST

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


class AiAudioBufferTracker {
	constructor(sampleRate = 8000) {
		this.sampleRate = sampleRate;  // 8000 Hz
		this.currentTrackId = null;    // Track the current playing track ID
		this.buffer = [];              // Holds the audio data for the current track
		this.currentSample = 0;        // Tracks current playback position
		this.isPlaying = false;        // Indicates if audio is currently playing
	}

	// Add new audio data to the buffer and switch tracks if necessary
	add(audioData, trackId) {
		if (this.currentTrackId !== trackId) {
			this._switchTrack(trackId);
		}
		this.buffer = this.buffer.concat(Array.from(audioData));
		// console.log(`Added audio for track ${trackId}, buffer length: ${this.buffer.length}`);
		if (!this.isPlaying) {
			this.startPlayback();
		}
	}

	// Switch to a new track, clearing the buffer and resetting the sample position
	_switchTrack(trackId) {
		this.currentTrackId = trackId;
		this.buffer = [];
		this.currentSample = 0;
		this.isPlaying = false;
		console.log(`Switched to new track: ${trackId}`);
	}

	// Start playback and track the position
	startPlayback() {
		this.isPlaying = true;
		this._play();
	}

	// Internal method to handle playback
	_play() {
		if (!this.isPlaying) return;

		// Simulate playback by advancing the current sample
		const chunkSize = this.sampleRate / 20; // 50ms chunks
		const nextChunkEnd = Math.min(this.currentSample + chunkSize, this.buffer.length);
		const samplesToPlay = nextChunkEnd - this.currentSample;
		this.currentSample = nextChunkEnd;

		// console.log(`Playing audio for track ${this.currentTrackId}, current sample: ${this.currentSample}, total samples: ${this.buffer.length}`);

		// Calculate the exact time to wait based on the number of samples
		const timeToWait = (samplesToPlay / this.sampleRate) * 1000; // Convert to milliseconds

		// Check if we've reached the end of the buffer
		if (this.currentSample >= this.buffer.length) {
			this.isPlaying = false;
			console.log('Playback finished');
		} else {
			// Continue playback
			setTimeout(() => this._play(), timeToWait);
		}
	}

	// Stop playback and return the current track ID and sample number
	interrupt() {
		this.isPlaying = false;
		console.log(`Playback interrupted at sample: ${this.currentSample} for track: ${this.currentTrackId}`);
		return { trackId: this.currentTrackId, sample: this.currentSample };
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

/**
 * When creating a new conversation we need to orchestrate via the telephone stream.
 * 
 * We should see the following in the logs: 
 * Tel: connected
 * Tel: started
 */
class AiTelConversation {

	constructor(aiConfig, twilioWs) {
		this.ai = new RealtimeClient({ apiKey: OPENAI_API_KEY });
		this.ai.realtime.defaultFrequency = 8_000;
		this.twilioWs = twilioWs;
		this.aiConfig = aiConfig;
		this.calSid = null;
		this.streamSid = null;
		this.aiAudioBuffer = new AiAudioBufferTracker();
	}

	telConnected() {
		console.log('Tel: connected')
		this.aiCreateClient();
	}

	telStart(callSid, streamSid) {
		console.log('Tel: started', callSid, streamSid);
		this.callSid = callSid
		this.streamSid = streamSid
		this.aiStream();
	}

	telStream(payload) {
		if (!this.ai.realtime.isConnected())
			return;

		this.ai.appendInputAudioBase64(payload);
	}

	aiStream() {

		this.ai.on('conversation.interrupted', async () => {
			console.log('conversation.interrupted')

			const { trackId, sample } = this.aiAudioBuffer.interrupt();

			// we finished the playback so no action is needed
			if (this.aiAudioBuffer.finishedPlayback())
				return;

			await this.interruptItem(trackId, sample);
		});

		this.ai.on('conversation.updated', ({ item, delta }) => {
			const items = this.ai.conversation.getItems();

			// console.log('conversation.updated');
			//const items = this.ai.conversation.getItems();
			if (delta?.audio) {
				// add to play buffer
				this.aiAudioBuffer.add(delta.audio, item.id)
				// lets send the whole thing to twilio
				this.sendAudio(delta.audio);
				// could stream to browser here
			}
			if (item.status === 'completed' && item.formatted.audio?.length) {
				// send the audio to the browser.
				//webLog.send(item)
			}

			webLog.send(items)
		})

		// created is called after user speech has finished.
		this.ai.realtime.on('server.conversation.item.created', (event) => {
			let item = this.ai.conversation.getItem(event.item.id);
			webLog.send(item)
		})

		// errors like connection failures
		this.ai.on('error', (event) => {
			console.error('Ai: Error:', event);
		});
		
	}

	async interruptItem(itemId, sample) {
		const item = this.ai.conversation.getItem(itemId);
		await this.ai.cancelResponse(itemId, sample);
		this.twilioWs.send(JSON.stringify({ event: 'clear', streamSid: this.streamSid }));
		webLog.send(item)
	}

	/**
	 * Send adudio to the phone.
	 * @param {string} audio base64 encoded audio
	 */
	sendAudio(audio) {
		const audioDelta = {
			event: 'media',
			streamSid: this.streamSid,
			media: { payload: audio }
		};
		this.twilioWs.send(JSON.stringify(audioDelta));
	}

	async aiCreateClient() {
		await this.ai.connect();
		console.log('AI: client connected')
		this.ai.updateSession({
			turn_detection: {
				type: 'server_vad',
				threshold: 0.5,
				prefix_padding_ms: 300,
				silence_duration_ms: this.aiConfig.silence
			},
			input_audio_format: 'g711_ulaw',
			output_audio_format: 'g711_ulaw',
			voice: this.aiConfig.voice,
			instructions: this.aiConfig.instructions,
			modalities: ["text", "audio"],
			temperature: 0.8,
			input_audio_transcription: { model: 'whisper-1' }
		});
		addTools(this.ai, this.callSid);
	}

}

// WebSocket route for media-stream
fastify.register(async (fastify) => {
	fastify.get('/media-stream', { websocket: true }, async (twilioWs, req) => {
		console.log('Tel: Stream Created');

		const conversation = new AiTelConversation(aiConfig, twilioWs)

		let callStart = 0
		let callStop = 0
		twilioWs.on('message', (message) => {
			try {
				const data = JSON.parse(message);
				switch (data.event) {
					case 'connected':
						conversation.telConnected();
						break;
					case 'start':
						conversation.telStart(data.start.callSid, data.start.streamSid);
						break;
					case 'media':
						callStart = Date.now()
						conversation.telStream(data.media.payload);
						break;
					case 'dtmf':
						console.log('Tel: dtmf:', data.dtmf.digit);
						break;
					case 'stop':
						callStop = Date.now()
						console.log('Tel: Stop: ', data.event);
						console.log('call duration: ', callStop - callStart)
						break;
					default:
						console.log('Tel: non-media event:', data.event);
						break;
				}
			} catch (error) {
				console.error('Tel: Error parsing message:', error, 'Message:', message);
			}
		});

		// Handle connection close
		twilioWs.on('close', () => {
			console.log('Client disconnected.');
			conversation.ai.disconnect();
		});

	});
});



class WebLogManager {

	constructor() {
		this.sockets = new Set();
	}

	addSocket(ws) {

		this.sockets.add(ws);

		ws.on('message', (message) => {
			try {
				message = JSON.parse(message);
			} catch (error) {
				console.error('log socket json parse error')
			}
			if (message.event === 'onCall') {
				ws.callSid = message.data.callSid
				console.log('WebLogManager: onCall')
			}
		});
		ws.on('error', (event) => {
			console.error('LogWs: Error:', event);
		});
		ws.on('close', (event) => {
			console.error('LogWs: close', event);
			this.sockets.delete(ws)
		});

		console.log('sockets connected: ', this.sockets.size)
	}

	send(message) {
		this.sockets.forEach(client => {
			client.send(JSON.stringify(message));
		});
	}

}

const webLog = new WebLogManager();


let i = 1;
// Just for sending logs
fastify.register(async (fastify) => {
	fastify.get('/log-stream', { websocket: true }, async (ws, req) => {
		ws.uuid = req.query.uuid;
		webLog.addSocket(ws);
	});
});


// TwiML for outbound call
fastify.all('/twilio-status-callback', async (request, reply) => {
	console.log('Recording complete', request.body.RecordingUrl);
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

function printMemoryUsage() {
	const memoryUsage = process.memoryUsage();
	console.log('Memory Usage:');
	console.log('-------------');
	console.log(`RSS:        ${formatBytes(memoryUsage.rss)}`);
	console.log(`Heap Total: ${formatBytes(memoryUsage.heapTotal)}`);
	console.log(`Heap Used:  ${formatBytes(memoryUsage.heapUsed)}`);
	console.log(`External:   ${formatBytes(memoryUsage.external)}`);
	console.log('---------------------------');
}

function formatBytes(bytes) {
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	if (bytes === 0) return '0 Byte';
	const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
	return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

// Call the function to print memory usage
printMemoryUsage();

// setInterval(printMemoryUsage, 5000);