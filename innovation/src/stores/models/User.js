import { Model } from '@/stores/Model'

/**
 * User Model that extends Model
 */
export class User extends Model {
	/**
	 * Check if the user is an adult
	 * @returns {import('vue').ComputedRef<boolean>}
	 */
	get isAdult() {
		return computed(() => this.data.age >= 18)
	}

	/**
	 * Fetch users from an API
	 * @returns {Promise<User[]>}
	 */
	static async fetchUsers() {
		return this.fetch('https://api.example.com/users')
	}
}