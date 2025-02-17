<template>
	<div>
		<h1>Test</h1>

		<pre>{{ alice }}</pre>
		<pre>{{ bob }}</pre>
		<pre>{{ foundUser }}</pre>
		<pre>{{ allUsers }}</pre>
	</div>
</template>

<script setup>
import { User } from '@/stores/models/User'
import { onMounted } from 'vue'
// Create new users
const alice = new User({ id: 1, name: 'Alice', age: 25 })
const bob = new User({ id: 2, name: 'Bob', age: 17 })

// Find a user
const foundUser = User.find(1)
console.log(foundUser?.data.name) // "Alice"

// Get all users
const allUsers = User.all()
console.log(allUsers.map(user => user.data.name)) // ["Alice", "Bob"]

// Update a user
alice.data.age = 26
alice.save()

// Delete a user
bob.delete()

onMounted(() => {
	// Fetch users from an API and store them
	window.alice = alice
	window.bob = bob
	window.foundUser = foundUser
	window.allUsers = allUsers
})
</script>