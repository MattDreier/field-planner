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
		return structuredClone(obj);
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
		 * Direct access to past array for reactive tracking
		 */
		get past() {
			return past;
		},

		/**
		 * Direct access to future array for reactive tracking
		 */
		get future() {
			return future;
		},

		/**
		 * Direct access to current for reactive tracking
		 */
		get current() {
			return current;
		},

		/**
		 * Whether there are snapshots to undo to
		 */
		get canUndo() {
			return current !== null;
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
		 * @param currentBeds - The actual current beds state (for saving to future)
		 * @param currentPlants - The actual current plants state (for saving to future)
		 * @returns The snapshot to restore, or null if nothing to undo
		 */
		undo(currentBeds: Bed[], currentPlants: PlacedPlant[]): Snapshot | null {
			// We need a current snapshot to undo to
			if (current === null) {
				return null;
			}

			// Save the actual UI state to future (for redo)
			const actualUIState: Snapshot = {
				beds: deepClone(currentBeds),
				plants: deepClone(currentPlants),
				timestamp: Date.now()
			};
			future = [...future, actualUIState];

			// The state to restore is current (the snapshot taken before the last change)
			const stateToRestore = current;

			// Pop from past to become new current (for next undo)
			if (past.length > 0) {
				current = past[past.length - 1];
				past = past.slice(0, -1);
			} else {
				current = null;
			}

			// Return deep clone to prevent mutation
			return deepClone(stateToRestore);
		},

		/**
		 * Restore next state
		 * @param currentBeds - The actual current beds state (for saving as checkpoint)
		 * @param currentPlants - The actual current plants state (for saving as checkpoint)
		 * @returns The snapshot to restore, or null if nothing to redo
		 */
		redo(currentBeds: Bed[], currentPlants: PlacedPlant[]): Snapshot | null {
			if (future.length === 0) {
				return null;
			}

			// Get the state to restore from future
			const nextSnapshot = future[future.length - 1];
			future = future.slice(0, -1);

			// Push old current to past (for undo chain)
			if (current !== null) {
				past = [...past, current];
			}

			// Save actual UI state as new current (checkpoint for undoing after redo)
			current = {
				beds: deepClone(currentBeds),
				plants: deepClone(currentPlants),
				timestamp: Date.now()
			};

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
