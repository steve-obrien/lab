// create the database schema

import knex from './knex.js'


const userTableExists = knex.schema.hasTable("users");
if (!userTableExists) {
	await knex.schema.createTable("users", (table) => {
		table.string("id", 26).primary(); 
		table.string("name").notNullable();
		table.string("email").notNullable().unique();
		table.string("password").notNullable(); // Hashed password
		table.timestamp("created_at").defaultTo(knex.fn.now());
		table.timestamp("updated_at").defaultTo(knex.fn.now());
	});
}

const exists = await knex.schema.hasTable("refresh_tokens");
if (!exists) {
	await knex.schema.createTable("refresh_tokens", (table) => {
		table.increments("id").primary();
		table.string("user_id", 26).references("id").inTable("users").onDelete("CASCADE");
		table.text("token").notNullable().unique();
		table.string("device_info").nullable(); // Optional: Store device info
		table.timestamp("created_at").defaultTo(knex.fn.now());
		table.timestamp("expires_at").nullable();
	});
}

console.log('done');
process.exit(0);