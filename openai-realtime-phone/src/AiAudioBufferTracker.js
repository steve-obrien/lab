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

export default AiAudioBufferTracker;