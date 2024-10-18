// test/utils.test.js
import { expect } from 'chai';
import { RealtimeUtils } from '../src/realtime/lib/utils.js';

describe('RealtimeUtils', function () {
	describe('arrayBufferToBase64Other', function () {
		it('should correctly convert a Uint8Array to a base64 string and back', function () {
			const originalString = 'Hello, World!';
			const encoder = new TextEncoder();
			const uint8Array = encoder.encode(originalString);


			// Validate base64 string
			if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length % 4 !== 0) {
				throw new Error('Invalid base64 string');
			}


			// Convert Uint8Array to base64
			const base64String = RealtimeUtils.arrayBufferToBase64Old(uint8Array);

		
			// Define the valid base64 character set
			const base64Regex = /^[A-Za-z0-9+/=]+$/;

			// Function to find and highlight invalid characters
			function findInvalidCharacters(base64) {
				const invalidChars = [];
				for (let i = 0; i < base64.length; i++) {
					const char = base64[i];
					if (!base64Regex.test(char)) {
						invalidChars.push({ char, index: i });
					}
				}
				return invalidChars;
			}

			// Find invalid characters
			const invalidCharacters = findInvalidCharacters(base64String);

			console.log('invalidCharacters', invalidCharacters)

			// Output the results
			if (invalidCharacters.length > 0) {
				console.log('Invalid characters found:');
				invalidCharacters.forEach(({ char, index }) => {
					console.log(`Character: '${char}' at index: ${index}`);
				});
			} else {
				console.log('No invalid characters found.');
			}

			// // Convert base64 back to Uint8Array
			// const decodedArrayBuffer = RealtimeUtils.base64ToArrayBuffer(base64String);
			// const decoder = new TextDecoder();
			// const decodedString = decoder.decode(new Uint8Array(decodedArrayBuffer));

			// // Assert that the decoded string matches the original
			// expect(decodedString).to.equal(originalString);
		});
	});
});