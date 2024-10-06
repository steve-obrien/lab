// Access the exposed API

// Elements
const startButton = document.getElementById('startButton');
const microphoneSelect = document.getElementById('microphoneSelect');
const sourceSelect = document.getElementById('sourceSelect');

let mediaRecorder;
let recordedChunks = [];

// Populate microphone options
async function getMicrophoneSources() {
	const devices = await navigator.mediaDevices.enumerateDevices();
	const audioInputs = devices.filter(device => device.kind === 'audioinput');

	audioInputs.forEach(device => {
		const option = document.createElement('option');
		option.value = device.deviceId;
		option.text = device.label || `Microphone ${microphoneSelect.length + 1}`;
		microphoneSelect.appendChild(option);
	});
}

// Populate screen/window sources
async function getVideoSources() {
	const inputSources = await electronAPI.getSources({
		types: ['window', 'screen']
	});

	inputSources.forEach(source => {
		const option = document.createElement('option');
		option.value = source.id;
		option.text = source.name;
		sourceSelect.appendChild(option);
	});
}

startButton.addEventListener('click', () => {
	startButton.disabled = true;
	microphoneSelect.disabled = true;
	sourceSelect.disabled = true;
	startRecording();
});

async function startRecording() {
	try {
		const audioSource = microphoneSelect.value;
		const audioConstraints = audioSource ? { deviceId: { exact: audioSource } } : true;

		const selectedSourceId = sourceSelect.value;

		const audioStream = await navigator.mediaDevices.getUserMedia({
			audio: audioConstraints,
			video: false
		});

		const videoStream = await navigator.mediaDevices.getUserMedia({
			audio: false,
			video: {
				mandatory: {
					chromeMediaSource: 'desktop',
					chromeMediaSourceId: selectedSourceId
				}
			}
		});

		// Combine streams
		const combinedStream = new MediaStream([
			...videoStream.getVideoTracks(),
			...audioStream.getAudioTracks()
		]);

		mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm; codecs=vp9' });

		mediaRecorder.ondataavailable = function (event) {
			if (event.data.size > 0) {
				recordedChunks.push(event.data);
			}
		};

		mediaRecorder.onstop = function () {
			const blob = new Blob(recordedChunks, { type: 'video/webm' });
			recordedChunks = [];

			// Convert blob to buffer
			blob.arrayBuffer().then((buffer) => {
				electronAPI.send('save-recording', { buffer: Buffer.from(buffer) });
			});
		};

		mediaRecorder.start();

	} catch (err) {
		console.error('Error starting recording:', err);
		electronAPI.send('save-recording', { buffer: null });
	}
}

electronAPI.on('stop-recording', () => {
	if (mediaRecorder && mediaRecorder.state !== 'inactive') {
		mediaRecorder.stop();
	} else {
		electronAPI.send('save-recording', { buffer: null });
	}
});

// Initialize options
getMicrophoneSources();
getVideoSources();