const express = require('express');
const { google } = require('googleapis');
const app = express();
const tokenService = require('./tokenService');
const env = require('dotenv').config().parsed;

const CLIENT_ID = env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = env.GOOGLE_REDIRECT_URI;

const oauth2Client = new google.auth.OAuth2(
	CLIENT_ID,
	CLIENT_SECRET,
	REDIRECT_URI
);

// Step 2: Redirect user to Google's OAuth 2.0 server
app.get('/auth', (req, res) => {
	const scopes = ['https://www.googleapis.com/auth/gmail.readonly'];

	const authUrl = oauth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: scopes,
	});

	res.redirect(authUrl);
});

const fs = require('fs');
const path = require('path');
function saveTokensToFile(tokens) {
	const tokenPath = path.join(__dirname, 'tokens.json');
	fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
}

function getTokensFromFile() {
	const tokenPath = path.join(__dirname, 'tokens.json');
	const tokens = fs.readFileSync(tokenPath);
	return JSON.parse(tokens);
}

// Step 3: Handle OAuth2 callback
app.get('/oauth2callback', async (req, res) => {
	const code = req.query.code;

	try {
		// Step 4: Exchange code for tokens and set credentials
		const { tokens } = await oauth2Client.getToken(code);


		oauth2Client.setCredentials(tokens);

		saveTokensToFile(tokens);

		const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

		// Step 6: Make an authenticated API call
		const emailResponse = await gmail.users.messages.list({
			userId: 'me',
			maxResults: 10,
		});

		const messages = emailResponse.data.messages || [];

		// Send messages to frontend or process as needed
		response.json(messages);

	} catch (error) {
		console.error('Error during OAuth callback:', error);
		res.status(500).send('Authentication error');
	}
});

app.get('/emails', async (req, res) => {
	const tokens = getTokensFromFile();
	oauth2Client.setCredentials(tokens);

	const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

	// Step 6: Make an authenticated API call
	const emailResponse = await gmail.users.messages.list({
		userId: 'me',
		maxResults: 10,
	});

	const messages = emailResponse.data.messages || [];
	// Fetch full message details for each message
	const detailedMessages = await Promise.all(
		messages.map(async (message) => {
			const msg = await gmail.users.messages.get({
				userId: 'me',
				id: message.id,
			});

			// Check if the message has payload parts
			let emailBody = '';
			if (msg.data.payload.parts) {
				// Loop through parts to find the plain text or HTML part
				for (let part of msg.data.payload.parts) {
					if (part.mimeType === 'text/plain') {
						// Decode the Base64 URL encoded message
						emailBody = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
						break;
					}
				}
			} else {
				// If no parts, check if body is directly available
				emailBody = atob(msg.data.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
			}

			// Return the full message data along with the decoded body
			return {
				...msg.data,
				emailBody, // Decoded email body
			};
		})
	);

	// Send detailed messages to frontend or process as needed
	res.json(detailedMessages);
})

app.listen(3000, () => {
	console.log('App listening on port 3000');
});