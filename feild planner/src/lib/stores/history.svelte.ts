/**
 * Undo/Redo history store using Svelte 5 runes
 */
import type { Bed, PlacedPlant } from '$lib/types';

export interface Snapshot {
	beds: Bed[];
	plants: PlacedPlant[];
	timestamp: number;
}

const MAX_HISTORY = 50;

/**
 * Deep clone helper that handles Svelte 5 proxy objects.
 * deepClone() fails on $state proxies, so we use JSON as fallback.
 */
function deepClone<T>(obj: T): T {
	try {
		return deepClone(obj);
	} catch {
		// Svelte 5 $state proxies can't be cloned with structuredClone
		// Fall back to JSON parse/stringify
		return JSON.parse(JSON.stringify(obj));
	}
}

export function createHistoryStore() {
	let past = $state<Snapshot[]>([]);
	let future = $state<Snapshot[]>([]);
	let current = $state<Snapshot | null>(null);

	return {
		/**
		 * Whether there are snapshots to undo to
		 */
		get canUndo() {
			return past.length > 0;
		},

		/**
		 * Whether there are snapshots to redo to
		 */
		get canRedo() {
			return future.length > 0;
		},

		/**
		 * Get the number of undo steps available
		 */
		get undoCount() {
			return past.length;
		},

		/**
		 * Get the number of redo steps available
		 */
		get redoCount() {
			return future.length;
		},

		/**
		 * Take a snapshot before a mutation
		 * @param beds - Current beds array
		 * @param plants - Current plants array
		 */
		push(beds: Bed[], plants: PlacedPlant[]) {
			// Deep clone with structuredClone
			const snapshot: Snapshot = {
				beds: deepClone(beds),
				plants: deepClone(plants),
				timestamp: Date.now()
			};

			// Add current to past (if we have a current state)
			if (current !== null) {
				past = [...past.slice(-(MAX_HISTORY - 1)), current];
			}

			// Clear future stack (branching history)
			future = [];

			// Set new current
			current = snapshot;
		},

		/**
		 * Restore previous state
		 * @returns The snapshot to restore, or null if nothing to undo
		 */
		undo(): Snapshot | null {
			if (past.length === 0) {
				return null;
			}

			// Get the last snapshot from past
			const previousSnapshot = past[past.length - 1];
			past = past.slice(0, -1);

			// Push current to future
			if (current !== null) {
				future = [...future, current];
			}

			// Update current
			current = previousSnapshot;

			// Return deep clone to prevent mutation
			return deepClone(previousSnapshot);
		},

		/**
		 * Restore next state
		 * @returns The snapshot to restore, or null if nothing to redo
		 */
		redo(): Snapshot | null {
			if (future.length === 0) {
				return null;
			}

			// Get the last snapshot from future
			const nextSnapshot = future[future.length - 1];
			future = future.slice(0, -1);

			// Push current to past
			if (current !== null) {
				past = [...past, current];
			}

			// Update current
			current = nextSnapshot;

			// Return deep clone to prevent mutation
			return deepClone(nextSnapshot);
		},

		/**
		 * Clear all history
		 */
		clear() {
			past = [];
			future = [];
			current = null;
		},

		/**
		 * Initialize with current state (call once when app loads)
		 * @param beds - Initial beds array
		 * @param plants - Initial plants array
		 */
		initialize(beds: Bed[], plants: PlacedPlant[]) {
			current = {
				beds: deepClone(beds),
				plants: deepClone(plants),
				timestamp: Date.now()
			};
			past = [];
			future = [];
		}
	};
}

// Singleton instance
export const history = createHistoryStore();
