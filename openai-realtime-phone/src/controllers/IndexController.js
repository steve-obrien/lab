import twilioClient from '../twilioClient.js';
import aiConfig from '../aiConfig.js';
import webLog from '../WebSocketManager.js';

const { TWILIO_PHONE_NUMBER, HOST } = process.env;

class IndexController {

	constructor() { }

	static async makeCall(request, reply) {
		console.log('make call')
		const to = request.body.to;
		Object.assign(aiConfig, { ...request.body });
		try {
			const call = await twilioClient.calls.create({
				url: `https://${HOST}/outbound-call`, // TwiML URL
				to,
				from: TWILIO_PHONE_NUMBER,
				record: true,
				statusCallback: `https://${HOST}/status-callback`,
				statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
				statusCallbackMethod: 'POST',
			});
			reply.send({ message: 'Call initiated', callSid: call.sid });
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
		reply.type('text/xml').send(
			`<?xml version="1.0" encoding="UTF-8"?>
			 <Response>
				<Connect>
					<Stream url="wss://${request.headers.host}/media-stream" />
				</Connect>
			 </Response>`
		);
	}

	static inboundCall(request, reply) {
		reply.type('text/xml').send(
			`<?xml version="1.0" encoding="UTF-8"?>
			<Response>
				<Connect>
					<Stream url="wss://${request.headers.host}/media-stream?inbound=true" statusCallback="https://${request.headers.host}/status-callback" statusCallbackMethod="POST" />
				</Connect>
			</Response>`
		);
	}

	static statusCallback(request, reply) {
		console.log('Status callback', request.body);

		// console.log(`Call SID: ${callSid}, Status: ${callStatus}`);

		// You can save this information to a database or notify your frontend about the status
		// Example: save to a database
		// updateCallStatusInDatabase(callSid, callStatus);
		

		// emit status via websocket
		// webLog.emitStatus(callSid, callStatus);
		// webLog.sendStatus(callSid, callStatus);
		webLog.send("status", request.body);

		reply.sendStatus(200);
	}
}

export default IndexController;