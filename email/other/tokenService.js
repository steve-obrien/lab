// tokenService.js
const pool = require('../db');

async function saveTokens(googleUserId, tokens) {
	const { access_token, refresh_token, scope, token_type, expiry_date } = tokens;

	// Check if user exists
	const [rows] = await pool.query('SELECT id FROM users WHERE google_user_id = ?', [googleUserId]);

	if (rows.length > 0) {
		// Update existing user
		await pool.query(
			`UPDATE users SET
			access_token = ?,
			refresh_token = ?,
			scope = ?,
			token_type = ?,
			expiry_date = ?
			WHERE google_user_id = ?`,
			[access_token, refresh_token, scope, token_type, expiry_date, googleUserId]
		);
	} else {
		// Insert new user
		await pool.query(
			`INSERT INTO users
			(google_user_id, access_token, refresh_token, scope, token_type, expiry_date)
			VALUES (?, ?, ?, ?, ?, ?)`,
			[googleUserId, access_token, refresh_token, scope, token_type, expiry_date]
		);
	}
}

module.exports = {
	saveTokens,
};