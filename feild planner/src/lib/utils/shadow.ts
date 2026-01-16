/**
 * Shadow geometry calculations and shade detection.
 * Uses sun position to compute shadow length, direction, and overlap.
 */
import type { SunPosition } from './sun';

export interface ShadowData {
	plantId: string;
	originX: number; // plant position in field inches
	originY: number;
	shadowLength: number; // in inches
	shadowAngle: number; // degrees from North (0-360)
	endX: number; // shadow tip position
	endY: number;
	heightMax: number; // plant height for reference
}

export interface PlantForShadow {
	id: string;
	x: number; // absolute position in field inches
	y: number;
	heightMax: number; // in inches
}

// Maximum shadow length in inches (cap to prevent extreme values at low sun angles)
const MAX_SHADOW_LENGTH = 300; // 25 feet

// Shadow rendering starts at 10° (faint) and reaches full opacity at 25°.
// This creates a natural fade-in effect as the sun rises.
const MIN_SHADOW_RENDER_ALTITUDE = 10; // degrees - shadows start appearing (faintly)
const FULL_SHADOW_ALTITUDE = 25; // degrees - shadows at full opacity

// Shade detection uses a higher threshold (20°) because below this, sunlight is heavily
// scattered by the atmosphere and PAR (Photosynthetically Active Radiation) is minimal.
// At low angles, R:FR ratios fluctuate (0.8-1.3) and the proportion of photosynthetically
// useful light is low. Research shows 20° as a key threshold for plant growth impact.
const MIN_SHADE_DETECTION_ALTITUDE = 20; // degrees

/**
 * Calculate shadow opacity based on sun altitude.
 * Fades in from 0 at MIN_SHADOW_RENDER_ALTITUDE to 1 at FULL_SHADOW_ALTITUDE.
 */
export function getShadowOpacity(altitude: number): number {
	if (altitude < MIN_SHADOW_RENDER_ALTITUDE) return 0;
	if (altitude >= FULL_SHADOW_ALTITUDE) return 1;
	return (altitude - MIN_SHADOW_RENDER_ALTITUDE) / (FULL_SHADOW_ALTITUDE - MIN_SHADOW_RENDER_ALTITUDE);
}

/**
 * Calculate shadow data for a single plant given sun position.
 *
 * @param plant - Plant with position and height
 * @param sunPosition - Current sun altitude and azimuth
 * @returns Shadow geometry data, or null if sun is too low/below horizon
 */
export function calculateShadow(
	plant: PlantForShadow,
	sunPosition: SunPosition
): ShadowData | null {
	// No shadow when sun is below horizon or too low for rendering
	if (sunPosition.isNight || sunPosition.altitude < MIN_SHADOW_RENDER_ALTITUDE) {
		return null;
	}

	// Shadow direction is opposite of sun azimuth
	// Sun in east (90°) casts shadow to west (270°)
	const shadowAngle = (sunPosition.azimuth + 180) % 360;

	// Shadow length = height / tan(altitude)
	// As sun gets lower, shadows get longer
	const altitudeRad = (sunPosition.altitude * Math.PI) / 180;
	let shadowLength = plant.heightMax / Math.tan(altitudeRad);

	// Cap shadow length to prevent extreme values
	shadowLength = Math.min(shadowLength, MAX_SHADOW_LENGTH);

	// Calculate shadow endpoint
	// Convert angle to radians (0° = North = -Y direction in SVG)
	const angleRad = (shadowAngle * Math.PI) / 180;
	const endX = plant.x + Math.sin(angleRad) * shadowLength;
	const endY = plant.y - Math.cos(angleRad) * shadowLength; // Negative because Y increases downward

	return {
		plantId: plant.id,
		originX: plant.x,
		originY: plant.y,
		shadowLength,
		shadowAngle,
		endX,
		endY,
		heightMax: plant.heightMax
	};
}

/**
 * Calculate shadows for all plants.
 */
