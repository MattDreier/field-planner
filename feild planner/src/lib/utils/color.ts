/**
 * Height-based color mapping utilities.
 * Uses OKLch color space for perceptually uniform colors that match the timeline aesthetic.
 * Blue (260°) for shortest → Coral (30°) for tallest
 */

// OKLch parameters matching timeline's muted palette
const LIGHTNESS = 0.68;
const CHROMA = 0.14;
const HUE_SHORT = 260; // Cool blue for short plants
const HUE_TALL = 30;   // Warm coral for tall plants
const HUE_SAME = 145;  // Sage green when all same height

interface PlantHeight {
	id: string;
	heightMax: number;
}

/**
 * Generate an OKLch color string
 */
function oklch(lightness: number, chroma: number, hue: number): string {
	return `oklch(${lightness} ${chroma} ${hue})`;
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
			// All plants same height: use sage green
			hue = HUE_SAME;
		} else {
			// Normalize to 0-1, then map from blue (260) to coral (30)
			const normalized = (plant.heightMax - minHeight) / range;
			hue = HUE_SHORT - normalized * (HUE_SHORT - HUE_TALL);
		}

		colors.set(plant.id, oklch(LIGHTNESS, CHROMA, hue));
	}

	return colors;
}

/**
 * Get color for a single height value given min/max bounds
 */
export function getHeightColor(height: number, minHeight: number, maxHeight: number): string {
	const range = maxHeight - minHeight;

	if (range === 0) {
		return oklch(LIGHTNESS, CHROMA, HUE_SAME);
	}

	const normalized = (height - minHeight) / range;
	const hue = HUE_SHORT - normalized * (HUE_SHORT - HUE_TALL);
	return oklch(LIGHTNESS, CHROMA, hue);
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
		return [{ height: minHeight, color: oklch(LIGHTNESS, CHROMA, HUE_SAME) }];
	}

	for (let i = 0; i < steps; i++) {
		const normalized = i / (steps - 1);
		const height = minHeight + normalized * range;
		const hue = HUE_SHORT - normalized * (HUE_SHORT - HUE_TALL);
		legend.push({
			height: Math.round(height),
			color: oklch(LIGHTNESS, CHROMA, hue)
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
