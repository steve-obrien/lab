import { ulid } from 'ulid';
import bcrypt from 'bcryptjs';
import Record from '../db/Record.js';
import vine from '@vinejs/vine'

const PEPPER = process.env.PEPPER_SECRET

export default class User extends Record {
	static table = 'users'
	static attributes = ['id', 'name', 'email', 'password']
	static hidden = ['password'];

	constructor(row = {}) {
		super(row);
		if (!this.id) {
			this.id = ulid();
		}
	}

	// Define validation schema for User
	// Define validation schema with required field error messages
	static schema = vine.object({
		id: vine.string(),
		name: vine.string().minLength(3),
		email: vine.string().email(),
			// .use(
			// 	custom(async (value) => {
			// 		const existingUser = await User.findBy('email', value);
			// 		if (existingUser) {
			// 			throw new Error('Email already in use');
			// 		}
			// 		return true;
			// 	})
			// ),
		password: vine.string().minLength(6),
	});

	passwordValid(password) {
		return User.checkPassword(password, this.password);
	}

	saveRefreshToken(token, deviceInfo, expiresAt, ipAddress) {
		return User.db("refresh_tokens").insert({
			user_id: this.id,
			token: token,
			device_info: deviceInfo,
			expires_at: expiresAt,
			ip_address: ipAddress,
		});
	}

	async save() {
		if ((await this.validate()) == false) {
			return false;
		}
		this.password = await User.hashPassword(this.password);
		return super.save();
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

	static async hashPassword(password) {
		return await bcrypt.hash(password + PEPPER, 10);
	}

	static async checkPassword(password, passwordHash) {
		return await bcrypt.compare(password + PEPPER, passwordHash);
	}
}