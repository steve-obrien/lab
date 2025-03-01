import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import postmark from 'postmark';
import OpenAI from 'openai';

dotenv.config();

const app = express();
app.use(bodyParser.json());



app.get('/hello', async (req, res) => {
	res.json({ success: true });
});


app.post('/inbound', async (req, res) => {

	// 1st we recieve an email
	const emailData = req.body;
	const username = emailData.To.split('@')[0]; // Extract "my-unique-username"
	console.log(emailData);

	// -- First lets route the email to the correct user
	// Check the reply to email address.
	// If it does not include a user then send to the signup AI.

	const ai = new OpenAI({ apiKey: process.env['OPENAI_API_KEY'] });

	const aiRunner = ai.beta.chat.completions.runTools({
		model: 'gpt-4o',
		messages: [
			{
				"role": "system",
				"content": `Today's date is ${new Date().toLocaleDateString()}. Use this date as a reference.
				You are a calendar assistant. You are copied into email conversations to find appropriate time windows to book meetings.
				If a slot is agreed please send a calendar invite and reply that you have booked it in and they should have received an invite.
				your email address is ai+steve123@meet-ting.newicon.dev.`
			},
			{ role: 'user', content: emailData.TextBody }
		],
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
					function: sendCalendarInvite,
					parse: JSON.parse,
					parameters: {
						type: 'object',
						properties: {
							Subject: { type: 'string' },
							HtmlBody: { type: 'string' },
							TextBody: { type: 'string' }
						},
						required: ['Subject', 'HtmlBody', 'TextBody']
					}
				},
			},
			// {
			// 	type: 'function',
			// 	function: {
			// 		function: replyToEmail,
			// 		parse: JSON.parse,
			// 		parameters: {
			// 			type: 'object', 
			// 			properties: {
			// 				messageText: { type: 'string' },
			// 				messageHtml: { type: 'string' }
			// 			},
			// 			required: ['messageText', 'messageHtml']
			// 		}
			// 	},
			// },
		],
	})
	.on('message', (message) => {
		console.log(message)
	});

	const finalContent = await aiRunner.finalContent();


	const emailClient = new postmark.ServerClient(process.env.POSTMARK_API_KEY);
	const response = await emailClient.sendEmail({
		"From": "hello@newicon.dev",
		"ReplyTo": "hello@anything.newicon.dev",
		"To": emailData.To,
		"Subject": emailData.Subject,
		"HtmlBody": `${finalContent}`,
		"TextBody": `${finalContent}`,
		"MessageStream": "outbound",
		// "Headers": [
		// 	{ "Name": "In-Reply-To", "Value": "<original-message-id@domain.com>" },
		// 	{ "Name": "References", "Value": "<original-message-id@domain.com>" }
		// ]
	});

	console.log(response);

	// if the email is the generic ai - then it responds to sign the user up.

	// lets add to a db

	res.json({ success: true });
});


app.get('/outbound', async (req, res) => {
	// Send an email:
	const client = new postmark.ServerClient(process.env.POSTMARK_API_KEY);

	const response = await client.sendEmail({
		"From": "ai+steve123@newicon.dev",
		"ReplyTo": "ai+steve123@meet-ting.newicon.dev",
		"To": "steve@newicon.net",
		"Subject": "Hello from Postmark",
		"HtmlBody": "<strong>Hello</strong> dear Postmark user!",
		"TextBody": "Hello from Postmark!",
		"MessageStream": "outbound"
	});

	console.log(response);

	res.json({ success: response });
});




