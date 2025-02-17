import { reactive, computed } from 'vue'
import { useCollectionStore } from '@/stores/Collection.js'

/**
 * Base Model Record class
 * @template T
 */
export class Model {
	static store = useCollectionStore() // Static reference to store

	/**
	 * @param {T} data - The data object for the entity
	 */
	constructor(data) {
		this.data = reactive(data)
		Model.store?.upsertItem(this) // Auto-register in store
	}

	/**
	 * Get the entity ID
	 * @returns {string|number}
	 */
	get id() {
		return this.data.id
	}

	/**
	 * Save the instance to the store (upsert)
	 */
	save() {
		Model.store?.upsertItem(this)
	}

	/**
	 * Remove this instance from the store
	 */
	delete() {
		Model.store?.removeItem(this.id)
	}

	/**
	 * Find an entity by ID
	 * @template T
	 * @param {string|number} id - The ID of the entity
	 * @returns {T|undefined}
	 */
	static find(id) {
		return Model.store?.getItem(id)
	}

	/**
	 * Get all entities of this type
	 * @template T
	 * @returns {T[]}
	 */
	static all() {
		return Model.store?.allItems
	}

	/**
	 * Fetch data from an API and store the results
	 * @param {string} url - The API endpoint
	 * @returns {Promise<Model[]>}
	 */
	static async fetch(url) {
		const response = await fetch(url)
		const data = await response.json()
		const instances = data.map(item => new this(item))
		Model.store?.upsertItems(instances)
		return instances
	}
}
