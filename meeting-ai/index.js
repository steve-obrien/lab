import express from 'express';
import bodyParser from 'body-parser';
import postmark from 'postmark';
import OpenAI from 'openai';
import config from './config.js';
import { sendCalendarInvite, replyAll } from './utils.js';

const app = express();
app.use(bodyParser.json());

app.get('/hello', async (req, res) => {
	res.json({ success: true });
});

const AiFrom = 'ting@newicon.dev';
const AiReplyTo = 'ting@meet.newicon.dev';

/**
 * The endpoint that receives inbound emails
 * From Postmark
 */
app.post('/inbound', async (req, res) => {

	// 1st we recieve an email
	const emailData = req.body;
	const username = emailData.To.split('@')[0]; // Extract "my-unique-username"
	console.log(emailData);

	// -- First lets route the email to the correct user
	// Check the reply to email address.
	// If it does not include a user then send to the signup AI.

	const ai = new OpenAI({ apiKey: config.openaiApiKey });
// ai.assistants.chat()
	const aiRunner = ai.beta.chat.completions.runTools({
		model: 'gpt-4o',
		messages: [
			{
				"role": "system",
				"content": `Today's date is ${new Date().toLocaleDateString()}. Use this date as a reference.
				You are a personal assistant called @ting - you help book meetings.
				You are copied into email conversations to find appropriate time windows to book meetings.
				You should read the email and respond to the appropriate people to organise a meeting time.
				If a slot is agreed please send a calendar invite and reply to relevent parties that you have booked it in and they should have received an invite.
				People may refer to you directly in the email as @ting.
				your email address is ai+steve123@meet-ting.newicon.dev.
				Do not respond directly to out of office - respond to the person who is asking you to book a meeting.`
			},
			{
				role: 'user',
				content: `
				Email Received:
					Subject: ${emailData.Subject}
					From: ${emailData.From}
					To: ${emailData.To}
					Cc: ${emailData.Cc}
					Date: ${emailData.Date}
					Body: 
					${emailData.TextBody}
				`
			}
		],
		// respond with htmlBody and TextBody for email
		response_format: {
			type: 'json_schema',
			json_schema: {
				name: 'email_response',
				schema: {
					type: 'object',
					properties: {
						htmlBody: { type: 'string' },
						textBody: { type: 'string' }
					},
					required: ['htmlBody', 'textBody']
				}
			}
		},
		tools: [
			{
				type: 'function',
				function: {
					function: lookupAvailableTimes,
					description: 'Lookup available calendar times',
					parameters: {
						type: "object",
						properties: {
							start: {
								type: "string",
								description: "The start date of the requested availability in format Y-m-d"
							},
						},
						required: ['start']
					}
				}
			},
			// {
			// 	type: 'function',
			// 	function: {
			// 		function: sendCalendarInvite,
			// 		parse: JSON.parse,
			// 		parameters: {
			// 			type: 'object',
			// 			properties: {
			// 				Subject: { type: 'string' },
			// 				HtmlBody: { type: 'string' },
			// 				TextBody: { type: 'string' }
			// 			},
			// 			required: ['Subject', 'HtmlBody', 'TextBody']
			// 		}
			// 	},
			// },
			{
				type: 'function',
				function: {
					function: replyToEmail,
					parse: JSON.parse,
					parameters: {
						type: 'object', 
						properties: {
							messageText: { type: 'string' },
							messageHtml: { type: 'string' }
						},
						required: ['messageText', 'messageHtml']
					}
				},
			},
		],
	})
		.on('message', (message) => {
			console.log(message)
		});

	const finalContent = await aiRunner.finalContent();

	// I need to reply to the everyone in CC and the original sender
	// I need to remove any email that ends with newicon.dev

	const emailClient = new postmark.ServerClient(config.postmarkApiKey);

	const { htmlBody, textBody } = JSON.parse(finalContent);

	const replyTo = replyAll(emailData);
	const response = await emailClient.sendEmail({
		"From": AiFrom,
		"ReplyTo": AiReplyTo,
		"To": replyTo.To,
		"Cc": replyTo.Cc,
		"Subject": emailData.Subject,
		"HtmlBody": `${htmlBody}`,
		"TextBody": `${textBody}`,
		"MessageStream": "outbound",
		"Headers": [
			{ "Name": "In-Reply-To", "Value": emailData.MessageID },
			{ "Name": "References", "Value": emailData.MessageID }
		]
	});



	console.log(response);

	// if the email is the generic ai - then it responds to sign the user up.

	// lets add to a db

	res.json({ success: true });
});


app.get('/outbound', async (req, res) => {
	// Send an email:
	// const client = new postmark.ServerClient(config.postmarkApiKey);

	// const response = await client.sendEmail({
	// 	"From": "ai+steve123@newicon.dev",
	// 	"ReplyTo": "ai+steve123@meet-ting.newicon.dev",
	// 	"To": "steve@newicon.net",
	// 	"Subject": "Hello from Postmark",
	// 	"HtmlBody": "<strong>Hello</strong> dear Postmark user!",
	// 	"TextBody": "Hello from Postmark!",
	// 	"MessageStream": "outbound"
	// });

	console.log(response);

	res.json({ success: response });
});

