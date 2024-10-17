class MuLawAudioBuffer {
	constructor(sampleRate = 8000, chunkSize = 8000) {
		this.sampleRate = sampleRate;  // 8000 Hz
		this.chunkSize = chunkSize;    // 1-second chunks (8000 samples)
		this.buffer = [];              // Holds the encoded audio data
		this.currentSample = 0;        // Tracks current playback position
		this.isPlaying = false;        // Indicates whether audio is playing
		this.sendCallback = null;      // Function to send audio chunks
	}

	// Append new μ-law encoded audio data to the buffer
	append(audioData) {
		this.buffer = this.buffer.concat(Array.from(audioData));
	}

	// Start streaming the audio in chunks of 1 second
	startStreaming(sendCallback) {
		this.sendCallback = sendCallback;
		this.isPlaying = true;
		this._stream();
	}

	// Internal method to handle streaming
	_stream() {
		if (!this.isPlaying || this.currentSample >= this.buffer.length) return;

		const nextChunkEnd = Math.min(this.currentSample + this.chunkSize, this.buffer.length);
		const chunk = this.buffer.slice(this.currentSample, nextChunkEnd);

		// Send chunk through callback
		if (this.sendCallback) {
			this.sendCallback(chunk);
		}

		this.currentSample = nextChunkEnd;

		// Set a timeout for the next 1 second chunk
		if (this.currentSample < this.buffer.length) {
			setTimeout(() => this._stream(), 1000); // Next chunk after 1 second
		}
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
}

// Example usage:

const audioBuffer = new MuLawAudioBuffer();

// Simulate appending new μ-law encoded audio data (replace with actual data)
const newAudioData = new Uint8Array([/* ... μ-law encoded data ... */]);
audioBuffer.append(newAudioData);

// Define the callback to handle sending the audio chunks for playback
audioBuffer.startStreaming((chunk) => {
	console.log("Streaming audio chunk:", chunk);
});

// Simulate interrupt after 3 seconds
setTimeout(() => {
	const interruptedAtSample = audioBuffer.interrupt();
	console.log("Playback interrupted at sample:", interruptedAtSample);
	const audioDataUntilInterrupt = audioBuffer.getAudioUntilInterrupt();
	console.log("Audio until interrupt:", audioDataUntilInterrupt);
}, 3000);
