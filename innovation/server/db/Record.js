import knex from './knex.js';
import vine, { errors } from '@vinejs/vine';
import { HttpError } from '../utils.js';

/**
 * A base class for database records providing common functionality for CRUD operations and validation.
 * @class
 */
export default class Record {
	/** @type {string} The database table name */
	static table = '';

	/** @type {string[]} List of allowed attributes/columns for this record */
	static attributes = [];

	/** @type {string[]} List of attributes to hide when converting to JSON */
	static hidden = [];

	/** @type {string} The primary key column name */
	static primary = 'id';

	/** @type {Object} Validation schema for the record */
	static schema = {}; // Each subclass must define this

	/** @type {Object} The raw database row data */
	row = {};

	/** @type {Array} Validation errors */
	errors = [];

	/**
	 * Creates a new Record instance
	 * @param {Object} row - Initial data for the record
	 * @throws {Error} If table or attributes are not defined in the subclass
	 */
	constructor(row = {}) {
		if (!this.constructor.table || !this.constructor.attributes) {
			throw new Error('table and attributes properties must be defined in the subclass.');
		}
		this.row = { ...row };
		return new Proxy(this, this._proxyHandler());
	}

	/**
	 * Creates a Proxy handler for getting/setting record attributes
	 * @private
	 * @returns {ProxyHandler}
	 */
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
	 * Validates the record data against the defined schema
	 * @async
	 * @returns {Promise<boolean>} True if validation passes, false otherwise
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

	/**
	 * Checks if the record has any validation errors
	 * @returns {boolean}
	 */
	hasErrors() {
		return this.errors.length > 0;
	}

	/**
	 * Gets all validation errors
	 * @returns {Array} Array of error objects
	 */
	getErrors() {
		return this.errors;
	}

	/**
	 * Gets validation errors indexed by field name
	 * @returns {Object.<string, string>} Object with field names as keys and error messages as values
	 */
	getErrorsByField() {
		const errors = {};
		for (const err of this.getErrors()) {
			errors[err.field] = err.message;
		}
		return errors;
	}

	/**
	 * Saves the record to the database (creates or updates)
	 * @async
	 * @returns {Promise<boolean>} True if save was successful, false otherwise
	 */
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

	/**
	 * Refreshes the record data from the database
	 * @async
	 */
	async refresh() {
		const row = await knex(this.constructor.table)
			.where(this.constructor.primary, this.row[this.constructor.primary]).first();
		this.populate(row);
	}

	/**
	 * Populates the record with new data
	 * @param {Object} row - The data to populate the record with
	 */
	populate(row) {
		Object.assign(this.row, row);
	}

	/**
	 * Converts the record to a JSON-friendly object, excluding hidden attributes
	 * This conforms to the JSON API specification
	 * @returns {Object}
	 */
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
	 * Finds a record by a specific field value
	 * @async
	 * @param {string} field - The field to search by
	 * @param {*} value - The value to search for
	 * @returns {Promise<Record|null>} Returns the record if found, null otherwise
	 */
	static async findBy(field, value) {
		const row = await knex(this.table)
			.where(field, value).first();
		return row ? new this(row) : null;
	}

	/**
	 * Finds a record by its primary key
	 * @async
	 * @param {*} id - The primary key value
	 * @returns {Promise<Record|null>} Returns the record if found, null otherwise
	 */
	static async find(id) {
		console.log(`finding ${this.primary} ${id} in table ${this.table}`)
		const row = await knex(this.table)
			.where(this.primary, id)
			.first();
		return row ? new this(row) : null;
	}

	/**
	 * Finds a record by its primary key or throws an error if not found
	 * @async
	 * @param {*} id - The primary key value
	 * @returns {Promise<Record>} Returns the record if found
	 * @throws {HttpError} Throws a 404 error if the record is not found
	 */
	static async findOrFail(id) {
		const row = await this.find(id);
		if (!row) {
			throw new HttpError(404, `${this.name} not found`);
		}
		return row;
	}

	/**
	 * Returns a query builder instance for the table
	 * @returns {import('knex').QueryBuilder}
	 */
	static query() {
		return knex(this.table);
	}

	/**
	 * Returns a knex query builder for a specific table
	 * @param {string} table - The table name
	 * @returns {import('knex').QueryBuilder}
	 */
	static db(table) {
		return knex(table);
	}

	/**
	 * Gets the class name
	 * @returns {string} The name of the class
	 */
	static getName() {
		return this.name;
	}
}