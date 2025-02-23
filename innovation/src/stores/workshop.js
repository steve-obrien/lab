"use strict";

import { defineStore } from 'pinia'
import { useUserStore } from './user';
import { ChatCompletionResponseMessageRoleEnum } from 'openai';


const STATE_setup = 'setup';
const STATE_exploreProblems_start = 'exploreProblems_start';
const STATE_exploreProblems_go = 'exploreProblems_go';
const STATE_exploreProblems_finished = 'exploreProblems_finished';


/**
 * This class colocates sending the update and receiving the update.
 * It is used to keep the workshop state in sync between the client and the server.
 */
const workshopSync = {
	init(store) {
		workshopSync.socketReceived = false;
		workshopSync.store = store;
		store.$subscribe((mutation, state) => {
			// prevent the patch from triggering another update if receieved form the socket.
			if (workshopSync.socketReceived == true) 
				return;
			workshopSync.send();
		});
		workshopSync.receive();
	},
	send() {
		workshopSync.store.socket.send('server:updateState', {
			state: this.store.$state
		});
	},
	receive() {
		workshopSync.store.socket.listen('client:updateState', (data) => {
			// I do not want this patch to trigger the $subscribe callback.
			// And potential infinite loop between peers
			// This prevents the received patch from sending another update.
			workshopSync.socketReceived = true;
			workshopSync.store.$patch(data.state);
			workshopSync.socketReceived = false;
		});
	}
}

class WorkshopSocket {

	// store event callbacks
	events = new Map();

	constructor(workshopStore) {
		const userStore = useUserStore();
		const host = import.meta.env.VITE_WS_HOST;
		this.ws = new WebSocket(`${host}/?workshop=${workshopStore.id}&userId=${userStore.id}`);

		this.ws.onopen = () => console.log('Connected');
		this.ws.onmessage = (event) => {
			const packet = JSON.parse(event.data);
			console.info('📡 WebSocket:Recieved:', packet);
			const callback = this.events.get(packet.type);
			if (callback) {
				callback(packet.data, packet);
			}
		}
		this.ws.onclose = () => console.log('📡 Disconnected');
		this.ws.onerror = (err) => console.error('📡 WebSocket error:', err);

		this.ws.onopen = () => {
			console.log('📡 WebSocket connection established');
		};
	}

	listen(type, callback) {
		this.events.set(type, callback);
	}
	onmessage(type, callback) {
		this.events.set(type, callback);
	}

	send(type, payload) {
		if (this.ws.readyState === WebSocket.OPEN) {
			console.info('📡 WebSocket:Send:', { type, data: payload });
			this.ws.send(JSON.stringify({ type, data: payload }));
		}
	}

	close() {
		this.ws.close();
	}

};

/**
 * Represents and tracks a single workshop with connected clients
 */
export const useWorkshopStore = defineStore('workshop', {
	state: () => ({
		// the workshop id
		id: '',
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
			exploreProblems: {
				name: 'Explore Problems',
				stopTime: null,
				time: 15,
				timerStatus: 'initial',
				problems: [],
			}
		},

	}),
	getters: {
		isSetup: (state) => state.state === STATE_setup || state.state === null,
		isExploreProblemsReady: (state) => state.state === STATE_exploreProblems_start,
		isExploreProblemsGo: (state) => state.state === STATE_exploreProblems_go,
		isExploreProblemsFinished: (state) => state.state === STATE_exploreProblems_finished,
		urlId: (state) => {
			// add dahses 123-1234-123
			return `${state.id.slice(0, 3)}-${state.id.slice(3, 7)}-${state.id.slice(7)}`;
		},
		getData: (state) => {
			return state.data;
		},
	},
	actions: {

		send(type, payload) {
			this.socket.send(type, payload);
		},


		joinWebsocket() {
			this.socket = new WorkshopSocket(this);

			workshopSync.init(this);

			this.socket.listen('clientList', (data) => {
				console.log('Client List!', data);
				workshopSync.socketReceived = true;
				this.clientsList = data.clients;
				workshopSync.socketReceived = false;
			});

		},

		sync() {
			WorkshopSync.send()
		},

		async updateWorkshop(updates) {
			const userStore = useUserStore();
			const response = await fetch(`http://localhost:8181/api/workshops/${this.id}`, {
				method: 'POST',
				body: JSON.stringify(updates),
				headers: {
					"Authorization": `Bearer ${userStore.accessToken}`,
					'Content-Type': 'application/json'
				},
			});
			const json = await response.json();
			if (json.status === 'success') {
				Object.assign(this, json.data.workshop);
				return true;
			} else {
				throw new Error('Failed to update workshop');
			}
		},
		
		async createWorkshop(facilitatorId, name = 'Innovation session') {
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
			this.id = json.data.workshop.id;
			this.facilitatorId = json.data.workshop.created_by;
			return this.urlId;
		},
		async load(id) {
			const response = await fetch(`http://localhost:8181/api/workshops/${id}`);
			const json = await response.json();
			if (json.status === 'success') {
				Object.assign(this, json.data.workshop);
				this.facilitatorId = json.data.workshop.created_by;
				return true;
			} else {
				throw new Error('Workshop not found');
			}
		},
		async exploreProblemsStart(countDownMinutes = 15) {
			this.state = STATE_exploreProblems_start;
			this.data = {
				exploreProblems: {
					name: 'Explore Problems',
					stopTime: null,
					time: countDownMinutes,
					timerStatus: 'initial',
				},
			};
		},
		exploreProblemsGo() {
			this.state = STATE_exploreProblems_go;
			this.$patch({ data: {
				exploreProblems: {
					name: 'Explore Problems',
					stopTime: new Date().getTime() + this.data.exploreProblems.time * 60 * 1000,
					timerStatus: 'start',
					// time: 15 (as defined in the start state)
				},
			}});
			// useTimerStore().initialize(this.exploreProblems.stopTime, () => {
			// 	this.state = STATE_exploreProblems_finished;
			// });
		},
		exploreProblemsPause() {
			this.data.exploreProblems.timerStatus = 'paused';
		},
		exploreProblemsResume() {
			this.data.exploreProblems.timerStatus = 'running';
		},
	},
})
