/**
 * Persistence mode management for the Field Planner application.
 *
 * Supports two modes:
 * - 'local': In-memory state with no persistence (demo mode)
 * - 'convex': Full persistence via Convex backend
 *
 * The mode is determined by whether VITE_CONVEX_URL is configured.
 */

export type PersistenceMode = 'local' | 'convex';

/**
 * Check if Convex is available (VITE_CONVEX_URL is set).
 * This must be called client-side as it checks import.meta.env.
 */
export function isConvexAvailable(): boolean {
	if (typeof window === 'undefined') {
		return false;
	}
	const url = import.meta.env.VITE_CONVEX_URL;
	return typeof url === 'string' && url.length > 0;
}

/**
 * Get the Convex URL if available.
 * Returns undefined if not configured.
 */
export function getConvexUrl(): string | undefined {
	if (typeof window === 'undefined') {
		return undefined;
	}
	const url = import.meta.env.VITE_CONVEX_URL;
	return typeof url === 'string' && url.length > 0 ? url : undefined;
}

// Reactive state for persistence mode
let mode = $state<PersistenceMode>('local');

/**
 * Reactive persistence state object.
 * Use getters to access reactive values.
 */
export const persistence = {
	get mode() {
		return mode;
	},
	set mode(value: PersistenceMode) {
		mode = value;
	},
	get isConvex() {
		return mode === 'convex';
	},
	get isLocal() {
		return mode === 'local';
	}
};

/**
 * Initialize persistence mode based on environment.
 * Call this once at app startup.
 */
export function initializePersistence(): PersistenceMode {
	const convexAvailable = isConvexAvailable();
	mode = convexAvailable ? 'convex' : 'local';
	return mode;
}

/**
 * Manually set the persistence mode.
 * Useful for testing or user-controlled mode switching.
 */
export function setPersistenceMode(newMode: PersistenceMode): void {
	if (newMode === 'convex' && !isConvexAvailable()) {
		console.warn(
			'Cannot switch to Convex mode: VITE_CONVEX_URL is not configured. Staying in local mode.'
		);
		return;
	}
	mode = newMode;
}
