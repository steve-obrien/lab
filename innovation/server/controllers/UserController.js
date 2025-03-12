export default class UserController {

	static async async (req, res) {

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
	}

}