import { PLANT_DATABASE, type PlantData } from '$lib/data/plants';
import type { UserPlantData, UserPlantStore } from '$lib/types/userPlants';

const STORAGE_KEY = 'heat-harvest-user-plants';

// Reactive state
export const userPlantsState = $state<{ plants: UserPlantData[] }>({
	plants: []
});

// ============================================================================
// Persistence
// ============================================================================

function loadFromStorage(): UserPlantData[] {
	if (typeof window === 'undefined') return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed: UserPlantStore = JSON.parse(raw);
		if (parsed.version === 1 && Array.isArray(parsed.plants)) {
			return parsed.plants;
		}
		return [];
	} catch {
		return [];
	}
}

function saveToStorage() {
	if (typeof window === 'undefined') return;
	const store: UserPlantStore = {
		version: 1,
		plants: userPlantsState.plants
	};
	localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

// ============================================================================
// ID generation
// ============================================================================

/**
 * Generate a URL-safe plant ID from a name, appending a numeric suffix on collision.
 */
export function generatePlantId(name: string): string {
	const base = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

	const allIds = new Set([
		...PLANT_DATABASE.map((p) => p.id),
		...userPlantsState.plants.map((p) => p.id)
	]);

	if (!allIds.has(base)) return base;

	let suffix = 2;
	while (allIds.has(`${base}-${suffix}`)) {
		suffix++;
	}
	return `${base}-${suffix}`;
}

// ============================================================================
// CRUD operations
// ============================================================================

export function getUserPlants(): UserPlantData[] {
	return userPlantsState.plants;
}

export function addUserPlant(plantData: Omit<UserPlantData, 'isUserPlant' | 'createdAt' | 'updatedAt'>): UserPlantData {
	const now = Date.now();
	const newPlant: UserPlantData = {
		...plantData,
		isUserPlant: true,
		createdAt: now,
		updatedAt: now
	};
	userPlantsState.plants = [...userPlantsState.plants, newPlant];
	saveToStorage();
	return newPlant;
}

export function updateUserPlant(id: string, updates: Partial<PlantData>): boolean {
	const index = userPlantsState.plants.findIndex((p) => p.id === id);
	if (index === -1) return false;

	const updated: UserPlantData = {
		...userPlantsState.plants[index],
		...updates,
		isUserPlant: true,
		updatedAt: Date.now()
	};
	userPlantsState.plants = [
		...userPlantsState.plants.slice(0, index),
		updated,
		...userPlantsState.plants.slice(index + 1)
	];
	saveToStorage();
	return true;
}

export function deleteUserPlant(id: string): boolean {
	const before = userPlantsState.plants.length;
	userPlantsState.plants = userPlantsState.plants.filter((p) => p.id !== id);
	if (userPlantsState.plants.length !== before) {
		saveToStorage();
		return true;
	}
	return false;
}

// ============================================================================
// Initialize on module load (client-side only)
// ============================================================================

if (typeof window !== 'undefined') {
	userPlantsState.plants = loadFromStorage();
}
