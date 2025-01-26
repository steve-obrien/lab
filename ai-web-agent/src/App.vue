<template>

	<main>
		<div class="min-h-screen relative bg-zinc-700 flex flex-col">
			<div class="pt-10 overflow-y-scroll flex-grow">
				<div class="flex flex-col justify-between">
					<select v-model="selectedInstruction" class="mx-10 mb-2 font-mono bg-zinc-800 text-white rounded-md p-1 ">
						<option v-for="instruction in instructions" :key="instruction.name" :value="instruction">
							{{ instruction.name }}
						</option>
					</select>
					<textarea rows="6" v-model="selectedInstruction.instructions" class="font-mono mx-10 bg-zinc-800 text-white rounded-md p-1"></textarea>
				</div>
			</div>
			<ai-visualiser :class="{ 'pulsing-canvas': !isSpeaking && state == 'connected' }" class="m-auto w-[400px] h-[200px]" :wavStreamPlayer="wavStreamPlayer" type="bars"></ai-visualiser>
			<div class="overflow-y-scroll h-[400px] px-10 text-gray-200 bg-black">
				<div v-for="(item, key) in items" :key="key">
					<div>
						<!-- &nbsp; {{ item.content[0].transcript }} -->
					</div>
				</div>
			</div>
			<!-- controls -->
			<div class=" bg-black w-full p-5 fixed bottom-0">
				<div class="mx-auto w-[250px] bg-gray-800 shadow-xl rounded-lg p-2 flex items-center">
					<button v-if="state != 'connected'" @click="start" class="bg-green-900 flex-1  px-4 py-1 h-[33px] flex-grow  text-medium rounded-md inline-flex items-center justify-center gap-2 text-white ">
						<svg v-if="state == 'start'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-5">
							<path fill-rule="evenodd" d="M2 10a8 8 0 1 1 16 0 8 8 0 0 1-16 0Zm6.39-2.908a.75.75 0 0 1 .766.027l3.5 2.25a.75.75 0 0 1 0 1.262l-3.5 2.25A.75.75 0 0 1 8 12.25v-4.5a.75.75 0 0 1 .39-.658Z" clip-rule="evenodd" />
						</svg>
						<svg v-if="state == 'connecting'" aria-hidden="true" class="size-4 text-gray-200 animate-spin dark:text-gray-400 fill-white" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
							<path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
						</svg>
						<div v-if="state == 'start'">
							Connect
						</div>
						<div v-if="state == 'mic-access-error'">
							Mic Access Error
						</div>
					</button>
					<div v-if="state == 'connected'" class="flex items-center gap-2 w-full">
						<button class="bg-red-900 hover:bg-red-800 hover:text-black flex-1 px-4 py-1 text-medium rounded-md inline-flex items-center gap-2 text-white h-[33px] flex-shrink" @click="stop">
							<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" class="size-4">
								<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
							</svg>
						</button>
						<div class="flex-grow">
							<mic-visualiser :wavRecorder="wavRecorder" :options="{ bars: 20, barSpacing: 2 }" class="m-auto w-full h-[33px] rounded-lg  border-gray-700 bg-gray-900"></mic-visualiser>
						</div>
						<div class="flex items-center gap-0">
							<button @click="toggleMute" class="bg-gray-900 hover:bg-gray-950 hover:text-pink-600 flex-1 px-4 py-2 text-medium shadow-md rounded-md inline-flex items-center gap-2 text-white">
								<svg v-if="!muted" class="size-4" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
									<path fill-rule="evenodd" d="M7 7a5 5 0 0 1 10 0v4a5 5 0 0 1-10 0V7Zm5-3a3 3 0 0 0-3 3v4a3 3 0 1 0 6 0V7a3 3 0 0 0-3-3Z" clip-rule="evenodd"></path>
									<path d="M11 19.945V21a1 1 0 1 0 2 0v-1.055a9.008 9.008 0 0 0 7.345-5.57 1 1 0 0 0-1.854-.75A7.002 7.002 0 0 1 12 18h-.003a7.003 7.003 0 0 1-6.489-4.375 1 1 0 1 0-1.853.75A9.008 9.008 0 0 0 11 19.945Z"></path>
								</svg>
								<svg v-else xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 24 24">
									<path fill-rule="evenodd" d="M15 7v3.757l1.764 1.765c.153-.48.236-.991.236-1.522V7a5 5 0 0 0-8.894-3.137l1.428 1.428A3 3 0 0 1 15 7ZM7 8.414V11a5 5 0 0 0 7.117 4.531l1.477 1.477c-1.05.63-2.28.992-3.594.992h-.003a7.003 7.003 0 0 1-6.489-4.375 1 1 0 1 0-1.853.75A9.008 9.008 0 0 0 11 19.945V21a1 1 0 1 0 2 0v-1.055a8.947 8.947 0 0 0 4.042-1.489l2.25 2.251a1 1 0 0 0 1.415-1.414l-16-16a1 1 0 0 0-1.414 1.414L7 8.414Zm5.538 5.538L9 10.414V11a3 3 0 0 0 3.538 2.952Zm5.761.105 1.477 1.477c.216-.37.407-.758.57-1.159a1 1 0 0 0-1.854-.75c-.06.146-.124.29-.193.432Z" clip-rule="evenodd"></path>
								</svg>
							</button>
							<select v-model="selectedDeviceId" class="bg-zinc-800  text-white hover:text-pink-600  rounded-md p-1 cursor-context-menu w-[25px]">
								<option v-for="input in audioInputs" :key="input.deviceId" :value="input.deviceId">
									{{ input.label || 'Unnamed Microphone' }}
								</option>
							</select>
						</div>
					</div>
				</div>
			</div>
		</div>
	</main>
