import { defineStore } from 'pinia'
import { useTimerStore } from './timer';


const STATE_setup = 'setup';
const STATE_exploreProblems_start = 'exploreProblems_start';
const STATE_exploreProblems_go = 'exploreProblems_go';
const STATE_exploreProblems_finished = 'exploreProblems_finished';

/**
 * Represents and tracks a single workshop with connected clients
 */
export const useWorkshopStore = defineStore('workshop', {
	state: () => ({
		// the workshop id
		id: '',
		// alias of id. the unique id of the workshop.
		roomId: '',
		// the workshop session name.
		name: '',
		// the id of the facilitator.
		facilitatorId: '',
		// the list of clients connected to the workshop.
		clientsList: new Map(),

		// the name of the current workshop state.
		state: STATE_setup, // ['setup', 'exploreProblems:ready', 'exploreProblems:go', 'exploreProblems:finished', 'chooseProblems:ready', 'chooseProblems:go]

		// this is typically json encoded values for the current state.
		// The workshop state data - shared between all users.
		data: {

		},

		exploreProblems: {
			name: 'Explore Problems',
			// timestamp of when the timer will stop.
			stopTime: null,
			// number of minutes
			time: 15,
		},

	}),
	getters: {
		isSetup: (state) => state.state === STATE_setup,
		isExploreProblemsReady: (state) => state.state === STATE_exploreProblems_start,
		isExploreProblemsGo: (state) => state.state === STATE_exploreProblems_go,
		isExploreProblemsFinished: (state) => state.state === STATE_exploreProblems_finished,
		exploreProblemsRemainingTime: (state) => {
			const timerStore = useTimerStore();
			return timerStore.remainingTime;
		},
		urlId: (state) => {
			// add dahses 123-1234-123
			return `${state.id.slice(0, 3)}-${state.id.slice(3, 7)}-${state.id.slice(7)}`;
		},
	},
	actions: { 
		async createWorkshop(facilitatorId, name='Innovation session') {
			// we need to create a workshop on the server
			const response = await fetch('http://localhost:8181/api/workshops', {
				method: 'POST',
				body: JSON.stringify({ facilitatorId: facilitatorId, name: name }),
				headers: {
					'Content-Type': 'application/json'
				},
			});
			const json = await response.json();
			Object.assign(this, json.data.workshop);
			this.roomId = json.data.workshop.id;
			this.facilitatorId = json.data.workshop.created_by;
			return this.urlId;
		},
		async load(id) {
			const response = await fetch(`http://localhost:8181/api/workshops/${id}`);
			const json = await response.json();
			if (json.status === 'success') {
				Object.assign(this, json.data.workshop);
				this.roomId = json.data.workshop.id;
				this.facilitatorId = json.data.workshop.created_by;
				return true;
			} else {
				throw new Error('Workshop not found');
			}
		},
		// joinWorkshop(id) {
		// 	this.state = STATE_setup;
		// },
		async exploreProblemsStart(socket) {
			// post the state to the server
			// const response = await fetch(`http://localhost:8181/api/workshops/${this.id}`, {
			// 	method: 'POST',
			// 	body: JSON.stringify({ state: STATE_exploreProblems_start }),
			// });
			socket.send(JSON.stringify({
				type: 'updateWorkshop',
				data: {
					state: STATE_exploreProblems_start
				}
			}));
			this.state = STATE_exploreProblems_start;
		},
		exploreProblemsGo() {
			this.exploreProblems.stopTime = new Date().getTime() + this.exploreProblems.time * 60 * 1000;
			useTimerStore().initialize(this.exploreProblems.stopTime, () => {
				this.state = STATE_exploreProblems_finished;
			});
			this.state = STATE_exploreProblems_go;
		},
		exploreProblemsPause() {
			useTimerStore().pauseCountdown();
		},
		exploreProblemsResume() {
			useTimerStore().resumeCountdown();
		},
	},
})
