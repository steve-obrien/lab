import express from 'express';
import cors from 'cors'; // Import the cors package
import dotenv from 'dotenv';
import User from './models/User.js';
import jwt from "jsonwebtoken"
import cookieParser from 'cookie-parser'
import knex from './db/knex.js';
import useragent from "express-useragent";
import authenticateToken from './middleware/auth.js';


dotenv.config();

const app = express();
const port = 8181;

// ... existing code ...

app.use(cors({
	origin: "http://localhost:5173", // Allow requests from your frontend
	credentials: true, // Allow cookies to be sent and received
	methods: ["GET", "POST", "PUT", "DELETE"], // Allow necessary methods
	allowedHeaders: ["Content-Type", "Authorization"], // Allow these headers
}));
app.use(express.json());
app.use(cookieParser());
app.use(useragent.express());

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;


export default function defineServerApi(app) {

	app.get('/api/hello', (req, res) => {
		res.send('Hello World');
	});

	/**
	 * Creates a unique user - would return a user token to authenticate with
	 * if username and password are provided.
	 * But as we dont have logins.
	 */

	app.post("/api/login", async (req, res) => {

		const { email, password } = req.body;

		const deviceInfo = `${req.useragent.platform} - ${req.useragent.browser}`;  // Example: "Windows - Chrome"

		if (!email) return res.status(400).json({ status: "fail", data: { email: 'Email is required' } });
		if (!password) return res.status(400).json({ status: "fail", data: { password: 'Password is required' } });
	
		// log the user in
		const user = await User.login(email, password);
		if (!user) return res.status(401).json({ error: 'Invalid credentials' });

		const refreshExpires = 10 * 24 * 60 * 60 * 1000; // 10 days
		// create tokens
		const accessToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "15m" });
		const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: "10d" });

		// Store Refresh Token in Database with Device Info
		await user.saveRefreshToken(refreshToken, deviceInfo, new Date(Date.now() + refreshExpires))

		// Store refresh token in an HTTP-only cookie
		res.cookie("refreshToken", refreshToken, {
			httpOnly: true,
			secure: false, // Change to true in production
			sameSite: "Strict",
			maxAge: refreshExpires,
		});

		// lets also return the user object
		res.json({ status: "success", data: { accessToken, user: user.toJSON() } });
	});


	app.post("/api/register", async (req, res) => {
		const { name, email, password } = req.body;

		const existingUser = await User.findBy('email', email);
		if (existingUser) {
			return res.status(400).json({ status: "fail", data: { email: 'Email already in use' } });
		}
		try {
			const user = await User.create({ name, email, password })
			res.json({
				status: "success",
				data: { user: user.toJSON() }
			});
		} catch (error) {
			res.status(500).json({ error: error.message, url: req.url, stack: error.stack });
		}
	});

	app.post("/api/refresh", (req, res) => {
		const refreshToken = req.cookies.refreshToken;
		if (!refreshToken) return res.status(401).json({ error: "Not authenticated" });

		jwt.verify(refreshToken, JWT_REFRESH_SECRET, async (err, user) => {
			if (err) return res.status(403).json({ error: "Invalid refresh token" });

			// find user by id
			// const user = await User.findBy('id', user.id)
			// if (!user) return res.status(401).json({ error: "User not found" });

			const newAccessToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "15m" });
			res.json({ accessToken: newAccessToken });
		});
	});

	app.post("/api/logout", (req, res) => {
		res.clearCookie("refreshToken");
		res.sendStatus(204);
	});


	// ✅ Protected Route - Get User Info
	app.get("/api/me", authenticateToken, async (req, res) => {
		try {
			const userId = req.user.id; // Extracted from the JWT token
	
			// get the user data and state information.
			

			const user = await knex("users")
				.where({ id: userId })
				.select("id", "name", "email") // Never return password
				.first();

	
			if (!user) {
				return res.status(404).json({ error: "User not found" });
			}
	
			res.json({ user });
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: "Server error" });
		}
	});

}

defineServerApi(app)

// Start the server
app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});