<template>
	<div>
		<h2>Counter Demo</h2>
		<p>Count: {{ counterStore.state.count }}</p>
		<p v-if="counterStore.state.loading">Loading data...</p>

		<button @click="counterStore.increment()">Increment</button>
		<button @click="counterStore.decrement()">Decrement</button>
		<button @click="counterStore.fetchCountFromAPI()">Fetch from API</button>

		<button @click="counterStore.undo()">Undo</button>
		<button @click="counterStore.redo()">Redo</button>

		<hr />
		<h3>Nested State Demo</h3>
		<p>Name: {{ counterStore.state.profile.name }}</p>
		<p>Level: {{ counterStore.state.profile.stats.level }}</p>
		<p>EXP: {{ counterStore.state.profile.stats.exp }}</p>
		<button @click="gainExperience(10)">Gain 10 EXP</button>
	</div>
</template>

<script setup>
import { useCounterStore } from "@/stores/counterStore";

// Access the store (shared instance)
const counterStore = useCounterStore();

// Demonstration: modify a nested property using an action
function gainExperience(amount) {
	counterStore.commit((state, payload) => {
		return {
			...state,
			profile: {
				...state.profile,
				stats: {
					...state.profile.stats,
					exp: state.profile.stats.exp + payload,
				},
			},
		};
	}, amount);
}
</script>