import express from 'express'
import http from 'http';
import cors from 'cors'; // Import the cors package
import dotenv from 'dotenv';
import User from './models/User.js';
import jwt from "jsonwebtoken"
import cookieParser from 'cookie-parser'
import knex from './db/knex.js';
import useragent from "express-useragent";
import authenticateToken from './middleware/auth.js';
import { setupWebSocketServer } from './ws.js'; // Import the WebSocket setup function
import Workshop from './models/Workshop.js';
import { broadcastWorkshopUpdates } from './ws.js';
dotenv.config();

// const app = express();
// const server = http.createServer(app);
// const port = process.env.SERVER_PORT;

// ... existing code ...



const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

/**
 * JSON responses based on https://github.com/omniti-labs/jsend
 * @param {*} app 
 */

export default function defineServerApi(app) {

	app.use(cors({
		origin: ["*","http://localhost:5173", "http://localhost:8181", "http://localhost:3000"], // Allow requests from your frontend
		credentials: true, // Allow cookies to be sent and received
		methods: ["GET", "POST", "PUT", "DELETE"], // Allow necessary methods
		allowedHeaders: ["Content-Type", "Authorization"], // Allow these headers
	}));
	app.use(express.json());
	app.use(cookieParser());
	app.use(useragent.express());



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
console.log(req.useragent , req.ip)
		const deviceInfo = `${req.useragent.platform} - ${req.useragent.browser}`;  // Example: "Windows - Chrome"

		if (!email) return res.status(400).json({ status: "fail", data: { email: 'Email is required' } });
		if (!password) return res.status(400).json({ status: "fail", data: { password: 'Password is required' } });
	
		// log the user in
		const user = await User.login(email, password);
		// user not found - invalid credentials
		if (!user) return res.status(401).json({ error: 'Invalid credentials' });

		const refreshExpires = 10 * 24 * 60 * 60 * 1000; // 10 days
		// create tokens
		const accessToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "15m" });
		const refreshToken = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: "10d" });

		// Store Refresh Token in Database with Device Info
		await user.saveRefreshToken(refreshToken, deviceInfo, new Date(Date.now() + refreshExpires), req.ip)

		// Store refresh token in an HTTP-only cookie
		res.cookie("refreshToken", refreshToken, {
			httpOnly: true,
			secure: false, // Change to true in production
			sameSite: "Strict",
			maxAge: refreshExpires,
		});

		// lets also return the user object
		res.json({
			status: "success",
			data: { 
				accessToken, 
				user: user.toJSON() 
			}
		});
	});


	app.post("/api/register", async (req, res) => {
		const { name, email, password } = req.body;

		const existingUser = await User.findBy('email', email);
		if (existingUser) {
			return res.status(400).json({ status: "fail", data: { email: 'Email already in use' } });
		}
		try {
			const user = new User({ name, email, password });
			// must validate the password before hashing - otherwise empty passwords could be hashed
			const saved = await user.save();
			if (!saved) {
				return res.status(400).json({ status: "fail", data: user.getErrorsByField() });
			}
			res.json({ status: "success", data: { user: user.toJSON() }});
		} catch (error) {
			console.error(req.url, error, error.stack);
			res.status(500).json({ status: "error", message: "Server error" });
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
			const user = await User.find(userId);

			if (!user) {
				return res.status(404).json({ status: "error", message: "User not found" });
			}
	
			res.json({ status: "success", data: { user: user.toJSON() }});
		} catch (error) {
			console.error(error);
			res.status(500).json({ status: "error", message: "Server error"  });
		}
	});


	app.post("/api/workshops", async (req, res) => {
		const { facilitatorId, name } = req.body;
		// reject if no facilitatorId
		if (!facilitatorId) {
			return res.status(400).json({ status: "fail", data: { facilitatorId: 'Facilitator ID is required' } });
		}
		console.log(req.body);
		const workshop = new Workshop({created_by:facilitatorId, name:name});
		const saved = await workshop.save();
		if (!saved) {
			return res.status(400).json({ status: "fail", data: workshop.getErrorsByField() });
		} else {
			const workshopData = workshop.toJSON();
			res.json({ status: "success", data: { workshop: workshopData }});
		}
	});

	app.get("/api/workshops/:id", async (req, res) => {
		const { id } = req.params;
		const workshop = await Workshop.find(id);
		if (!workshop) {
			return res.status(404).json({ error: "Workshop not found" });
		}
		res.json({ status: "success", data: { workshop: workshop.toJSON() }});
	});

	app.post("/api/workshops/:id", authenticateToken, async (req, res) => {
		const { id } = req.params;
		const workshop = await Workshop.find(id);
		Object.assign(workshop, req.body);
		const saved = await workshop.save();
		if (!saved) {
			return res.status(400).json({ status: "fail", data: workshop.getErrorsByField() });
		}
		// broadcast the update to all clients
		// broadcastDataToClients(workshop);
		const workshopData = workshop.toJSON();
		res.json({ status: "success", data: { workshop: workshopData }});
		console.log('broadcasting workshop updates', workshopData);
		broadcastWorkshopUpdates(workshop.id, workshopData);
	});
}

// Setup WebSocket server
// const broadcastDataToClients = setupWebSocketServer(server);

// defineServerApi(app)



// // Start the server
// server.listen(port, () => {
// 	console.log(`Server is running on http://localhost:${port}`);
// });