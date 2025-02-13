import db from './db/db.js';
import { ulid } from 'ulid'

import User from './models/User.js';
import axios from 'axios';
// const [results, fields] = await db.query('SELECT * FROM users');
// console.log(results);



const response = await axios.post('http://localhost:8181/api/register', {
	name: 'John Doe',
	email: 'john.doe@example.com',
	password: 'securepassword'
}, {
	headers: {
		'Content-Type': 'application/json'
	}
});


const user = new User({email:'steve@newicon.net', name:'Steve'})
user.name = 'Steve Jobs';
console.log(user.toJSON());

await user.save();

user.name = 'Bob'
console.log(user.toJSON());


await user.save();

console.log(user.password);

User.query().where('email', 'steve@newicon.net')
const userf = await User.findBy('email', 'steve@newicon.net');
console.log('user find',userf);

const response2 = await axios.post('http://localhost:8181/api/login', {
	email: 'john.doe@example.com',
	password: 'securepassword'
}, {
	headers: {
		'Content-Type': 'application/json'
	}
});

// let startTime = Date.now();
// // const [results] = await db.query('SELECT * from users where email = ?', ['john.doe@example.com']);
// // console.log(results[0]);

// let user = await User.findBy('email', 'john.doe@example.com');

// let endTime = Date.now();
// let duration = endTime - startTime;
// console.log(`Time taken: ${duration} milliseconds`);

// console.log(user);

// process.exit(0);



// const uuid = ulid();
// const name = "John Doe";
// const email = "john.doe@example.com";
// const hashedPassword = "password123";

// const sql = "INSERT INTO users (uuid, name, email, password) VALUES (?, ?, ?, ?)";
// const [result, fields] = await db.query(sql, [uuid, name, email, hashedPassword]);
// const [user] = await db.query('SELECT * from users where uuid = ?', [uuid]);

// console.log(result.affectedRows);
// console.log(user[0]);
