import Record from '../db/Record.js';
import vine from '@vinejs/vine'
import { customAlphabet } from 'nanoid'

const json = (name) => {
	return {
		type: 'attr',
		name: name,
		toDb: (value) => {
			if (typeof value === 'object') {
				return JSON.stringify(value);
			}
			return value;
		},
		fromDb: (value) => {
			return JSON.parse(value);
		}
	}
}

export default class Workshop extends Record {
	static table = 'workshops'
	static attributes = ['id', 'name', 'state', 'data', 'created_by']
	static casts = {
		data: json('data'),
	}

	constructor(row = {}) {
		super(row);
		if (!this.id) {
			const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10)
			this.id = nanoid()
		}
	}

	// Define validation schema for User
	// Define validation schema with required field error messages
	static schema = vine.object({
		id: vine.string(),
		name: vine.string().optional(),
	});

	/**
	 * @inheritdoc
	 */
	static async find(id) {
		const formattedId = this.format(id); // Call the format method
		return super.find(formattedId); // Call the parent find method with the modified id
	}

	/**
	 * Format the id to remove dashes and make it lowercase
	 * @param {*} id 
	 * @returns 
	 */
	static format(id) {
		return id.replace(/-/g, '').toLowerCase();
	}

}