</template>

<script>
import { RealtimeClient } from '@openai/realtime-api-beta';
import { WavRecorder, WavStreamPlayer } from './wavtools/index.js';
import instructions from './instructions.js';
import AiVisualiser from './components/ai-visualiser.vue';
import MicVisualiser from './components/mic-visualiser.vue';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue'


const ai = new RealtimeClient({
	apiKey: process.env.OPENAI_API_KEY,
	dangerouslyAllowAPIKeyInBrowser: true,
});

const wavRecorder = new WavRecorder({ sampleRate: 24000 })
const wavStreamPlayer = new WavStreamPlayer({ sampleRate: 24000 })

export default {
	components: { AiVisualiser, MicVisualiser, Menu, MenuButton, MenuItems, MenuItem },

	data() {
		return {
			audioInputs: 0,
			muted: false,
			state: 'start', // connecting, connected,
			selectedDeviceId: null,
			instructions: instructions,
			selectedInstruction: instructions[0],
			items: [],
			isSpeaking: false,
		}
	},
	setup() {
		return {
			wavStreamPlayer,
			wavRecorder
		}
	},
	methods: {
		async start() {
			try {
				this.microphoneAccess()
			} catch (error) {
				this.state = 'mic-access-error';
				return;
			}
			this.state = 'connecting';
			this.items = ai.conversation.getItems()
			// Connect to microphone - can supply the device id
			await wavRecorder.begin(this.selectedDeviceId);
			// Connect to audio output
			await wavStreamPlayer.connect();
			// Connect to realtime API
			await ai.connect();
			ai.updateSession({
				instructions: this.selectedInstruction.instructions,
				voice: 'shimmer',
				turn_detection: { type: 'server_vad' },
				input_audio_transcription: { model: 'whisper-1' }
			})
			if (ai.isConnected()) {
				console.log('should be connected')
				this.recordToAi()
			}
			ai.sendUserMessageContent([{
				type: `input_text`,
				text: `Hello`
			}]);
			this.state = 'connected';
		},
		/**
		 * Request access to the microphone
		 * And populate devices list
		 */
		async microphoneAccess() {
			// Request access to the microphone
			const devices = await wavRecorder.listDevices();
			// const devices = await navigator.mediaDevices.enumerateDevices();
			this.audioInputs = devices.filter(device => device.kind === 'audioinput');
			// Set the selectedDeviceId to the first available audio input device
			if (this.audioInputs.length > 0) {
				this.selectedDeviceId = this.audioInputs[0].deviceId;
			}
		},
		async recordToAi() {
			await wavRecorder.record((data) => {
				ai.appendInputAudio(data.mono)
			});
		},
		async stop() {
			await ai.disconnect();
			await wavRecorder.end();
			await wavStreamPlayer.interrupt();
			this.state = 'start';
		},
		toggleMute() {
			if (wavRecorder.getStatus() === 'recording') {
				wavRecorder.pause()
				this.muted = true
			} else {
				this.recordToAi()
				this.muted = false;
			}
		},
		aiSpeaking() {
			this.isSpeaking = true;
		},
		aiStopSpeaking() {
			this.isSpeaking = false;
		},
	},
	mounted() {
		ai.on('error', (event) => console.error(event));
		ai.on('conversation.interrupted', async () => {
			const trackSampleOffset = await wavStreamPlayer.interrupt();
			if (trackSampleOffset?.trackId) {
				const { trackId, offset } = trackSampleOffset;
				await ai.cancelResponse(trackId, offset);
			}
		});
		ai.on('conversation.updated', async ({ item, delta }) => {
			this.items = ai.conversation.getItems();
			if (delta?.audio) {
				wavStreamPlayer.add16BitPCM(delta.audio, item.id);
			}
			if (item.status === 'in_progress' && item.role === 'assistant') {
				this.aiSpeaking();
			}
			if (item.status === 'completed' && item.formatted.audio?.length && item.role === 'assistant') {
				//const wavFile = await WavRecorder.decode(item.formatted.audio, 24000,24000);
				//item.formatted.file = wavFile;
				this.aiStopSpeaking();
			}
		});

		window.app = this;
	},
}



</script>
<style>
@keyframes pulseOpacity {
	0%,
	100% {
		opacity: 1;
	}

	50% {
		opacity: 0.5;
	}
}

.pulsing-canvas {
	animation: pulseOpacity 2s infinite;
}
</style>