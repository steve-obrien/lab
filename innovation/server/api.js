import express from 'express'
import cors from 'cors'; // Import the cors package
import dotenv from 'dotenv';
import User from './models/User.js';
import jwt from "jsonwebtoken"
import cookieParser from 'cookie-parser'
import useragent from "express-useragent";
import authenticateToken from './middleware/auth.js';
import Workshop from './models/Workshop.js';
import { broadcastWorkshopUpdates } from './ws.js';
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { HttpError } from './utils.js';

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

	// Handle cors
	app.use(cors({
		origin: ["*", "http://localhost:5173", "http://localhost:8181", "http://localhost:3000"], // Allow requests from your frontend
		credentials: true, // Allow cookies to be sent and received
		methods: ["GET", "POST", "PUT", "DELETE"], // Allow necessary methods
		allowedHeaders: ["Content-Type", "Authorization"], // Allow these headers
	}));
	// Parse json
	app.use(express.json());
	// Parse cookies
	app.use(cookieParser());
	// Parse useragent
	app.use(useragent.express());
	// Global Error Handler

	app.get('/api/hello/:id', async (req, res, next) => {
		try {
			const { id } = req.params;
			const user = await User.findOrFail(id)
			res.json(user.toJSON());
		} catch (error) {
			next(error);
		}
	});

	app.use((err, req, res, next) => {
		if (err instanceof HttpError) {
			return res.status(err.status).json({ error: err.message });
		}
		console.error(`[${new Date().toISOString()}] Unhandled Error:`, err);
		res.status(500).json({ error: 'Internal Server Error' });
	});

	/**
	 * Creates a unique user - would return a user token to authenticate with
	 * if username and password are provided.
	 * But as we dont have logins.
	 */

	app.post("/api/login", async (req, res) => {

		const { email, password } = req.body;
		console.log(req.useragent, req.ip)
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

	app.post("/api/refresh", (req, res) => {
		const refreshToken = req.cookies.refreshToken;
		if (!refreshToken) return res.status(401).json({ error: "Not authenticated" });

		jwt.verify(refreshToken, JWT_REFRESH_SECRET, async (err, user) => {
			if (err) return res.status(403).json({ error: "Invalid refresh token" });

			// find user by id
			const userRecord = await User.findBy('id', user.id)
			if (!userRecord) return res.status(401).json({ error: "User not found" });
			// We could double check data on the user record here.

			const newAccessToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "15m" });
			res.json({ accessToken: newAccessToken });
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
			res.json({ status: "success", data: { user: user.toJSON() } });
		} catch (error) {
			console.error(req.url, error, error.stack);
			res.status(500).json({ status: "error", message: "Server error" });
		}
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
			await User.findOrFail(userId)
			const user = await User.find(userId);

			if (!user) {
				return res.status(404).json({ status: "error", message: "User not found" });
			}

			res.json({ status: "success", data: { user: user.toJSON() } });
		} catch (error) {
			console.error(error);
			res.status(500).json({ status: "error", message: "Server error" });
		}
	});


	app.post("/api/workshops", async (req, res) => {
		const { facilitatorId, name } = req.body;
		// reject if no facilitatorId
		if (!facilitatorId) {
			return res.status(400).json({ status: "fail", data: { facilitatorId: 'Facilitator ID is required' } });
		}
		console.log(req.body);
		const workshop = new Workshop({ created_by: facilitatorId, name: name });
		const saved = await workshop.save();
		if (!saved) {
			return res.status(400).json({ status: "fail", data: workshop.getErrorsByField() });
		} else {
			const workshopData = workshop.toJSON();
			res.json({ status: "success", data: { workshop: workshopData } });
		}
	});

	app.get("/api/workshops/:id", async (req, res) => {
		const { id } = req.params;
		const workshop = await Workshop.find(id);
		if (!workshop) {
			return res.status(404).json({ error: "Workshop not found" });
		}
		res.json({ status: "success", data: { workshop: workshop.toJSON() } });
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
		res.json({ status: "success", data: { workshop: workshopData } });
		console.log('broadcasting workshop updates', workshopData);
		broadcastWorkshopUpdates(workshop.id, workshopData);
	});

	app.get("/api/diagram", (req, res) => {
		const expressRoutes = getExpressRoutes(app);
		const websocketRoutes = [];
		const diagramData = generateCytoscapeData(expressRoutes, websocketRoutes);
		res.send({ diagram: diagramData });
	});

	app.get("/diagram", (req, res) => {
		const __dirname = path.dirname(fileURLToPath(import.meta.url))
		res.sendFile(path.join(__dirname, "diagram.html"));
	});


}



function generateMermaidDiagram(expressRoutes, wsRoutes) {
	let diagram = "graph TD;\n";

	expressRoutes.forEach(({ path, methods, handler }) => {
		methods.forEach((method) => {
			diagram += `    ${method.toUpperCase()}_${path.replace(/\//g, "_")}("${method.toUpperCase()} ${path}") -->|Calls| dispatch;\n`;
		});
	});

	wsRoutes.forEach(({ event, handler }) => {
		diagram += `    WS_${event}("WS Event: ${event}") -->|Handles| ${handler};\n`;
	});

	return diagram;
}

// Setup WebSocket server
// const broadcastDataToClients = setupWebSocketServer(server);

// defineServerApi(app)



// // Start the server
// server.listen(port, () => {
// 	console.log(`Server is running on http://localhost:${port}`);
// });

function getExpressRoutes(app) {
	const routes = [];
	app._router.stack.forEach((middleware) => {
		if (middleware.route) {
			const { path, methods } = middleware.route;
			routes.push({
				id: path, // Cytoscape requires "id" as a key
				label: `${Object.keys(methods).join(", ").toUpperCase()} ${path}`,
				category: "HTTP",
				handler: middleware.handle.name || "anonymous",
			});
		}
	});
	return routes;
}


function generateCytoscapeData(expressRoutes, wsRoutes) {
	const nodes = [{ data: { id: "API", label: "API Root" } }];
	const edges = [];

	expressRoutes.forEach((route) => {
		nodes.push({ data: { id: route.id, label: route.label } });
		edges.push({ data: { source: "API", target: route.id } });
	});

	wsRoutes.forEach((route) => {
		nodes.push({ data: { id: route.id, label: route.label } });
		edges.push({ data: { source: "API", target: route.id } });
	});

	return { nodes, edges };
}