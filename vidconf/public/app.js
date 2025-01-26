const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const socket = io('http://localhost:3000');
let localStream;
let peerConnection;

const configuration = {
	iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

async function start() {
	// Get user media
	localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
	localVideo.srcObject = localStream;

	// Create peer connection
	peerConnection = new RTCPeerConnection(configuration);

	// Add local stream tracks to peer connection
	localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

	// Handle remote stream
	peerConnection.ontrack = (event) => {
		console.log('Track event received:', event);
		if (event.streams && event.streams[0]) {
			console.log('Remote stream available:', event.streams[0]);
			remoteVideo.srcObject = event.streams[0];
		} else {
			console.error('No remote stream available');
		}
	};

	// Handle ICE candidates
	peerConnection.onicecandidate = (event) => {
		if (event.candidate) {
			socket.emit('candidate', event.candidate);
		}
	};
}

// Handle signaling messages
socket.on('offer', async (offer) => {
	peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
	const answer = await peerConnection.createAnswer();
	await peerConnection.setLocalDescription(answer);
	socket.emit('answer', answer);
});

socket.on('answer', (answer) => {
	peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('candidate', (candidate) => {
	peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

// Start the connection and send an offer
async function call() {
	start();
	const offer = await peerConnection.createOffer();
	await peerConnection.setLocalDescription(offer);
	socket.emit('offer', offer);
}

start();
