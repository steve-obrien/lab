// app.js
const express = require('express');
const twilio = require('twilio');
const http = require('http');
const WebSocket = require('ws');
const openai = require('openai');
const { SpeechClient } = require('@google-cloud/speech');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');

const app = express();
const port = process.env.PORT || 5000;

// Initialize OpenAI API
openai.apiKey = 'YOUR_OPENAI_API_KEY';

// Initialize Google Cloud clients
const speechClient = new SpeechClient();
const ttsClient = new TextToSpeechClient();

// Twilio webhook endpoint
app.post('/voice', (req, res) => {
	const VoiceResponse = twilio.twiml.VoiceResponse;
	const response = new VoiceResponse();

	const connect = response.connect();
	connect.stream({
		url: 'wss://your-server-url/stream',
	});

	res.type('text/xml');
	res.send(response.toString());
});

const server = http.createServer(app);
server.listen(port, () => {
	console.log(`Express server listening on port ${port}`);
});

// Set up WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', function connection(ws, req) {
	console.log('WebSocket connection established');
	let recognizeStream = null;

	ws.on('message', async function incoming(message) {
		const data = JSON.parse(message);
		const event = data.event;

		if (event === 'start') {
			console.log('Media stream started');

			// Start the speech recognition stream
			recognizeStream = speechClient
				.streamingRecognize({
					config: {
						encoding: 'MULAW',
						sampleRateHertz: 8000,
						languageCode: 'en-US',
					},
					interimResults: false,
				})
				.on('error', console.error)
				.on('data', async (response) => {
					const transcription = response.results[0].alternatives[0].transcript;
					console.log(`Transcription: ${transcription}`);

					// Send transcription to OpenAI API
					const assistantResponse = await openai.Completion.create({
						model: 'text-davinci-003',
						prompt: transcription,
						max_tokens: 150,
						temperature: 0.9,
					});

					const assistantText = assistantResponse.choices[0].text.trim();
					console.log(`Assistant: ${assistantText}`);

					// Convert assistant's response to speech
					const [ttsResponse] = await ttsClient.synthesizeSpeech({
						input: { text: assistantText },
						voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
						audioConfig: {
							audioEncoding: 'MULAW',
							sampleRateHertz: 8000,
						},
					});

					// Send audio back to Twilio
					const mediaMessage = {
						event: 'media',
						media: {
							payload: Buffer.from(ttsResponse.audioContent).toString('base64'),
						},
					};
					ws.send(JSON.stringify(mediaMessage));
				});
		} else if (event === 'media') {
			const payload = data.media.payload;
			const audioBuffer = Buffer.from(payload, 'base64');

			// Write audio to the recognition stream
			if (recognizeStream !== null) {
				recognizeStream.write(audioBuffer);
			}
		} else if (event === 'stop') {
			console.log('Media stream stopped');
			if (recognizeStream !== null) {
				recognizeStream.end();
			}
		}
	});

	ws.on('close', function () {
		console.log('WebSocket connection closed');
		if (recognizeStream !== null) {
			recognizeStream.end();
		}
	});
});
