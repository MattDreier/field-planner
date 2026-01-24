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

// ============================================================================
// Structure-based Shading (for fences and raised beds)
// ============================================================================

/**
 * Structure that casts shadows - can be fence segments or bed edges.
 * Used for unified shade detection across all structure types.
 */
export interface StructureForShading {
	type: 'fence' | 'bed';
	id: string;
	segments: Array<{
		start: { x: number; y: number };
		end: { x: number; y: number };
	}>;
	heightInches: number;
}

/**
 * Calculate perpendicular distance from a point to a line segment.
 * Used for determining how far a plant is from a shadow-casting edge.
 */
function pointToSegmentDistance(
	px: number,
	py: number,
	x1: number,
	y1: number,
	x2: number,
	y2: number
): number {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const lengthSq = dx * dx + dy * dy;

	if (lengthSq === 0) {
		// Segment is a point
		return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
	}

	// Project point onto line, clamped to segment
	const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSq));
	const projX = x1 + t * dx;
	const projY = y1 + t * dy;

	return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

/**
 * Test if a point is inside a quadrilateral using the cross product method.
 * Points are expected in order (either CW or CCW).
 */
function isPointInQuadrilateral(
	px: number,
	py: number,
	q: { p1: { x: number; y: number }; p2: { x: number; y: number }; p3: { x: number; y: number }; p4: { x: number; y: number } }
): boolean {
	const points = [q.p1, q.p2, q.p3, q.p4];

	// Check if point is on the same side of all edges
	let sign: number | null = null;

	for (let i = 0; i < 4; i++) {
		const a = points[i];
		const b = points[(i + 1) % 4];

		// Cross product of edge vector and point vector
		const cross = (b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x);

		if (sign === null) {
			sign = cross >= 0 ? 1 : -1;
		} else {
			if ((cross >= 0 ? 1 : -1) !== sign) {
				return false;
			}
		}
	}

	return true;
}

/**
 * Detect which plants are being shaded by other (taller) plants AND by structures.
 * Uses a shadow cone approach for plant-to-plant shading and point-in-quadrilateral
 * for structure shadows (fences and raised beds).
 *
 * @param plants - All plants with positions and heights
 * @param sunPosition - Current sun position
 * @param structures - Optional array of structures (fences, raised beds) that cast shadows
 * @returns Set of plant IDs that are being shaded
 */
