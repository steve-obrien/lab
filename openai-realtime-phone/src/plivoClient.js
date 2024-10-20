import plivo from 'plivo';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const { PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN } = process.env;
// Initialize Plivo client
const plivoClient = new plivo.Client(PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN);

export default plivoClient;