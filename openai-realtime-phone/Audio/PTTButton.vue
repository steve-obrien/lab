<template>
	<div class="ptt-button-wrapper flex items-center">
		<button
			class="ptt-button"
			@touchstart="startBroadcasting"
			@touchend="stopBroadcasting"
		>
			<div class="rounded-full inset-0 absolute flex items-center pointer-events-none">
				<div class="mx-auto select-none flex flex-col justify-center items-center">
					<MicrophoneIcon :connecting="isConnecting" :broadcasting="isBroadcasting" :unavailable="isUnavailable" />
					<div
						class="text-[14px] font-bold"
						:class="isBroadcasting ? 'text-primary-fld' : 'text-secondary-fld'"
					>
						{{ broadcastingLabel }} <br>port: {{ port }}
					</div>
				</div>
			</div>

			<svg
				class="w-full h-full select-none"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 174 174"
			>
				<circle
					cx="87"
					cy="87"
					r="85"
					class="fill-secondary opacity-[.05]"
				/>
				<circle
					cx="87"
					cy="87"
					r="75.5"
					:class="setStateBorder"
					stroke-width="2"
				/>
				<circle cx="87.4" cy="87" r="65.4" :class="setStateBackground" />
			</svg>
		</button>


		<button v-if="hasRewindBtn && recorder.length>0" @click="playBackRecording" class="absolute left-5 bottom-5" v-show="backFunctionality">
			<div class="rounded-full bg-secondary w-[80px] h-[80px] flex items-center justify-center">
				<div>
					<div class="text-primary font-semibold text-3xs leading-tight mb-1">
						Rewind
					</div>
					<div class="text-accent-alt text-[26px] font-semibold tracking-tighter leading-tight">
						<svg class="text-accent-alt mx-auto" width="20" height="16" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M10.0003 2.60289L4.34923 8.28575L10.0003 13.9686L8.26055 15.7143L0.857422 8.28575L8.26054 0.857177L10.0003 2.60289Z" fill="currentColor" />
							<path d="M19.1429 2.60289L13.4918 8.28575L19.1429 13.9686L17.4031 15.7143L10 8.28575L17.4031 0.857177L19.1429 2.60289Z" fill="currentColor" />
						</svg>
					</div>
				</div>
			</div>
		</button>
	</div>
</template>

<script lang="ts">

import { defineComponent, ref, PropType } from 'vue'
import { BroadcastEnum } from  "../../../types/vhf/enums/PttBroadcastEnum"
import MicrophoneIcon from "../../icons/MicrophoneIcon.vue"
import { PttBackgroundEnum } from "../../../types/vhf/enums/PttBackgroundEnum"
import { PttBorderEnum } from "../../../types/vhf/enums/PttBorderEnum"
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import type { Ref } from 'vue'
import { useVhfSettingsStore } from "../../../store/VhfSettingsStore"
import { useNexusStore } from "../../../store/Nexus"
// @ts-ignore
import { mulaw } from 'alawmulaw'
// @ts-ignore
import { SocketFactory, SocketAdapter } from './socket'
import { storeToRefs } from "pinia"
// commented below to fix lint error
// import { SrtBaseStream } from 'srt-base-stream'

let audioStream: MediaStream | undefined = undefined
let microphone: MediaStreamAudioSourceNode | null = null
const mediaConstraints: Object = {
	audio: {
		audioInput: {
			id:'default'
		}
	}
}

type State = "Default" | "Connecting" | "Broadcasting" | "Unavailable"


// For debug - make it accessible to play with in the console
declare let window: any
let recorder: ScriptProcessorNode | null = null
let audioContext: AudioContext | null = null
let audioListenContext: AudioContext | null = null

let socketFactory: SocketFactory | null = null
let socket: SocketAdapter | null = null

class CircularBuffer {
	/* https://stackoverflow.com/a/4774081 */
	public pointer = 0
	public buffer: Ref<Uint8Array[]> = ref([])
	public length: number
	constructor(length: number) {
		this.buffer = ref([])
		this.length = length
	}
	public get(key: number): Uint8Array {
		if (key < 0) {
			return this.buffer.value[this.pointer + key]
		} else {
			return this.buffer.value[key]
		}
	}
	public push(item: Uint8Array) {
		this.buffer.value[this.pointer] = item
		this.pointer = (this.pointer + 1) % this.length
		return item
	}
	public prev() {
		var tmp_pointer = (this.pointer - 1) % this.length
		if (this.buffer.value[tmp_pointer]) {
			this.pointer = tmp_pointer
			return this.buffer.value[this.pointer]
		}
	}
	public next() {
		if (this.buffer.value[this.pointer]) {
			this.pointer = (this.pointer + 1) % this.length
			return this.buffer.value[this.pointer]
		}
	}
}
let recordBuffer = new CircularBuffer(240) // 8 samples a second * 30 = 240
let playBuffer:Uint8Array[] = []

