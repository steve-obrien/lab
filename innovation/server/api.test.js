import { describe, it, expect } from 'vitest';
import axios from 'axios';
import db from './db/knex.js';

describe('API Tests', () => {
	it('should register a new user', async () => {

		// delet('users)e the user if it exists
		await db('users').where('email', 'john.doe@example.com').delete();

		const response = await axios.post('http://localhost:8181/api/register', {
			name: 'John Doe',
			email: 'john.doe@example.com',
			password: 'securepassword'
		}, {
			headers: {
				'Content-Type': 'application/json'
			}
		});

		expect(response.status).toBe(200);
		expect(response.data).toHaveProperty('status', 'success');
		expect(response.data).toHaveProperty('data');
		expect(response.data.data).toHaveProperty('user');
		expect(response.data.data.user).toHaveProperty('name', 'John Doe');
		expect(response.data.data.user).toHaveProperty('email', 'john.doe@example.com');
		expect(response.data.data.user).toHaveProperty('id'); // Assuming uuid is generated and returned

	});


	
	it('should log in', async () => {

		const response = await axios.post('http://localhost:8181/api/login', {
			email: 'john.doe@example.com',
			password: 'securepassword'
		}, {
			headers: {
				'Content-Type': 'application/json'
			}
		});

		expect(response.status).toBe(200);
		expect(response.data.data).toHaveProperty('accessToken');
		// Optionally, you can add more checks for the response data
		// For example, checking if the refresh token is set in cookies
		// This might require additional setup to read cookies from the response

	});
});