import User from './models/User.js';
import Workshop from './models/Workshop.js';

console.log(await User.findOrFail('vuts'));
process.exit(0);


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
	data: {
		exploreProblems: {
			name: 'Explore Problems',
			stopTime: null,
			time: 15,
		}
	}
});

console.log(await workshop.validate());
const resulty = await workshop.save();
console.log(resulty);
console.log(workshop.toJSON());


const workshop2 = await Workshop.find(workshop.id);
console.log(workshop2.toJSON());