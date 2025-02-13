import knex from './knex.js';

/**
 * A simple base class for all database rows.
 */
class Row {
	static table = '';
	static attributes = [];
	static hidden = [];
	static primary = 'id';
	row = {};
	

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

	async save() {
		try {
			console.log('saving record');
			const existingRecord = await knex(this.constructor.table)
				.where(this.constructor.primary, this.row[this.constructor.primary])
				.first();

			if (existingRecord) {
				console.log('update record');
				// Update the existing record
				await knex(this.constructor.table)
					.where(this.constructor.primary, this.row[this.constructor.primary])
					.update(this.row);
			} else {
				console.log('inserting new record', this.row);
				// Insert a new record
				await knex(this.constructor.table).insert(this.row);
			}

			await this.refresh();
		} catch (error) {
			console.error(`Error saving ${this.constructor.name}:`, error);
		}
	}

	async refresh() {
		const row = await knex(this.constructor.table).where(this.constructor.primary, this.row[this.constructor.primary]).first();
		this.populate(row);
	}

	populate(row) {
		Object.assign(this.row, row);
	}

	toJSON() {
		const result = {};
		for (const key of this.constructor.attributes) {
			if (!this.constructor.hidden.includes(key)) {
				result[key] = this.row[key];
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
		const row = await knex(this.table).where(field, value).first();
		return row ? new this(row) : null;
	}

	static async find(id) {
		const row = await knex(this.constructor.table).where(this.constructor.primary, id).first();
		return row ? new this(row) : null;
	}

	/**
	 * Returns a query builder for the table
	 * @returns {import('knex').QueryBuilder}
	 */
	static query() {
		return knex(this.constructor.table);
	}

	static db(table) {
		return knex(table);
	}
}

export default Row;