export function calculateAllShadows(
	plants: PlantForShadow[],
	sunPosition: SunPosition
): ShadowData[] {
	if (sunPosition.isNight || sunPosition.altitude < MIN_SHADOW_RENDER_ALTITUDE) {
		return [];
	}

	return plants.map((plant) => calculateShadow(plant, sunPosition)).filter((s): s is ShadowData => s !== null);
}

/**
 * Detect which plants are being shaded by other (taller) plants.
 * Uses a shadow cone approach - checks if a plant falls within another's shadow cone.
 * Uses a higher altitude threshold than rendering because shading only meaningfully
 * impacts photosynthesis when PAR levels are significant.
 *
 * @param plants - All plants with positions and heights
 * @param sunPosition - Current sun position
 * @returns Set of plant IDs that are being shaded
 */
export function detectShadedPlants(
	plants: PlantForShadow[],
	sunPosition: SunPosition
): Set<string> {
	const shadedSet = new Set<string>();

	// No shading detection when sun is too low for meaningful photosynthetic impact
	if (sunPosition.isNight || sunPosition.altitude < MIN_SHADE_DETECTION_ALTITUDE) {
		return shadedSet;
	}

	// Shadow direction (opposite of sun)
	const shadowAngle = (sunPosition.azimuth + 180) % 360;
	const shadowAngleRad = (shadowAngle * Math.PI) / 180;

	// Unit vector for shadow direction
	const shadowDirX = Math.sin(shadowAngleRad);
	const shadowDirY = -Math.cos(shadowAngleRad); // Negative because Y increases downward

	// Check each plant against all other plants
	for (const target of plants) {
		for (const caster of plants) {
			// Skip self and shorter/equal height plants
			if (target.id === caster.id) continue;
			if (caster.heightMax <= target.heightMax) continue;

			// Calculate shadow length for the caster
			const altitudeRad = (sunPosition.altitude * Math.PI) / 180;
			const casterShadowLength = Math.min(caster.heightMax / Math.tan(altitudeRad), MAX_SHADOW_LENGTH);

			// Vector from caster to target
			const dx = target.x - caster.x;
			const dy = target.y - caster.y;
			const distToTarget = Math.sqrt(dx * dx + dy * dy);

			// If target is farther than shadow length, not shaded
			if (distToTarget > casterShadowLength) continue;

			// If target is very close (within plant radius), not shaded (same plant essentially)
			if (distToTarget < 6) continue; // 6 inches minimum distance

			// Normalize target direction vector
			const targetDirX = dx / distToTarget;
			const targetDirY = dy / distToTarget;

			// Dot product gives cosine of angle between shadow direction and target direction
			const dotProduct = shadowDirX * targetDirX + shadowDirY * targetDirY;

			// Shadow cone: approximately 20° half-angle based on plant spread
			// cos(20°) ≈ 0.94
			const coneThreshold = 0.94;

			// Target is shaded if it's within the shadow cone
			if (dotProduct > coneThreshold) {
				// Additional check: target must be in the direction of the shadow, not behind the caster
				// (dotProduct > 0 already ensures this since we require > 0.94)
				shadedSet.add(target.id);
				break; // One shadow is enough to mark as shaded
			}
		}
	}

	return shadedSet;
}

/**
 * Get a descriptive string for the current sun position.
 */
export function getSunDescription(sunPosition: SunPosition): string {
	if (sunPosition.isNight) {
		return 'Sun below horizon';
	}

	const direction = getCompassDirection(sunPosition.azimuth);

	if (sunPosition.altitude > 60) {
		return `High sun (${Math.round(sunPosition.altitude)}°) in ${direction}`;
	} else if (sunPosition.altitude > 30) {
		return `Sun at ${Math.round(sunPosition.altitude)}° in ${direction}`;
	} else {
		return `Low sun (${Math.round(sunPosition.altitude)}°) in ${direction}`;
	}
}

/**
 * Convert azimuth to compass direction.
 */
function getCompassDirection(azimuth: number): string {
	const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
	const index = Math.round(azimuth / 45) % 8;
	return directions[index];
}
