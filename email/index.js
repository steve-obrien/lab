/**
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* eslint-disable camelcase */
// [START gmail_quickstart]
const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const { authenticate } = require('@google-cloud/local-auth');
const { google } = require('googleapis');
const pool = require('./db');
const analyzeEmail = require('./ai');
const generateSmartReply = require('./smart_reply');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
	try {
		const content = await fs.readFile(TOKEN_PATH);
		const credentials = JSON.parse(content);
		return google.auth.fromJSON(credentials);
	} catch (err) {
		return null;
	}
}

/**
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
	const content = await fs.readFile(CREDENTIALS_PATH);
	const keys = JSON.parse(content);
	const key = keys.installed || keys.web;
	const payload = JSON.stringify({
		type: 'authorized_user',
		client_id: key.client_id,
		client_secret: key.client_secret,
		refresh_token: client.credentials.refresh_token,
	});
	await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
	let client = await loadSavedCredentialsIfExist();
	if (client) {
		return client;
	}
	client = await authenticate({
		scopes: SCOPES,
		keyfilePath: CREDENTIALS_PATH,
	});
	if (client.credentials) {
		await saveCredentials(client);
	}
	return client;
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function listLabels(auth) {
	const gmail = google.gmail({ version: 'v1', auth });
	const res = await gmail.users.labels.list({
		userId: 'me',
	});
	const labels = res.data.labels;
	if (!labels || labels.length === 0) {
		console.log('No labels found.');
		return;
	}
	console.log('Labels:');
	labels.forEach((label) => {
		console.log(`- ${label.name}`);
	});
}

async function listLatestEmails(auth) {
	const gmail = google.gmail({ version: 'v1', auth });

	// List the latest emails
	const res = await gmail.users.messages.list({
		userId: 'me',
		maxResults: 10, // Fetch up to 10 latest emails
		q: 'category:primary', // You can filter emails using query strings, e.g., 'is:unread'
	});

	const messages = res.data.messages;
	if (!messages || messages.length === 0) {
		console.log('No emails found.');
		return;
	}

	console.log('Latest Emails:');

	for (const message of messages) {
		const email = await gmail.users.messages.get({
			userId: 'me',
			id: message.id,
		});

		const headers = email.data.payload.headers;
		const subject = headers.find(header => header.name === 'Subject')?.value || 'No Subject';
		const from = headers.find(header => header.name === 'From')?.value || 'Unknown Sender';
		const snippet = email.data.snippet || '';

		console.log(`- From: ${from}, Subject: ${subject}, Snippet: ${snippet}`);
	}
}

async function saveEmailsToDatabase(auth) {
	const gmail = google.gmail({ version: 'v1', auth });

	// Fetch primary inbox emails
	const res = await gmail.users.messages.list({
		userId: 'me',
		maxResults: 10,
		q: 'category:primary', // Only primary emails
	});

	const messages = res.data.messages;
	if (!messages || messages.length === 0) {
		console.log('No emails found.');
		return;
	}

	console.log('Saving Emails to Database...');

	for (const message of messages) {
		const email = await gmail.users.messages.get({
			userId: 'me',
			id: message.id,
		});

		const headers = email.data.payload.headers;
		const subject = headers.find(header => header.name === 'Subject')?.value || 'No Subject';
		const from = headers.find(header => header.name === 'From')?.value || 'Unknown Sender';
		const snippet = email.data.snippet || '';
		const threadId = email.data.threadId || '';
		const receivedAt = new Date(parseInt(email.data.internalDate));

		// Extract plain text body (simplified, may require MIME decoding)
		let body = '';
		if (email.data.payload?.parts) {
			const part = email.data.payload.parts.find(p => p.mimeType === 'text/plain');
			body = part?.body?.data ? Buffer.from(part.body.data, 'base64').toString() : '';
		}

		// Insert into MySQL
		try {
			const sql = `
                INSERT INTO emails (id, thread_id, sender, subject, snippet, body, received_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE subject=VALUES(subject), snippet=VALUES(snippet), body=VALUES(body), received_at=VALUES(received_at);
            `;

			await pool.execute(sql, [message.id, threadId, from, subject, snippet, body, receivedAt]);
			console.log(`Saved: ${subject}`);
		} catch (error) {
			console.error(`Database Error: ${error.message}`);
		}
	}
}


async function saveEmailsToDatabaseAi(auth) {
	const gmail = google.gmail({ version: 'v1', auth });

	const res = await gmail.users.messages.list({
		userId: 'me',
		maxResults: 10,
		q: 'category:primary',
	});

	const messages = res.data.messages;
	if (!messages || messages.length === 0) {
		console.log('No emails found.');
		return;
	}

	console.log('Processing Emails with AI Smart Replies...');

	for (const message of messages) {
		const email = await gmail.users.messages.get({
			userId: 'me',
			id: message.id,
		});

		const headers = email.data.payload.headers;
		const subject = headers.find(header => header.name === 'Subject')?.value || 'No Subject';
		const from = headers.find(header => header.name === 'From')?.value || 'Unknown Sender';
		const snippet = email.data.snippet || '';
		const threadId = email.data.threadId || '';
		const receivedAt = new Date(parseInt(email.data.internalDate));

		let body = '';
		if (email.data.payload?.parts) {
			const part = email.data.payload.parts.find(p => p.mimeType === 'text/plain');
			body = part?.body?.data ? Buffer.from(part.body.data, 'base64').toString() : '';
		}

		// **AI Processing**
		const { summary, tags } = await analyzeEmail(subject, body);
		console.log(summary, tags);
		
		const { aiDraft, aiLabel } = await generateSmartReply(subject, body, from);

		// Insert into MySQL
		try {
			const sql = `
                INSERT INTO emails (id, thread_id, sender, subject, snippet, body, received_at, ai_summary, ai_tags, ai_draft, ai_label)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE subject=VALUES(subject), snippet=VALUES(snippet), body=VALUES(body), received_at=VALUES(received_at), ai_summary=VALUES(ai_summary), ai_tags=VALUES(ai_tags), ai_draft=VALUES(ai_draft), ai_label=VALUES(ai_label);
            `;

			await pool.execute(sql, [message.id, threadId, from, subject, snippet, body, receivedAt, summary, JSON.stringify(tags), aiDraft, aiLabel]);
			console.log(`Saved: ${subject} [Label: ${aiLabel}]`);
		} catch (error) {
			console.error(`Database Error: ${error.message}`);
		}
	}
}


authorize().then(saveEmailsToDatabaseAi).catch(console.error);