export default defineComponent({
	components: {
		MicrophoneIcon: MicrophoneIcon
	},
	emits: ['start-broadcasting', 'stop-broadcasting'],
	props: {
		hasRewindBtn: {
			type: Boolean,
			default: true
		},
		broadcast: {
			type: String as PropType<BroadcastEnum>,
			default:BroadcastEnum.vhf
		},
		serverAddress: {
			type: String,
			default:""
		}
	},
	setup() {
		const settings = useVhfSettingsStore()
		const { backFunctionality } = storeToRefs(settings)
		return {
			recorder: recordBuffer.buffer,
			backFunctionality
		}
	},
	data() {
		return {
			state: "Default" as State
		}
	},
	computed: {
		address(): string {
			if (this.serverAddress.length > 0)
				return this.serverAddress
			const nexus = useNexusStore()
			return nexus.baseUnit.address
		},
		port(): number {
			const nexus = useNexusStore()
			switch(this.broadcast) {
				case 'vhf':
					return nexus.baseUnit.vhf_tx_port
				case 'loudhail':
					return nexus.baseUnit.loudhail_port
				case 'publicAddress':
					return nexus.baseUnit.public_address_port
				case 'intercom':
					return nexus.baseUnit.intercom_port
				default:
					return -1
			}
		},
		setStateBorder(): string {
			return PttBorderEnum[this.state]
		},
		setStateBackground(): string {
			return PttBackgroundEnum[this.state]
		},
		broadcastingLabel(): string {
			return this.isConnecting ? this.$t("vhf.ptt_button_connecting") :
				(this.isBroadcasting ? this.$t("vhf.ptt_button_broadcasting") :
					(this.isUnavailable ? this.$t("vhf.ptt_button_unavailable") : this.$t("vhf.ptt_button_label")
					))
		},
		isConnecting(): boolean {
			return this.state == 'Connecting'
		},
		isBroadcasting(): boolean {
			return this.state == 'Broadcasting'
		},
		isUnavailable(): boolean {
			return this.state == 'Unavailable'
		}
	},
	mounted() {
		this.state = 'Default'
		window.ptt = this
		window.ref = ref
	},
	methods: {
		permission() {
			navigator.mediaDevices.getUserMedia(mediaConstraints)
		},
		baseConnect() {
			if (socketFactory == null)
				socketFactory = new SocketFactory()
			socket = socketFactory.get(this.address, this.port)
			socket.readCallback = (payload: { data:string } | null, err?: any) => {
				if (!payload || err) {
					this.stopBroadcasting()
					return
				}
				const permission = JSON.parse(payload.data)
				if (permission.audio == undefined) {
					this.stopBroadcasting()
				}
				if (permission.audio == 'accepted') {
					if (!this.isBroadcasting) {
						if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
							navigator.mediaDevices.getUserMedia(mediaConstraints)
								.then((stream:MediaStream) => {
									this.microphoneStream(stream)
									Haptics.impact({ style: ImpactStyle.Heavy })
									this.state = 'Broadcasting'
									this.$emit('start-broadcasting')
								})
								.catch((error) => {
									Haptics.impact({ style: ImpactStyle.Medium })
									this.state = 'Unavailable'
									if (error.toString().includes("NotAllowedError")) {
										alert("SRT Connect Nexus requires access to the microphone in order to broadcast audio. Please provide this permission in the app's settings")
									}
								})
						} else {
							this.state = 'Unavailable'
							console.log('getUserMedia is not supported on this device so cannot connect to audio')
						}
					}
				} else {
					this.state = 'Unavailable'
					if (this.isBroadcasting)
						this.stopBroadcasting()
				}
			}
			// For debug - make it accessible to play with in the console
			window.socket = socket
			console.log('establishing base unit connection...')
			socket.onError = function (errorMessage: any) {
				console.error(errorMessage)
			}
			socket.onClose = (hasError: boolean) => {
				console.log('connection closed. Was error ' + hasError)
			}
			return socket.open()
		},
		baseDisconnect() {
			socket?.close()
			socket = null
			window.socket = null
		},
		startBroadcasting() {
			if (this.state == 'Broadcasting') return
			Haptics.impact({ style: ImpactStyle.Light })
			this.state = 'Connecting'
			if (audioStream !== undefined) {
				this.stopBroadcasting()
			}
			// start broadcasting once we have both the audio stream and the network connection
			// see how responsive this is when starting up a connection
			this.baseConnect()
				.then(() => {
					// broadcasting is now down once we receive permission to transmit
				})
				.catch(() => {
					Haptics.impact({ style: ImpactStyle.Heavy })
					this.state = 'Unavailable'
				})
		},
		stopBroadcasting() {
			this.baseDisconnect()
			// stop listening to the microphone
			audioStream?.getAudioTracks().forEach(track => {
				track.stop()
			})
			audioStream = undefined
			recorder?.disconnect()
			microphone?.disconnect()
			recorder?.removeEventListener('audioprocess', this.audioProcess)
			recorder = null
			microphone = null
			this.destroyAudioContext()
			Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {})
			this.state = 'Default'
			this.$emit('stop-broadcasting')
		},
		createAudioContext(): AudioContext {
			if (audioContext) {
				audioContext.close()
				audioContext = null
			}
			if (!audioContext)
				audioContext = new AudioContext({ sampleRate: 8000, latencyHint: 'interactive' })
			return audioContext
		},
		destroyAudioContext() {
			audioContext?.close()
			audioContext = null
		},
		microphoneStream(stream: MediaStream) {
			audioStream = stream
			//console.log(stream)
			const audioTracks = audioStream.getAudioTracks()
			if (audioTracks.length > 0) {
				console.log(`Using Audio device: ${audioTracks[0].label}`)
			}
			const audioCtx = this.createAudioContext() // creates audio context
			microphone = audioCtx.createMediaStreamSource(stream)
			let gain = audioCtx.createGain()
			recorder = audioCtx.createScriptProcessor(1024, 1, 1)
			recorder.removeEventListener('audioprocess', this.audioProcess)
			recorder.addEventListener('audioprocess', this.audioProcess)
			microphone.connect(gain)
			gain.connect(recorder)
			recorder.connect(audioCtx.destination)
		},
		audioProcess(e: AudioProcessingEvent) {
			// lets check if we should be sending...
			// this is a super gross hack like everything else...
			// fix the symptom not root cause of the stop broadcast not always stopping!
			if (this.state === 'Broadcasting' && socket != null) {
				let left = e.inputBuffer.getChannelData(0)
				let micFloat32 = new Float32Array(left)
				const int16Array = Int16Array.from(micFloat32, x => x * 32767)
				let micMulaw = mulaw.encode(int16Array)
				//console.log('Audio Send', micMulaw)
				socket?.send(micMulaw)
			} else {
				// we should not be broadcasting so why are we in this function!!
				// lets call stop again and hope for some good behaviour!!
				this.stopBroadcasting()
			}
		},
		audioReceive(arrayBuffer: Uint8Array) {
			// don't receive our own audio
			if (this.state === 'Broadcasting')
				return
			// add packet to the play buffer
			playBuffer.push(arrayBuffer)
			// and to the record buffer
			recordBuffer.push(arrayBuffer)
			if (playBuffer.length == 1) {
				this.playBack(0)
			}
		},
		playBack(i:number) {
			setTimeout(() => {
				if (i >= playBuffer.length) {
					playBuffer = []
					i = 0
					return
				}
				this.audioPlay(this.audioDecode(playBuffer[i]))
				this.playBack(i+1)
			}, 125)
		},
		audioDecode(sample: Uint8Array): Float32Array {
			let micInt16 = mulaw.decode(sample)
			return this.int16ToFloat32(micInt16)
		},
		audioPlay(sample: Float32Array) {
			const context = this.getAudioListenContext()
			// const context = new AudioContext();
			// don't play your own audio back
			//if (this.state == 'Broadcasting') return;
			var sampleRate = 8000
			let buffer = context.createBuffer(1, sample.length, sampleRate)
			let channel32Array = buffer.getChannelData(0)
			channel32Array.set(sample)
			let source = context.createBufferSource()
			source.buffer = buffer
			// Then output to speaker for example
			source.connect(context.destination)
			source.start()
		},
		getAudioListenContext(): AudioContext {
			if (audioListenContext === null)
				audioListenContext = new AudioContext({ sampleRate: 8000, latencyHint: 'interactive' })
			return audioListenContext
		},

		playBackRecording() {
			window.recordBuffer = recordBuffer
			for (let i = 0; i < recordBuffer.buffer.value.length; i++) {
				setTimeout(() => {
					this.audioPlay(this.audioDecode(recordBuffer.get(i)))
				}, 125 * i)
			}
		},
		// This is passed in an unsigned 16-bit integer array. It is converted to a 32-bit float array.
		int16ToFloat32(inputArray: Int16Array) {
			let output = new Float32Array(inputArray.length)
			for (let i = 0; i < inputArray.length; i++) {
				let int = inputArray[i]
				// If the high bit is on, then it is a negative number, and actually counts backwards.
				let float = (int >= 0x8000) ? -(0x10000 - int) / 0x8000 : int / 0x7FFF
				output[i] = float
			}
			return output
		},
	}
})

</script>
<style scoped>
.ptt-button-wrapper {
	--vhf-ptt-height: calc(45vh - 60px);
	height: var(--vhf-ptt-height);
}

.ptt-button {
	margin: auto;
	max-height: calc(100vh - 600px);
	min-height: 200px;
	min-width: 200px;
	max-width: 100%;
	position: relative;
	padding: 0;
	width: 100%;
	height: 100%;
}
</style>


