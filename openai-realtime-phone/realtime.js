// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

// Import third-party libraries
import Fastify from 'fastify';
import fastifyFormBody from '@fastify/formbody';
import fastifyWs from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import path from 'path';

// Import custom modules
import { RealtimeClient } from './src/ai/index.js';
import registerInstructionsRoutes from './instructions.js';
import { addTools } from './tools.js';
import AiAudioBufferTracker from './src/AiAudioBufferTracker.js';
import aiConfig from './src/aiConfig.js';
import IndexController from './src/controllers/IndexController.js';
import webLog from './src/WebSocketManager.js';

// Retrieve the OpenAI API key from environment variables. You must have OpenAI Realtime API access.
const { OPENAI_API_KEY } = process.env;
if (!OPENAI_API_KEY) {
	console.error('Missing OpenAI API key. Please set it in the .env file.');
	process.exit(1);
}
const PORT = process.env.PORT || 5050; // Allow dynamic port assignment

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

// Route to handle outbound call requests
fastify.post('/make-call', IndexController.makeCall);

// TwiML for outbound call
fastify.all('/outbound-call', IndexController.outboundCall);

// WebSocket route for media-stream
fastify.register(async (fastify) => {
	fastify.get('/media-stream', { websocket: true }, async (twilioWs, req) => {
		console.log('Tel: Stream Created', req.query);

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
						conversation.telDtmf(data.dtmf.digit);
						console.log('Tel: dtmf:', data.dtmf.digit);
						break;
					case 'stop':
						conversation.telStop();
						console.log('Tel: Stop: ', data.event);
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
/**
 * When creating a new conversation we need to orchestrate via the telephone stream.
 * 
 * We should see the following in the logs: 
 * Tel: connected
 * Tel: started
 * Tel: stream - recieves an audio stream from twilio
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

	telDtmf(digit) {
		console.log('Tel: dtmf:', digit);
		// The AI will not hear the dtmf digit signal - so we add as a user message
		this.ai.sendUserMessageContent([{
			type: `input_text`, 
			text: `${digit}`
		}]);
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
			}

			webLog.sendItems(items)
		})

		// created is called after user speech has finished.
		this.ai.realtime.on('server.conversation.item.created', (event) => {
			let item = this.ai.conversation.getItem(event.item.id);
			webLog.sendItems(item)
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
		webLog.sendItems(item)
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

	/**
	 * When the telephone connection is broken
	 */
	telStop() {
		this.ai.disconnect();
	}

}



let i = 1;
// Just for sending logs
fastify.register(async (fastify) => {
	fastify.get('/log-stream', { websocket: true }, async (ws, req) => {
		ws.uuid = req.query.uuid;
		webLog.addSocket(ws);
	});
});


// TwiML for outbound call
fastify.all('/status-callback', IndexController.statusCallback);


// Route for Twilio to handle inbound calls (should probably call it inbound-call)
fastify.all('/inbound-call', IndexController.inboundCall);


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

// setInterval(printMemoryUsage, 20000);