app.get('/outbound-invite', async (req, res) => {
	// Send an email:
	const invite = await sendCalendarInvite({
		from: AiFrom,
		to: ['steve@newicon.net'],
		subject: 'Hello from Postmark',
		htmlBody: '<strong>Hello</strong> dear Postmark user!',
		textBody: 'Hello from Postmark!',
		startTime: new Date('2025-03-12T10:00:00Z'),
		endTime: new Date('2025-03-12T11:00:00Z'),
		location: '123 Main St, Anytown, USA',
		description: 'A meeting with Steve'
	});

	console.log(invite);

	res.json({ success: invite });
});




app.get('/ai', async (req, res) => {


	const client = new OpenAI({
		apiKey: config.openaiApiKey, // This is the default and can be omitted
	});

	res.write('{"status": "started"}');

	const runner = client.beta.chat.completions
		.runTools({
			model: 'gpt-4o',
			messages: [
				{
					"role": "system",
					"content": `Today's date is ${new Date().toLocaleDateString()}. Use this date as a reference.
					You are a calendar assistant. You are copied into email conversations to find appropriate time windows to book meetings.
					Your response will be emailed back please provide a htmlBody and textBody response.`
				},
				{ role: 'user', content: 'Am I free next week? Can you reply by email please?' }
			],
			response_format: {
				type: 'json_schema',
				json_schema: {
					name: 'email_response',
					schema: {
						type: 'object',
						properties: {
							htmlBody: { type: 'string' },
							textBody: { type: 'string' }
						},
						required: ['htmlBody', 'textBody']
					}
				}
			},
			tools: [
				{
					type: 'function',
					function: {
						function: lookupAvailableTimes,
						description: 'Lookup available calendar times',
						parameters: {
							type: "object",
							properties: {
								start: {
									type: "string",
									description: "The start date of the requested availability in format Y-m-d"
								},
							},
							required: ['start']
						}
					}
				},
				{
					type: 'function',
					function: {
						function: replyToEmail,
						parse: JSON.parse,
						parameters: {
							type: 'object',
							properties: {
								to: { type: 'string' },
								cc: { type: 'string' },
								subject: { type: 'string' },
								messageText: { type: 'string' },
								messageHtml: { type: 'string' }
							},
							required: ['to', 'cc', 'subject', 'messageText', 'messageHtml']
						}
					},
				},
			],
		})
		.on('message', (message) => {
			console.log(message)
			res.write(JSON.stringify({ partialMessage: message }) + '\n');
		});

	const finalContent = await runner.finalContent();
	console.log();
	console.log('Final content:', JSON.parse(finalContent));

	// res.json({ message: finalContent });

	res.write(JSON.stringify({ finalMessage: finalContent }, null, 2) + '\n');
	res.end();
	// Send an email:
	// const client = new OpenAI({
	// 	apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
	// });

	// const chatCompletion = await client.chat.completions.create({
	// 	messages: [{ role: 'user', content: 'Hello how are you?' }],
	// 	model: 'gpt-3.5-turbo',
	// });
	// res.json({ message: chatCompletion });
});



async function replyToEmail(args) {
	console.log('reply to email', args);
	const { to, cc, subject, messageText, messageHtml } = args;
	const client = new postmark.ServerClient(config.postmarkApiKey);
	const response = await client.sendEmail({
		"From": "ai+steve123@newicon.dev",
		"ReplyTo": "ai+steve123@meet-ting.newicon.dev",
		"To": to,
		"Cc": cc,
		"Subject": subject,
		"HtmlBody": messageHtml,
		"TextBody": messageText,
		"MessageStream": "outbound"
	});

	return response;
}

async function lookupAvailableTimes(args) {
	console.log(args);
	return {
		availableTimes: [
			{
				"status": "available",
				"start_time": "2025-03-04T10:00:00Z",
				"invitees_remaining": 1,
			},
			{
				"status": "available",
				"start_time": "2025-03-04T12:30:00Z",
				"invitees_remaining": 1,
			},
			{
				"status": "available",
				"start_time": "2025-03-04T13:00:00Z",
				"invitees_remaining": 1,
			},
			{
				"status": "available",
				"start_time": "2025-03-04T13:30:00Z",
				"invitees_remaining": 1,
			},
			{
				"status": "available",
				"start_time": "2025-03-04T14:00:00Z",
				"invitees_remaining": 1,
			},
			{
				"status": "available",
				"start_time": "2025-03-04T14:30:00Z",
				"invitees_remaining": 1,
			},
		]
	};
}

app.listen(3000, () => console.log('Listening on port 3000'));
