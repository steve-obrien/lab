import dotenv from 'dotenv';

dotenv.config();

// Load environment variables from .env file
dotenv.config();

// Export the configuration
export default {
	openaiApiKey: process.env.OPENAI_API_KEY,
	postmarkApiKey: process.env.POSTMARK_API_KEY,
};