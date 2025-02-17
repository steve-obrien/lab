import { defineStore } from 'pinia'
import { reactive, computed } from 'vue'

/**
 * This is the Pinia store that acts as a "database table" for Model instances.
 * It is used to store and retrieve Model instances.
 */
export const useCollectionStore = defineStore('collection', () => {
	/** @type {Map<string|number, any>} */
	const items = reactive(new Map())

	/**
	 * Upsert (add/update) an item in the collection
	 * @param {any} item - The item to insert/update
	 */
	function upsertItem(item) {
		items.set(item.id, item)
	}

	/**
	 * Bulk upsert items
	 * @param {any[]} newItems - The list of items to insert/update
	 */
	function upsertItems(newItems) {
		newItems.forEach(item => items.set(item.id, item))
	}

	/**
	 * Remove an item from the collection
	 * @param {string|number} id - The ID of the item to remove
	 */
	function removeItem(id) {
		items.delete(id)
	}

	/**
	 * Get a single item by ID
	 * @param {string|number} id - The ID of the item
	 * @returns {any|undefined}
	 */
	function getItem(id) {
		return items.get(id)
	}

	/**
	 * Get all items as an array
	 * @returns {import('vue').ComputedRef<any[]>}
	 */
	const allItems = computed(() => Array.from(items.values()))

	return {
		items,
		upsertItem,
		upsertItems,
		removeItem,
		getItem,
		allItems
	}
})
