// db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
	host: process.env.DB_HOST,     // e.g., 'localhost'
	user: process.env.DB_USER,     // e.g., 'root'
	password: process.env.DB_PASS, // Your MySQL password
	database: process.env.DB_NAME, // e.g., 'gmail_ai_app'
	waitForConnections: true,
	connectionLimit: 10,
	queueLimit: 0,
});

module.exports = pool;