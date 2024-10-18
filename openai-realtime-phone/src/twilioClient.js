import twilio from 'twilio';
import dotenv from 'dotenv';
// Load environment variables from .env file
dotenv.config();
// Initialize Twilio client
const twilioClient = twilio( process.env.TWILIO_ACCOUNT_SID,  process.env.TWILIO_AUTH_TOKEN);

export default twilioClient;