import postmark from 'postmark';
import config from './config.js';

export function extractAndFilterEmails(emailData) {
	const from = emailData.From ? emailData.From.split(',').map(email => email.trim()) : '';
	const to = emailData.To ? emailData.To.split(',').map(email => email.trim()) : '';
	const cc = emailData.Cc ? emailData.Cc.split(',').map(email => email.trim()) : '';
	// Filter out empty strings and specific newicon.dev domain
	const allRecipients = [...from, ...to, ...cc].filter(email => {
		return email && !email.endsWith('newicon.dev'); // Filter out empty strings and specific domain

	});
	return allRecipients;
}

export function removeSender(recipients, sender) {
	const recipientsArray = recipients ? recipients.split(',').map(email => email.trim()) : [];
	return recipientsArray.filter(recipient => recipient !== sender);
}

export function extractAiSender(To) {
	const aiSender = To.split(',').find(email => email.endsWith('.newicon.dev'));
	return aiSender;
}

export function replyAll(emailData, sender="newicon.dev") {
	const from = emailData.From ? emailData.From.split(',').map(email => email.trim()) : [];
	const to = emailData.To ? emailData.To.split(',').map(email => email.trim()) : [];
	const cc = emailData.Cc ? emailData.Cc.split(',').map(email => email.trim()) : [];
	// Filter out empty strings and specific newicon.dev domain
	const filteredTo = [...from, ...to].filter(email => {
		return !email.endsWith(sender); // Filter out empty strings and specific domain
	})
	const filteredCc = [...cc].filter(email => {
		return !email.endsWith(sender); // Filter out empty strings and specific domain
	});
	return {
		To: filteredTo.join(','),
		Cc: filteredCc.join(','),
	};
}



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
export async function sendCalendarInvite({
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
	const client = new postmark.ServerClient(config.postmarkApiKey);

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
export function formatDate(date) {
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
export function generateICS({ startTime, endTime, location, description, subject, to, from }) {
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