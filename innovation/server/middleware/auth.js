import jwt from "jsonwebtoken";

export default function authenticateToken(req, res, next) {
	const authHeader = req.headers["authorization"];

	// Ensure the authorization header exists and starts with "Bearer"
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return res.status(401).json({ error: "Access denied. No token provided." });
	}

	// Extract token safely
	const token = authHeader.split(" ")[1];

	if (!token) {
		return res.status(401).json({ error: "Token missing from Authorization header." });
	}

	jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
		if (err) {
			return res.status(403).json({ error: "Invalid token" });
		}
		req.user = user; // Attach user info to request
		next();
	});
}