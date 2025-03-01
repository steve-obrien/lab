import { ulid } from 'ulid';
import bcrypt from 'bcryptjs';
import Record from '../db/Record.js';

const PEPPER = process.env.PEPPER_SECRET

// $model = new ModelDefinition('workshop', {
// 	id: new Field.Ulid(),
// 	name: new Field.String({
// 		validate: 'minLength:3'
// 	}),
// 	email: new Field.Email(),
// 	password: new Field.Password({
// 		validators: 'required|minLength:6|pawnd'
// 	}),
// 	created_at: new Field.Datetime(),
// 	updated_at: new Field.Datetime(),
// 	meta_data_json: new Field.Json({}),
// })

export default class User extends Record {
	static table = 'users'

	schema() {
		return  {
			id : new Field.Ulid(),
			name : new Field.String({
				validate: 'minLength:3'
			}),
			email : new Field.Email(),
			password : new Field.Password({
				validators: 'required|minLength:6|pawnd'
			}),
			created_at : new Field.Datetime(),
			updated_at : new Field.Datetime(),
			meta_data_json: new Field.Json({}),
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
		const saved = await user.save();
		if (!saved) {
			return { success: false, errors: user.getErrors() };
		}
		return { success: true, user };
	}

	static async hashPassword(password) {
		return await bcrypt.hash(password + PEPPER, 10);
	}

	static async checkPassword(password, passwordHash) {
		return await bcrypt.compare(password + PEPPER, passwordHash);
	}
}