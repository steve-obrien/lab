// test/emailUtils.test.js
import { describe, it, expect } from 'vitest';
import { extractAndFilterEmails, replyAll, removeSender, extractAiSender } from '../utils.js';

describe('extractAndFilterEmails', () => {
	it('should return all recipients excluding those ending with newicon.dev', () => {
		const emailData = {
			To: 'jeff@numenta.com',
			From: 'steve@newicon.net',
			Cc: 'ai@meet-ting.newicon.dev, user@example.com'
		};

		const expected = ['steve@newicon.net','jeff@numenta.com', 'user@example.com'];
		const result = extractAndFilterEmails(emailData);
		console.log(result);
		expect(result).toEqual(expected);
	});

	it('should return all recipients excluding those ending with newicon.dev', () => {
		const emailData = {
			To: 'jeff@numenta.com',
			From: 'steve@newicon.net',
			Cc: 'ai+nsjse@meet.newicon.dev, user@example.com'
		};

		const expected = ['steve@newicon.net','jeff@numenta.com', 'user@example.com'];
		const result = extractAndFilterEmails(emailData);
		console.log(result);
		expect(result).toEqual(expected);
	});

	it('should handle cases with no Cc field', () => {
		const emailData = {
			From: 'jeff@numenta.com'
		};

		const expected = ['jeff@numenta.com'];
		const result = extractAndFilterEmails(emailData);

		expect(result).toEqual(expected);
	});

	it('should handle cases with no Cc field', () => {
		const emailData = {
			From: 'jeff@numenta.com',
			To: 'ai@meet-ting.newicon.dev'
		};

		const expected = ['jeff@numenta.com'];
		const result = extractAndFilterEmails(emailData);

		expect(result).toEqual(expected);
	});

	it('should return an empty array if all emails are filtered out', () => {
		const emailData = {
			To: 'ai@meet-ting.newicon.dev',
		};

		const expected = [];
		const result = extractAndFilterEmails(emailData);

		expect(result).toEqual(expected);
	});
});


describe('replyAll', () => {
	it('should return all recipients excluding those ending with newicon.dev', () => {
		const emailData = {
			To: 'jeff@numenta.com',
			From: 'steve@newicon.net',
			Cc: 'ai@meet-ting.newicon.dev, user@example.com'
		};
		const result = replyAll(emailData);
		expect(result.To).toEqual('steve@newicon.net,jeff@numenta.com');
		expect(result.Cc).toEqual('user@example.com');
	});

	it('should return all recipients excluding those ending with newicon.dev', () => {
		const emailData = {
			To: 'jeff@numenta.com',
			From: 'steve@newicon.net',
			Cc: 'ai+nsjse@meet.newicon.dev, user@example.com'
		};	

		const result = replyAll(emailData, 'ai+nsjse@meet.newicon.dev');
		expect(result.To).toEqual('steve@newicon.net,jeff@numenta.com');
		expect(result.Cc).toEqual('user@example.com');
	});

	it('should handle cases with no Cc field', () => {
		const emailData = {
			From: 'jeff@numenta.com'
		};

		const result = replyAll(emailData);
		expect(result.To).toEqual('jeff@numenta.com');
		expect(result.Cc).toEqual('');
	});

	it('should handle cases with no Cc field', () => {
		const emailData = {
			To: 'ai@meet-ting.newicon.dev',
			From: 'jeff@numenta.com',
		};

		const expected = ['jeff@numenta.com'];
		const result = replyAll(emailData);

		expect(result.To).toEqual('jeff@numenta.com');
		expect(result.Cc).toEqual('');
	});

	it('should return an empty array if all emails are filtered out', () => {
		const emailData = {
			To: 'ai@meet-ting.newicon.dev',
		};

		const result = replyAll(emailData, 'ai@meet-ting.newicon.dev');

		expect(result.To).toEqual('');
		expect(result.Cc).toEqual('');
	});
});

describe('filterRecipients', () => {
	it('should return all recipients excluding those ending with newicon.dev', () => {
		const recipients = 'steve@newicon.net,jeff@numenta.com,user@example.com,ai@meet-ting.newicon.dev';
		const sender = 'ai@meet-ting.newicon.dev';
		const result = removeSender(recipients, sender);
		expect(result).toEqual(['steve@newicon.net','jeff@numenta.com', 'user@example.com']);
	});
});

describe('extractAiSender', () => {
	it('should return the ai sender', () => {
		const recipients = 'steve@newicon.net,jeff@numenta.com,user@example.com,ai+myname@meet-ting.newicon.dev';
		const result = extractAiSender(recipients);
		expect(result).toEqual('ai+myname@meet-ting.newicon.dev');
	});
});