// create the database schema

import { User } from 'lucide-vue-next';
import knex from './knex.js'

async function createUserTable() {
	const exists = await knex.schema.hasTable("users");
	if (!exists) {
		await knex.schema.createTable("users", (table) => {
			table.string("id", 26).primary(); 
			table.string("name").notNullable();
			table.string("email").notNullable().unique();
			table.string("password").notNullable(); // Hashed password
			table.datetime("created_at").defaultTo(knex.fn.now());
			table.datetime("updated_at").defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
		});
	}
}

async function createRefreshTokenTable() {
	const exists = await knex.schema.hasTable("refresh_tokens");
	if (!exists) {
		await knex.schema.createTable("refresh_tokens", (table) => {
			table.increments("id").primary();
			table.char("user_id", 26).references("id").inTable("users").onDelete("CASCADE");
			table.text("token").notNullable().unique();
			table.string("device_info").nullable(); // Optional: Store device info
			table.string("ip_address").nullable(); // Optional: Store IP address
			table.datetime("expires_at").nullable();
			table.datetime("created_at").defaultTo(knex.fn.now());
			table.datetime("updated_at").defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
		});
	}
}

async function createWorkshopTable() {
	const workshopTableExists = await knex.schema.hasTable("workshops");
	if (!workshopTableExists) {
		await knex.schema.createTable("workshops", (table) => {
			table.string("id", 12).primary();
			table.string("name").nullable();
			table.string("state").nullable().comment('The current state name of the workshop');
			table.json("data").nullable().comment('Json data relevent to the state');
			table.char("created_by", 26).references("id").inTable("users").comment('This becomes the facilitator id');
			table.datetime("created_at").defaultTo(knex.fn.now());
			table.datetime("updated_at").defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
		});
	}
}

async function createWorkshopUsersTable() {
	const workshopUsersTableExists = await knex.schema.hasTable("workshop_users");
	if (!workshopUsersTableExists) {
		await knex.schema.createTable("workshop_users", (table) => {
			table.string("user_id", 26).references("id").inTable("users")
			table.string("workshop_id", 12).references("id").inTable("workshops")
			table.primary(['user_id', 'workshop_id']);
			table.string("status").comment('The current state of the connectoin');
			table.datetime("created_at").defaultTo(knex.fn.now());
			table.datetime("updated_at").defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));
		});
	}
}

await createUserTable();
await createRefreshTokenTable();
await createWorkshopTable();


console.log('done');
process.exit(0);