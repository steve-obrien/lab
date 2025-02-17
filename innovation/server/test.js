import User from './models/User.js';
import Workshop from './models/Workshop.js';
const user = new User({
	name: 'John Doe',
	email: 'john.doeexample.com',
});
console.log(user.validate());
const result = await user.save();
console.log(result);

console.log(user.getErrors());
console.log(user.getErrorsByField());

const workshop = new Workshop({
	created_by: '01JKVNMCK1DT5CGPNK9SH327DJ',
});
console.log(await workshop.validate());
const resulty = await workshop.save();
console.log(resulty);
console.log(workshop.getErrors());