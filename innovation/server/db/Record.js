import knex from './knex.js';
import vine, { errors } from '@vinejs/vine';
import { HttpError } from '../utils.js';

/**
 * A simple base class for all database rows.
 */
export default class Record {
	static table = '';
	static attributes = [];
	static hidden = [];
	static primary = 'id';
	static schema = {}; // Each subclass must define this
	row = {};
	errors = [];


	constructor(row = {}) {
		if (!this.constructor.table || !this.constructor.attributes) {
			throw new Error('table and attributes properties must be defined in the subclass.');
		}
		this.row = { ...row };
		return new Proxy(this, this._proxyHandler());
	}

	_proxyHandler() {
		return {
			get: (target, prop) => {
				if (this.constructor.attributes.includes(prop)) {
					return target.row[prop];
				}
				return target[prop];
			},
			set: (target, prop, value) => {
				if (this.constructor.attributes.includes(prop)) {
					target.row[prop] = value;
					return true;
				}
				target[prop] = value;
				return true;
			},
		};
	}

	/**
	 * Universal validation method using Vines
	 */
	async validate() {
		this.errors = []; // Reset errors as an object

		if (!this.constructor.schema) {
			return true;
		}

		try {
			const validator = vine.compile(this.constructor.schema)
			await validator.validate(this.row)
		} catch (error) {
			if (error instanceof errors.E_VALIDATION_ERROR) {
				this.errors = error.messages
			}
		}

		return Object.keys(this.errors).length === 0;
	}

	hasErrors() {
		return this.errors.length > 0;
	}

	getErrors() {
		return this.errors;
	}

	getErrorsByField() {
		const errors = {};
		for (const err of this.getErrors()) {
			errors[err.field] = err.message;
		}
		return errors;
	}

	async save() {
		try {

			if (!(await this.validate())) {
				return false; // Stop saving if validation fails
			}

			console.log('saving record');
			// should probably just check for primary key existing: const primaryKey = this.row[this.constructor.primary];
			const existingRecord = await knex(this.constructor.table)
				.where(this.constructor.primary, this.row[this.constructor.primary])
				.first();

			const result = {};
			for (const key of this.constructor.attributes) {
				// if key is an object with a type property, then it is an attribute
				if (this.constructor.casts && this.constructor.casts[key]) {
					result[key] = this.constructor.casts[key].toDb(this.row[key]);
				} else {
					result[key] = this.row[key];
				}
			}

			if (existingRecord) {
				console.log('update record', result);
				// Update the existing record
				await knex(this.constructor.table)
					.where(this.constructor.primary, this.row[this.constructor.primary])
					.update(result);
			} else {
				console.log('inserting new record', result);
				// Insert a new record
				await knex(this.constructor.table).insert(result);
			}

			await this.refresh();

			// return true if success
			return true;
		} catch (error) {
			console.error(`Error saving ${this.constructor.name}:`, error);
			return false;
		}
	}

	async refresh() {
		const row = await knex(this.constructor.table)
			.where(this.constructor.primary, this.row[this.constructor.primary]).first();
		this.populate(row);
	}

	populate(row) {
		Object.assign(this.row, row);
	}

	toJSON() {
		const result = {};
		for (const key of this.constructor.attributes) {
			if (!this.constructor.hidden.includes(key)) {
				// if key is an object with a type property, then it is an attribute and we need to use the fromDb method
				if (this.constructor.casts && this.constructor.casts[key]) {
					console.log('json from db', this.constructor.casts[key].fromDb(this.row[key]));
					result[key] = this.constructor.casts[key].fromDb(this.row[key]);
				} else {
					result[key] = this.row[key];
				}
			}
		}
		return result;
	}

	/**
	 * Find a row by a field and value
	 * @param {*} field 
	 * @param {*} value 
	 * @returns this
	 */
	static async findBy(field, value) {
		const row = await knex(this.table)
			.where(field, value).first();
		return row ? new this(row) : null;
	}

	/**
	 * Find a row by an id
	 * @param {*} id 
	 * @returns {Promise<this|null>}
	 */
	static async find(id) {
		console.log(`finding ${this.primary} ${id} in table ${this.table}`)
		const row = await knex(this.table)
			.where(this.primary, id)
			.first();
		return row ? new this(row) : null;
	}

	static async findOrFail(id) {
		const row = await this.find(id);
		if (!row) {
			throw new HttpError(404, `${this.name} not found`);
		}
		return row;
	}

	/**
	 * Returns a query builder for the table
	 * @returns {import('knex').QueryBuilder}
	 */
	static query() {
		return knex(this.table);
	}

	static db(table) {
		return knex(table);
	}

	static getName() {
		return this.name;
	}
}