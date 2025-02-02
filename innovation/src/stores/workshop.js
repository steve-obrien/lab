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
		// the unique id of the workshop.
		roomId: '',
		// the workshop session name.
		name: '',
		// the id of the facilitator.
		facilitatorId: '',
		// the list of clients connected to the workshop.
		clientsList: new Map(),


		workshopState: STATE_setup, // ['setup', 'exploreProblems:ready', 'exploreProblems:go', 'exploreProblems:finished', 'chooseProblems:ready', 'chooseProblems:go]

		exploreProblems: {
			name: 'Explore Problems',
			// timestamp of when the timer will stop.
			stopTime: null,
			// number of minutes
			time: 15,
		},

		
		
	}),
	getters: {
		isSetup: (state) => state.workshopState === STATE_setup,
		isExploreProblemsReady: (state) => state.workshopState === STATE_exploreProblems_start,
		isExploreProblemsGo: (state) => state.workshopState === STATE_exploreProblems_go,
		isExploreProblemsFinished: (state) => state.workshopState === STATE_exploreProblems_finished,
		exploreProblemsRemainingTime: (state) => {
			const timerStore = useTimerStore();
			return timerStore.remainingTime;
		},
	},
	actions: { 
		createWorkshop(facilitatorId) {
			// API calls to generate a code.
			const generateRandomCode = () => {
				const getRandomSegment = () => Math.random().toString(36).substring(2, 5).toLowerCase();
				return `${getRandomSegment()}-${getRandomSegment()}-${getRandomSegment()}`;
			};
			this.facilitatorId = facilitatorId;
			return this.roomId = generateRandomCode();
		},
		exploreProblemsStart() {
			this.workshopState = STATE_exploreProblems_start;
		},
		exploreProblemsGo() {
			this.exploreProblems.stopTime = new Date().getTime() + this.exploreProblems.time * 60 * 1000;
			useTimerStore().initialize(this.exploreProblems.stopTime, () => {
				this.workshopState = STATE_exploreProblems_finished;
			});
			this.workshopState = STATE_exploreProblems_go;
		},

	},
})
