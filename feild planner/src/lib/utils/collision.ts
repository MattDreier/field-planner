interface PlantPosition {
	id: string;
	x: number; // absolute field position (inches)
	y: number; // absolute field position (inches)
	radius: number; // spacingMin / 2 (inches)
}

/**
 * Detect spacing conflicts between plants.
 * Returns a Map where keys are plant IDs and values are arrays of conflicting plant IDs.
 */
export function detectSpacingConflicts(plants: PlantPosition[]): Map<string, string[]> {
	const conflicts = new Map<string, string[]>();

	// O(n²) - acceptable for <100 plants
	for (let i = 0; i < plants.length; i++) {
		for (let j = i + 1; j < plants.length; j++) {
			const p1 = plants[i];
			const p2 = plants[j];

			// Distance between centers (squared to avoid sqrt)
			const dx = p1.x - p2.x;
			const dy = p1.y - p2.y;
			const distanceSquared = dx * dx + dy * dy;

			// Sum of radii (spacing circles)
			const combinedRadius = p1.radius + p2.radius;

			// Collision if distance < combined radii
			if (distanceSquared < combinedRadius * combinedRadius) {
				// Add both plants to conflict map
				if (!conflicts.has(p1.id)) conflicts.set(p1.id, []);
				if (!conflicts.has(p2.id)) conflicts.set(p2.id, []);
				conflicts.get(p1.id)!.push(p2.id);
				conflicts.get(p2.id)!.push(p1.id);
			}
		}
	}

	return conflicts;
}

/**
 * Check if a single plant would conflict with any existing plants
 */
export function wouldConflict(
	newPlant: PlantPosition,
	existingPlants: PlantPosition[]
): boolean {
	for (const plant of existingPlants) {
		if (plant.id === newPlant.id) continue;

		const dx = newPlant.x - plant.x;
		const dy = newPlant.y - plant.y;
		const distanceSquared = dx * dx + dy * dy;
		const combinedRadius = newPlant.radius + plant.radius;

		if (distanceSquared < combinedRadius * combinedRadius) {
			return true;
		}
	}
	return false;
}
