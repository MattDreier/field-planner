/**
 * Height-based color mapping utilities.
 * Uses HSL color space: Blue (240°) for shortest → Red (0°) for tallest
 */

interface PlantHeight {
	id: string;
	heightMax: number;
}

/**
 * Calculate colors for plants based on their relative heights.
 * Colors are normalized to the min/max heights of the current plant set.
 */
export function calculateHeightColors(plants: PlantHeight[]): Map<string, string> {
	const colors = new Map<string, string>();

	if (plants.length === 0) return colors;

	// Find min/max heights among placed plants only
	const heights = plants.map((p) => p.heightMax);
	const minHeight = Math.min(...heights);
	const maxHeight = Math.max(...heights);
	const range = maxHeight - minHeight;

	for (const plant of plants) {
		let hue: number;

		if (range === 0) {
			// All plants same height: use middle color (green)
			hue = 120;
		} else {
			// Normalize to 0-1, then map to 240-0 (blue to red)
			const normalized = (plant.heightMax - minHeight) / range;
			hue = 240 - normalized * 240; // 240=blue, 0=red
		}

		// Fixed saturation and lightness for visibility
		colors.set(plant.id, `hsl(${hue}, 70%, 50%)`);
	}

	return colors;
}

/**
 * Get color for a single height value given min/max bounds
 */
export function getHeightColor(height: number, minHeight: number, maxHeight: number): string {
	const range = maxHeight - minHeight;

	if (range === 0) {
		return 'hsl(120, 70%, 50%)'; // Green for same height
	}

	const normalized = (height - minHeight) / range;
	const hue = 240 - normalized * 240;
	return `hsl(${hue}, 70%, 50%)`;
}

/**
 * Generate legend gradient stops for display
 */
export function generateHeightLegend(
	minHeight: number,
	maxHeight: number,
	steps: number = 5
): Array<{ height: number; color: string }> {
	const legend: Array<{ height: number; color: string }> = [];
	const range = maxHeight - minHeight;

	if (range === 0) {
		// Single entry for same height
		return [{ height: minHeight, color: 'hsl(120, 70%, 50%)' }];
	}

	for (let i = 0; i < steps; i++) {
		const normalized = i / (steps - 1);
		const height = minHeight + normalized * range;
		const hue = 240 - normalized * 240;
		legend.push({
			height: Math.round(height),
			color: `hsl(${hue}, 70%, 50%)`
		});
	}

	return legend;
}

/**
 * Convert height in inches to a human-readable format
 */
export function formatHeight(inches: number): string {
	if (inches < 12) {
		return `${inches}"`;
	}
	const feet = Math.floor(inches / 12);
	const remainingInches = inches % 12;
	if (remainingInches === 0) {
		return `${feet}'`;
	}
	return `${feet}'${remainingInches}"`;
}
