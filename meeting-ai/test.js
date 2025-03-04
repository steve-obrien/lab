import { extractAndFilterEmails } from './utils.js';

const emailData = {
	From: 'jeff@numenta.com',
	To: 'steve@newicon.net',
	Cc: 'ai@meet-ting.newicon.dev, user@example.com'
};

console.log(extractAndFilterEmails(emailData));

console.log('--------------------------------');
const emailData2 = {
	From: 'jeff@numenta.com',
};

console.log(extractAndFilterEmails(emailData2));

console.log('--------------------------------');
const emailData3 = {
	To: 'jeff@numenta.com',
	From: 'steve@newicon.net',
	Cc: 'ai@meet-ting.newicon.dev, user@example.com'
};

console.log(extractAndFilterEmails(emailData3));

console.log('--------------------------------');
const emailData4 = {
	To: '',
	From: '',
	Cc: ''
};

console.log(extractAndFilterEmails(emailData4));