app.get('/ai', async (req, res) => {


	const client = new OpenAI({
		apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
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
					Your response will be emailed back.`
				},
				{ role: 'user', content: 'Am I free next week? Can you reply by email please?' }
			],
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
								messageText: { type: 'string' },
								messageHtml: { type: 'string' }
							},
							required: ['messageText', 'messageHtml']
						}
					},
				},
				{
					type: 'function',
					function: {
						function: getWeather,
						parse: JSON.parse, // or use a validation library like zod for typesafe parsing.
						parameters: {
							type: 'object',
							properties: {
								location: { type: 'string' },
							},
						},
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
	console.log('Final content:', finalContent);

	// res.json({ message: finalContent });

	res.write(JSON.stringify({ finalMessage: finalContent }) + '\n');
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


/**
 * Sends a calendar invite via Postmark with multiple attendees.
 * 
 * @param {Object} params - Event details.
 * @param {string} params.from - Sender email.
 * @param {string} params.subject - Email subject.
 * @param {string[]} params.to - Recipient emails (array of attendees).
 * @param {string} params.htmlBody - HTML email body.
 * @param {string} params.textBody - Plain text email body.
 * @param {Date} params.startTime - Event start time (ISO format).
 * @param {Date} params.endTime - Event end time (ISO format).
 * @param {string} params.location - Event location.
 * @param {string} params.description - Event description.
 */
async function sendCalendarInvite({
	from,
	to,
	subject,
	htmlBody,
	textBody,
	startTime,
	endTime,
	location,
	description
}) {
	const client = new postmark.ServerClient(process.env.POSTMARK_API_KEY);

	// Generate .ics file content with multiple attendees
	const icsContent = generateICS({ startTime, endTime, location, description, subject, to, from });

	// Convert to Base64
	const icsBase64 = Buffer.from(icsContent).toString("base64");

	// Prepare email payload
	const emailPayload = {
		From: from,
		To: to.join(", "), // Send to all attendees
		Subject: subject,
		HtmlBody: htmlBody,
		TextBody: textBody,
		Attachments: [
			{
				Name: "invite.ics",
				Content: icsBase64,
				ContentType: "text/calendar; charset=utf-8; method=REQUEST",
				Disposition: "inline"
			}
		]
	};

	// Send email via Postmark
	try {
		const response = await client.sendEmail(emailPayload);
		console.log("Email sent:", response);
	} catch (error) {
		console.error("Error sending email:", error);
	}
}

/**
 * Formats a date as YYYYMMDDTHHMMSSZ (UTC format for ICS).
 * 
 * @param {Date} date - The date to format.
 * @returns {string} - Formatted date string.
 */
function formatDate(date) {
	return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/**
 * Generates ICS calendar file content.
 * 
 * @param {Object} eventDetails - Event details.
 * @param {Date} eventDetails.startTime - Event start time.
 * @param {Date} eventDetails.endTime - Event end time.
 * @param {string} eventDetails.location - Event location.
 * @param {string} eventDetails.description - Event description.
 * @param {string} eventDetails.subject - Event summary/title.
 * @param {string[]} eventDetails.to - Array of attendee emails.
 * @param {string} eventDetails.from - Organizer email.
 * @returns {string} - ICS formatted string.
 */
function generateICS({ startTime, endTime, location, description, subject, to, from }) {
	// Convert attendees array to ICS format
	console.log(to);
	// if to is an array
	let attendeesICS = '';
	if (Array.isArray(to)) {
		attendeesICS = to.map(email => `ATTENDEE;RSVP=TRUE:MAILTO:${email}`).join("\n");
	} else {
		attendeesICS = `ATTENDEE;RSVP=TRUE:MAILTO:${to}`;
	}

	return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Your Company//NONSGML v1.0//EN
METHOD:REQUEST
BEGIN:VEVENT
UID:${Date.now()}@yourdomain.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startTime)}
DTEND:${formatDate(endTime)}
SUMMARY:${subject}
DESCRIPTION:${description}
LOCATION:${location}
ORGANIZER;CN=Organizer:MAILTO:${from}
${attendeesICS}
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Reminder
END:VALARM
END:VEVENT
END:VCALENDAR`;
}

async function replyToEmail(args) {
	console.log('reply to email', args);
	const { messageText, messageHtml } = args;
	const client = new postmark.ServerClient(process.env.POSTMARK_API_KEY);
	const response = await client.sendEmail({
		"From": "ai+steve123@newicon.dev",
		"ReplyTo": "ai+steve123@meet-ting.newicon.dev",
		"To": "steve@newicon.net",
		"Subject": "Hello from Postmark",
		"HtmlBody": `${messageHtml}`,
		"TextBody": `${messageText}`,
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

// Mock functions for database actions
async function findUserByUsername(username) {
	// Simulated lookup - replace with real DB query
	return { id: 123, username: username, project_id: 456 };
}

async function storeEmailForUser(userId, email) {
	console.log(`Storing email for User ${userId}:`, email.Subject);
	// Store in database or forward email
}

app.listen(3000, () => console.log('Listening on port 3000'));
