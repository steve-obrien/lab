import plivoClient from '../plivoClient.js';
import aiConfig from '../aiConfig.js';

const { PLIVO_PHONE_NUMBER, HOST } = process.env;

class PlivoController {

	constructor() { }

	static async makeCall(request, reply) {
		console.log('make call')
		const to = request.body.to;
		Object.assign(aiConfig, { ...request.body });
		try {
			const response = await plivoClient.calls.create(
				PLIVO_PHONE_NUMBER, // From number
				to, // To number
				`https://${HOST}/outbound-call`, // Answer URL
				{ answerMethod: 'GET' }
			);
			console.log(response);
			reply.send({ message: 'Call initiated', callSid: response.messageUuid });
		} catch (error) {
			console.error('Error making call:', error);
			reply.status(500).send({ error: 'Failed to make call' });
		}
	}

	/**
	 * 
	 * @param {*} request 
	 * @param {*} reply 
	 */
	static outboundCall(request, reply) {
		console.log('/outbound-call')
		reply.type('text/xml').send(
			`<?xml version="1.0" encoding="UTF-8"?>
			<Response>
				<Play>https://s3.amazonaws.com/plivocloud/Trumpet.mp3</Play>
				<Stream contentType="audio/x-mulaw;rate=8000" bidirectional="true" keepCallAlive="true" statusCallbackUrl="https://${request.headers.host}/callbacks">wss://${request.headers.host}/media-stream</Stream>
			</Response>
			`
		);
	}

	static callbacks(request, reply) {
		console.log(request.body)
	}
}

export default PlivoController;