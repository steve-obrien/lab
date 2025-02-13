import { ulid } from 'ulid';
import bcrypt from 'bcryptjs';
import Row from '../db/Row.js';

const PEPPER = process.env.PEPPER_SECRET

export default class User extends Row {
	static table = 'users'
	static attributes = ['id', 'name', 'email', 'password']
	static hidden = ['password'];

	constructor(row = {}) {
		super(row);
		if (!this.id) {
			this.id = ulid();
		}
	}

	passwordValid(password) {
		return User.checkPassword(password, this.password);
	}

	saveRefreshToken(token, deviceInfo, expiresAt) {
		return User.db("refresh_tokens").insert({
			user_id: this.id,
			token: token,
			device_info: deviceInfo,
			expires_at: expiresAt,
		});
	}

	/**
	 * Login a user
	 * @param {*} email 
	 * @param {*} password 
	 * @returns User | false
	 */
	static async login(email, password) {
		const user = await User.findBy('email', email)
		if (!user) return false;
		if (!user.passwordValid(password)) return false;
		return user;
	}

	static async create(row) {
		const user = new User(row);
		user.password = await User.hashPassword(row.password);
		await user.save();
		return user;
	}

	static async hashPassword(password) {
		return await bcrypt.hash(password + PEPPER, 10);
	}

	static async checkPassword(password, passwordHash) {
		return await bcrypt.compare(password + PEPPER, passwordHash);
	}
}