export function detectShadedPlants(
	plants: PlantForShadow[],
	sunPosition: SunPosition,
	structures?: StructureForShading[]
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

	// Shadow offset calculation helper
	const altitudeRad = (sunPosition.altitude * Math.PI) / 180;

	// Check each plant against all other plants (existing plant-to-plant shading)
	for (const target of plants) {
		for (const caster of plants) {
			// Skip self and shorter/equal height plants
			if (target.id === caster.id) continue;
			if (caster.heightMax <= target.heightMax) continue;

			// Calculate shadow length for the caster
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

			// Target is shaded if it's within the shadow cone AND below the shadow plane
			if (dotProduct > coneThreshold) {
				// Calculate shadow plane height at target's distance
				// shadowPlaneHeight = casterHeight × (1 - distance/shadowLength)
				const shadowPlaneHeight = caster.heightMax * (1 - distToTarget / casterShadowLength);

				// Only shaded if target plant is shorter than shadow plane
				if (target.heightMax < shadowPlaneHeight) {
					shadedSet.add(target.id);
					break; // One shadow is enough to mark as shaded
				}
			}
		}
	}

	// Check plants against structure shadows (fences and raised beds)
	if (structures && structures.length > 0) {
		for (const target of plants) {
			// Skip if already marked as shaded
			if (shadedSet.has(target.id)) continue;

			for (const structure of structures) {
				// Calculate shadow length for this structure
				const shadowLength = Math.min(structure.heightInches / Math.tan(altitudeRad), MAX_SHADOW_LENGTH);
				const offsetX = Math.sin(shadowAngleRad) * shadowLength;
				const offsetY = -Math.cos(shadowAngleRad) * shadowLength;

				// Check if plant falls within any segment's shadow quadrilateral
				for (const segment of structure.segments) {
					const quadrilateral = {
						p1: segment.start,
						p2: segment.end,
						p3: { x: segment.end.x + offsetX, y: segment.end.y + offsetY },
						p4: { x: segment.start.x + offsetX, y: segment.start.y + offsetY }
					};

					if (isPointInQuadrilateral(target.x, target.y, quadrilateral)) {
						// Calculate distance from plant to structure segment
						const distToSegment = pointToSegmentDistance(
							target.x,
							target.y,
							segment.start.x,
							segment.start.y,
							segment.end.x,
							segment.end.y
						);

						// Calculate shadow plane height at this distance
						// shadowPlaneHeight = structureHeight × (1 - distance/shadowLength)
						const shadowPlaneHeight = structure.heightInches * (1 - distToSegment / shadowLength);

						// Only shaded if plant is shorter than shadow plane at this location
						if (target.heightMax < shadowPlaneHeight) {
							shadedSet.add(target.id);
							break;
						}
					}
				}

				if (shadedSet.has(target.id)) break;
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

// ============================================================================
// Shared Sun-Facing Detection
// ============================================================================

/**
 * Determine if a line segment's outward face is toward the sun.
 * Used by rectangles, circles, and fences for consistent shadow behavior.
 *
 * The algorithm:
 * 1. Calculate the segment's outward normal using the interior point
 * 2. Convert sun azimuth to a direction vector
 * 3. If dot product of normal and sun direction > 0, segment faces the sun
 *
 * @param start - Segment start point
 * @param end - Segment end point
 * @param sunAzimuth - Sun compass direction (0=N, 90=E, 180=S, 270=W)
 * @param interiorPoint - Point on the "inside" to determine outward direction
 * @returns true if the segment's outward face is illuminated by the sun
 */
export function isSegmentSunFacing(
	start: { x: number; y: number },
	end: { x: number; y: number },
	sunAzimuth: number,
	interiorPoint: { x: number; y: number }
): boolean {
	// Calculate segment direction vector
	const dx = end.x - start.x;
	const dy = end.y - start.y;

	// Handle degenerate segment (zero length)
	const segmentLenSq = dx * dx + dy * dy;
	if (segmentLenSq === 0) return false;

	// Segment midpoint
	const midX = (start.x + end.x) / 2;
	const midY = (start.y + end.y) / 2;

	// Vector from interior to segment midpoint (points outward)
	const toMidX = midX - interiorPoint.x;
	const toMidY = midY - interiorPoint.y;

	// Two perpendicular options (90° rotations of segment direction):
	// - CCW rotation: (-dy, dx)
	// - CW rotation: (dy, -dx)
	// Choose the one that aligns with the outward direction (interior → midpoint)
	const dotCCW = -dy * toMidX + dx * toMidY;

	let normalX: number, normalY: number;
	if (dotCCW >= 0) {
		// CCW perpendicular points outward
		normalX = -dy;
		normalY = dx;
	} else {
		// CW perpendicular points outward
		normalX = dy;
		normalY = -dx;
	}

	// Normalize for cleaner dot product (optional but makes threshold consistent)
	const normalLen = Math.sqrt(normalX * normalX + normalY * normalY);
	normalX /= normalLen;
	normalY /= normalLen;

	// Calculate sun direction vector
	// Azimuth: 0°=North, 90°=East, 180°=South, 270°=West
	// In SVG coords: +X is East, +Y is South (down)
	const azimuthRad = (sunAzimuth * Math.PI) / 180;
	const sunX = Math.sin(azimuthRad); // East component
	const sunY = -Math.cos(azimuthRad); // North is -Y in SVG

	// Segment casts shadow if outward normal points AWAY from sun
	// (the edge blocks light when its outward face is opposite the sun direction)
	const dotWithSun = normalX * sunX + normalY * sunY;

	return dotWithSun < 0;
}

// ============================================================================
// Fence Shadow Calculations
// ============================================================================

export interface FenceSegment {
	start: { x: number; y: number };
	end: { x: number; y: number };
}

export interface FenceShadowData {
	fenceId: string;
	segmentIndex: number;
	quadrilateral: {
		p1: { x: number; y: number }; // base start
		p2: { x: number; y: number }; // base end
		p3: { x: number; y: number }; // shadow end
		p4: { x: number; y: number }; // shadow start
	};
	shadowLength: number;
	shadowAngle: number;
}

export interface FenceForShadow {
	id: string;
	vertices: Array<{ x: number; y: number }>;
	heightFeet: number;
}

/**
 * Calculate shadows for all fence segments.
 * Each segment casts a quadrilateral shadow (parallelogram-like shape).
 *
 * @param fences - Array of fences with vertices and heights
 * @param sunPosition - Current sun altitude and azimuth
 * @returns Array of fence shadow data for rendering
 */
export function calculateFenceShadows(
	fences: FenceForShadow[],
	sunPosition: SunPosition
): FenceShadowData[] {
	if (sunPosition.isNight || sunPosition.altitude < MIN_SHADOW_RENDER_ALTITUDE) {
		return [];
	}

	const shadows: FenceShadowData[] = [];

	// Shadow direction is opposite of sun azimuth
	const shadowAngle = (sunPosition.azimuth + 180) % 360;
	const angleRad = (shadowAngle * Math.PI) / 180;

	// Shadow length per inch of height
	const altitudeRad = (sunPosition.altitude * Math.PI) / 180;

	for (const fence of fences) {
		// Convert fence height from feet to inches
		const heightInches = fence.heightFeet * 12;

		// Calculate shadow length (capped)
		let shadowLength = heightInches / Math.tan(altitudeRad);
		shadowLength = Math.min(shadowLength, MAX_SHADOW_LENGTH);

		// Calculate shadow offset (where the shadow tip lands)
		const offsetX = Math.sin(angleRad) * shadowLength;
		const offsetY = -Math.cos(angleRad) * shadowLength; // Negative because Y increases downward

		// Process each segment (pair of adjacent vertices)
		// Fences are thin walls - ALL segments cast shadows (no interior/exterior concept)
		// The shadow offset direction already ensures shadows fall away from the sun
		for (let i = 0; i < fence.vertices.length - 1; i++) {
			const start = fence.vertices[i];
			const end = fence.vertices[i + 1];

			// Create quadrilateral: base segment + projected shadow endpoints
			const quadrilateral = {
				p1: { x: start.x, y: start.y }, // base start
				p2: { x: end.x, y: end.y }, // base end
				p3: { x: end.x + offsetX, y: end.y + offsetY }, // shadow end
				p4: { x: start.x + offsetX, y: start.y + offsetY } // shadow start
			};

			shadows.push({
				fenceId: fence.id,
				segmentIndex: i,
				quadrilateral,
				shadowLength,
				shadowAngle
			});
		}
	}

	return shadows;
}

// ============================================================================
// Raised Bed Shadow Calculations
// ============================================================================

export interface BedForShadow {
	id: string;
	x: number; // top-left corner in field inches
	y: number;
	widthInches: number;
	heightInches: number; // depth of bed (N-S dimension)
	raisedBedHeightFeet: number; // wall height
	rotation?: number; // degrees clockwise from North
	shape?: 'rectangle' | 'circle'; // defaults to rectangle
}

/**
 * Calculate shadows for raised bed walls.
 * Only the sun-facing edge casts a visible shadow into the garden.
 * Circular beds use polygonal approximation for smooth curved shadows.
 *
 * @param beds - Array of beds with dimensions and raised height
 * @param sunPosition - Current sun altitude and azimuth
 * @returns Array of shadow data (uses FenceShadowData format for compatibility)
 */
export function calculateBedShadows(
	beds: BedForShadow[],
	sunPosition: SunPosition
): FenceShadowData[] {
	if (sunPosition.isNight || sunPosition.altitude < MIN_SHADOW_RENDER_ALTITUDE) {
		return [];
	}

	const shadows: FenceShadowData[] = [];

	// Shadow direction is opposite of sun azimuth
	const shadowAngle = (sunPosition.azimuth + 180) % 360;
	const angleRad = (shadowAngle * Math.PI) / 180;
	const altitudeRad = (sunPosition.altitude * Math.PI) / 180;

	for (const bed of beds) {
		if (bed.raisedBedHeightFeet <= 0) continue;

		// Convert bed height from feet to inches
		const heightInches = bed.raisedBedHeightFeet * 12;

		// Calculate shadow length (capped)
		let shadowLength = heightInches / Math.tan(altitudeRad);
		shadowLength = Math.min(shadowLength, MAX_SHADOW_LENGTH);

		// Calculate shadow offset
		const offsetX = Math.sin(angleRad) * shadowLength;
		const offsetY = -Math.cos(angleRad) * shadowLength;

		// Handle circular beds with polygonal approximation
		if (bed.shape === 'circle') {
			const circleShadows = calculateCircleBedShadows(
				bed,
				sunPosition,
				shadowLength,
				shadowAngle,
				offsetX,
				offsetY
			);
			shadows.push(...circleShadows);
			continue;
		}

		// Rectangular bed logic
		// Get the four corners of the bed (unrotated)
		const corners = [
			{ x: bed.x, y: bed.y }, // top-left (NW)
			{ x: bed.x + bed.widthInches, y: bed.y }, // top-right (NE)
			{ x: bed.x + bed.widthInches, y: bed.y + bed.heightInches }, // bottom-right (SE)
			{ x: bed.x, y: bed.y + bed.heightInches } // bottom-left (SW)
		];

		// Bed center (used as interior point for sun-facing detection)
		const centerX = bed.x + bed.widthInches / 2;
		const centerY = bed.y + bed.heightInches / 2;

		// Apply rotation if present (rotate around bed center)
		if (bed.rotation && bed.rotation !== 0) {
			const rotRad = (bed.rotation * Math.PI) / 180;
			const cosR = Math.cos(rotRad);
			const sinR = Math.sin(rotRad);

			for (let i = 0; i < corners.length; i++) {
				const dx = corners[i].x - centerX;
				const dy = corners[i].y - centerY;
				corners[i] = {
					x: centerX + dx * cosR - dy * sinR,
					y: centerY + dx * sinR + dy * cosR
				};
			}
		}

		// Define all four edges
		const edges = [
			{ start: corners[0], end: corners[1] }, // top edge
			{ start: corners[1], end: corners[2] }, // right edge
			{ start: corners[2], end: corners[3] }, // bottom edge
			{ start: corners[3], end: corners[0] } // left edge
		];

		// Interior point for sun-facing detection (bed center)
		const interiorPoint = { x: centerX, y: centerY };

		// Create shadow quadrilaterals for sun-facing edges only
		let segmentIndex = 0;
		for (const edge of edges) {
			// Use unified sun-facing detection
			if (!isSegmentSunFacing(edge.start, edge.end, sunPosition.azimuth, interiorPoint)) {
				continue; // Skip edges facing away from sun
			}

			const quadrilateral = {
				p1: { x: edge.start.x, y: edge.start.y },
				p2: { x: edge.end.x, y: edge.end.y },
				p3: { x: edge.end.x + offsetX, y: edge.end.y + offsetY },
				p4: { x: edge.start.x + offsetX, y: edge.start.y + offsetY }
			};

			shadows.push({
				fenceId: bed.id,
				segmentIndex: segmentIndex++,
				quadrilateral,
				shadowLength,
				shadowAngle
			});
		}
	}

	return shadows;
}

// Number of segments to approximate a circle (higher = smoother curves)
const CIRCLE_SEGMENTS = 24;

/**
 * Calculate shadows for a circular raised bed using polygonal approximation.
 * The circle is divided into segments, and each sun-facing segment casts a quadrilateral shadow.
 * Uses the unified isSegmentSunFacing() helper with circle center as interior point.
 */
function calculateCircleBedShadows(
	bed: BedForShadow,
	sunPosition: SunPosition,
	shadowLength: number,
	shadowAngle: number,
	offsetX: number,
	offsetY: number
): FenceShadowData[] {
	const shadows: FenceShadowData[] = [];

	// Circle center and radius (widthInches is diameter)
	const radius = bed.widthInches / 2;
	const centerX = bed.x + radius;
	const centerY = bed.y + radius;

	// Interior point for sun-facing detection (circle center)
	const interiorPoint = { x: centerX, y: centerY };

	// Generate circle vertices (counter-clockwise from angle 0)
	const vertices: Array<{ x: number; y: number }> = [];
	for (let i = 0; i < CIRCLE_SEGMENTS; i++) {
		const angle = (i / CIRCLE_SEGMENTS) * 2 * Math.PI;
		vertices.push({
			x: centerX + Math.cos(angle) * radius,
			y: centerY - Math.sin(angle) * radius // Negative because SVG Y increases downward
		});
	}

	// For each segment, check if it's sun-facing using unified helper
	for (let i = 0; i < CIRCLE_SEGMENTS; i++) {
		const v1 = vertices[i];
		const v2 = vertices[(i + 1) % CIRCLE_SEGMENTS];

		// Use unified sun-facing detection
		if (!isSegmentSunFacing(v1, v2, sunPosition.azimuth, interiorPoint)) {
			continue; // Skip segments facing away from sun
		}

		const quadrilateral = {
			p1: { x: v1.x, y: v1.y },
			p2: { x: v2.x, y: v2.y },
			p3: { x: v2.x + offsetX, y: v2.y + offsetY },
			p4: { x: v1.x + offsetX, y: v1.y + offsetY }
		};

		shadows.push({
			fenceId: bed.id,
			segmentIndex: i,
			quadrilateral,
			shadowLength,
			shadowAngle
		});
	}

	return shadows;
}

/**
 * Convert beds to structure format for shade detection.
 */
export function bedsToStructures(beds: BedForShadow[]): StructureForShading[] {
	return beds
		.filter(bed => bed.raisedBedHeightFeet > 0)
		.map(bed => {
			let segments: Array<{ start: { x: number; y: number }; end: { x: number; y: number } }>;

			if (bed.shape === 'circle') {
				// Generate segments around the circle perimeter
				const radius = bed.widthInches / 2;
				const centerX = bed.x + radius;
				const centerY = bed.y + radius;

				segments = [];
				for (let i = 0; i < CIRCLE_SEGMENTS; i++) {
					const angle1 = (i / CIRCLE_SEGMENTS) * 2 * Math.PI;
					const angle2 = ((i + 1) / CIRCLE_SEGMENTS) * 2 * Math.PI;
					segments.push({
						start: {
							x: centerX + Math.cos(angle1) * radius,
							y: centerY - Math.sin(angle1) * radius
						},
						end: {
							x: centerX + Math.cos(angle2) * radius,
							y: centerY - Math.sin(angle2) * radius
						}
					});
				}
			} else {
				// Rectangular bed: get the four corners
				const corners = [
					{ x: bed.x, y: bed.y },
					{ x: bed.x + bed.widthInches, y: bed.y },
					{ x: bed.x + bed.widthInches, y: bed.y + bed.heightInches },
					{ x: bed.x, y: bed.y + bed.heightInches }
				];

				// Apply rotation if present
				if (bed.rotation && bed.rotation !== 0) {
					const centerX = bed.x + bed.widthInches / 2;
					const centerY = bed.y + bed.heightInches / 2;
					const rotRad = (bed.rotation * Math.PI) / 180;
					const cosR = Math.cos(rotRad);
					const sinR = Math.sin(rotRad);

					for (let i = 0; i < corners.length; i++) {
						const dx = corners[i].x - centerX;
						const dy = corners[i].y - centerY;
						corners[i] = {
							x: centerX + dx * cosR - dy * sinR,
							y: centerY + dx * sinR + dy * cosR
						};
					}
				}

				// Create segments for all four edges
				segments = [
					{ start: corners[0], end: corners[1] },
					{ start: corners[1], end: corners[2] },
					{ start: corners[2], end: corners[3] },
					{ start: corners[3], end: corners[0] }
				];
			}

			return {
				type: 'bed' as const,
				id: bed.id,
				segments,
				heightInches: bed.raisedBedHeightFeet * 12
			};
		});
}

/**
 * Convert fences to structure format for shade detection.
 */
export function fencesToStructures(fences: FenceForShadow[]): StructureForShading[] {
	return fences.map(fence => {
		const segments: Array<{ start: { x: number; y: number }; end: { x: number; y: number } }> = [];

		for (let i = 0; i < fence.vertices.length - 1; i++) {
			segments.push({
				start: fence.vertices[i],
				end: fence.vertices[i + 1]
			});
		}

		return {
			type: 'fence' as const,
			id: fence.id,
			segments,
			heightInches: fence.heightFeet * 12
		};
	});
}
