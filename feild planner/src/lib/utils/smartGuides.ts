/**
 * Smart Guides - Figma/Sketch-style alignment guides
 *
 * Detects alignment between objects and provides:
 * 1. Snap correction when within threshold
 * 2. Visual guide line positions
 * 3. Distance measurements to nearby objects
 */

import type { Bed, PlacedPlant } from '$lib/types';
import { getBedDimensionsInInches } from '$lib/types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BoundingBox {
	id: string;
	left: number; // field inches
	right: number;
	top: number;
	bottom: number;
	centerX: number;
	centerY: number;
	rotation?: number; // degrees, clockwise from North
}

export type AlignmentType = 'left' | 'right' | 'top' | 'bottom' | 'centerX' | 'centerY';

export interface AlignmentGuide {
	type: 'vertical' | 'horizontal';
	position: number; // field inches
	alignmentType: AlignmentType;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rotated Edge Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Point {
	x: number;
	y: number;
}

export interface RotatedEdge {
	id: string; // bed id
	start: Point;
	end: Point;
	angle: number; // normalized angle in degrees (0-180)
	edgeType: 'top' | 'right' | 'bottom' | 'left'; // relative to unrotated bed
}

export interface DiagonalGuide {
	start: Point;
	end: Point;
	angle: number;
}

export interface DistanceIndicator {
	axis: 'x' | 'y';
	from: number; // field inches (start of gap)
	to: number; // field inches (end of gap)
	labelPosition: number; // perpendicular position for label placement
	distance: number; // gap in inches
}

export interface SmartGuideResult {
	snappedX: number;
	snappedY: number;
	guides: AlignmentGuide[];
	diagonalGuides: DiagonalGuide[];
	distances: DistanceIndicator[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Bounding Box Calculation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get bounding box for a bed in field coordinates
 */
export function getBedBoundingBox(bed: Bed): BoundingBox {
	const dims = getBedDimensionsInInches(bed);
	const left = bed.x;
	const top = bed.y;
	const right = bed.x + dims.width;
	const bottom = bed.y + dims.height;

	return {
		id: bed._id,
		left,
		right,
		top,
		bottom,
		centerX: (left + right) / 2,
		centerY: (top + bottom) / 2,
		rotation: bed.rotation
	};
}

/**
 * Get bounding box for a plant in field coordinates
 * Plants are circles, so we use their spacing radius for the bounding box
 */
export function getPlantBoundingBox(
	plant: PlacedPlant,
	bed: Bed
): BoundingBox {
	// Convert plant's bed-local coords to field coords
	const fieldX = plant.x + bed.x;
	const fieldY = plant.y + bed.y;
	const radius = plant.spacingMin / 2;

	return {
		id: plant._id,
		left: fieldX - radius,
		right: fieldX + radius,
		top: fieldY - radius,
		bottom: fieldY + radius,
		centerX: fieldX,
		centerY: fieldY
	};
}

/**
 * Create a bounding box from raw position and dimensions
 */
export function createBoundingBox(
	id: string,
	x: number,
	y: number,
	width: number,
	height: number,
	rotation?: number
): BoundingBox {
	return {
		id,
		left: x,
		right: x + width,
		top: y,
		bottom: y + height,
		centerX: x + width / 2,
		centerY: y + height / 2,
		rotation
	};
}

/**
 * Create bounding box for a circular object (plant)
 */
export function createCircleBoundingBox(
	id: string,
	centerX: number,
	centerY: number,
	radius: number
): BoundingBox {
	return {
		id,
		left: centerX - radius,
		right: centerX + radius,
		top: centerY - radius,
		bottom: centerY + radius,
		centerX,
		centerY
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Rotated Geometry Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rotate a point around a center by given degrees (clockwise)
 */
function rotatePoint(point: Point, center: Point, degrees: number): Point {
	const radians = (degrees * Math.PI) / 180;
	const cos = Math.cos(radians);
	const sin = Math.sin(radians);
	const dx = point.x - center.x;
	const dy = point.y - center.y;
	return {
		x: center.x + dx * cos - dy * sin,
		y: center.y + dx * sin + dy * cos
	};
}

/**
 * Normalize an angle to 0-180 range (edges at 0° and 180° are parallel)
 */
function normalizeAngle(degrees: number): number {
	let angle = degrees % 180;
	if (angle < 0) angle += 180;
	return angle;
}

/**
 * Check if two angles are approximately equal (within tolerance)
 */
function anglesMatch(angle1: number, angle2: number, tolerance: number = 1): boolean {
	const diff = Math.abs(normalizeAngle(angle1) - normalizeAngle(angle2));
	return diff <= tolerance || diff >= 180 - tolerance;
}

/**
 * Get the 4 corners of a rotated rectangular bounding box
 */
export function getRotatedCorners(box: BoundingBox): Point[] {
	const rotation = box.rotation ?? 0;
	if (rotation === 0) {
		// No rotation, return axis-aligned corners
		return [
			{ x: box.left, y: box.top }, // top-left
			{ x: box.right, y: box.top }, // top-right
			{ x: box.right, y: box.bottom }, // bottom-right
			{ x: box.left, y: box.bottom } // bottom-left
		];
	}

	const center: Point = { x: box.centerX, y: box.centerY };
	const halfWidth = (box.right - box.left) / 2;
	const halfHeight = (box.bottom - box.top) / 2;

	// Unrotated corners relative to center
	const corners: Point[] = [
		{ x: center.x - halfWidth, y: center.y - halfHeight }, // top-left
		{ x: center.x + halfWidth, y: center.y - halfHeight }, // top-right
		{ x: center.x + halfWidth, y: center.y + halfHeight }, // bottom-right
		{ x: center.x - halfWidth, y: center.y + halfHeight } // bottom-left
	];

	// Rotate each corner around center
	return corners.map((corner) => rotatePoint(corner, center, rotation));
}

/**
 * Get the 4 edges of a rotated bounding box with their angles
 */
export function getRotatedEdges(box: BoundingBox): RotatedEdge[] {
	const corners = getRotatedCorners(box);
	const rotation = box.rotation ?? 0;

	// Edge types in order: top, right, bottom, left
	const edgeTypes: Array<'top' | 'right' | 'bottom' | 'left'> = ['top', 'right', 'bottom', 'left'];

	return [
		{
			id: box.id,
			start: corners[0],
			end: corners[1],
			angle: normalizeAngle(rotation), // top edge
			edgeType: edgeTypes[0]
		},
		{
			id: box.id,
			start: corners[1],
			end: corners[2],
			angle: normalizeAngle(rotation + 90), // right edge
			edgeType: edgeTypes[1]
		},
		{
			id: box.id,
			start: corners[2],
			end: corners[3],
			angle: normalizeAngle(rotation + 180), // bottom edge (parallel to top)
			edgeType: edgeTypes[2]
		},
		{
			id: box.id,
			start: corners[3],
			end: corners[0],
			angle: normalizeAngle(rotation + 270), // left edge (parallel to right)
			edgeType: edgeTypes[3]
		}
	];
}

/**
 * Calculate perpendicular distance from a point to a line defined by two points
 */
function pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
	const dx = lineEnd.x - lineStart.x;
	const dy = lineEnd.y - lineStart.y;
	const length = Math.sqrt(dx * dx + dy * dy);
	if (length === 0) return Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2);

	// Perpendicular distance formula
	return Math.abs(dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x) / length;
}

/**
 * Get the perpendicular offset to move an edge onto another edge's line
 * Returns the offset vector to apply to snap the dragging edge to the target edge
 */
function getEdgeAlignmentOffset(draggingEdge: RotatedEdge, targetEdge: RotatedEdge): Point {
	// Use midpoint of dragging edge
	const dragMid: Point = {
		x: (draggingEdge.start.x + draggingEdge.end.x) / 2,
		y: (draggingEdge.start.y + draggingEdge.end.y) / 2
	};

	// Direction vector of target edge (normalized)
	const dx = targetEdge.end.x - targetEdge.start.x;
	const dy = targetEdge.end.y - targetEdge.start.y;
	const length = Math.sqrt(dx * dx + dy * dy);
	if (length === 0) return { x: 0, y: 0 };

	// Perpendicular direction (pointing "outward" from the line)
	const perpX = -dy / length;
	const perpY = dx / length;

	// Signed distance from drag midpoint to target line
	const toLineX = targetEdge.start.x - dragMid.x;
	const toLineY = targetEdge.start.y - dragMid.y;
	const signedDist = toLineX * perpX + toLineY * perpY;

	return {
		x: perpX * signedDist,
		y: perpY * signedDist
	};
}

interface RotatedAlignmentMatch {
	draggingEdge: RotatedEdge;
	targetEdge: RotatedEdge;
	distance: number; // perpendicular distance
	offset: Point; // correction to apply
}

/**
 * Find alignment matches between rotated edges with the same angle
 */
function findRotatedEdgeAlignments(
	draggingBox: BoundingBox,
	targetBox: BoundingBox,
	threshold: number
): RotatedAlignmentMatch[] {
	// Only check if both have rotation and rotation is not axis-aligned
	const dragRotation = draggingBox.rotation ?? 0;
	const targetRotation = targetBox.rotation ?? 0;

	// Skip if both are axis-aligned (handled by regular alignment)
	if (dragRotation % 90 === 0 && targetRotation % 90 === 0) {
		return [];
	}

	// Skip if angles don't match
	if (!anglesMatch(dragRotation, targetRotation)) {
		return [];
	}

	const draggingEdges = getRotatedEdges(draggingBox);
	const targetEdges = getRotatedEdges(targetBox);
	const matches: RotatedAlignmentMatch[] = [];

	for (const dragEdge of draggingEdges) {
		for (const targetEdge of targetEdges) {
			// Check if edges are parallel (same angle)
			if (!anglesMatch(dragEdge.angle, targetEdge.angle)) continue;

			// Calculate perpendicular distance from dragging edge midpoint to target edge line
			const dragMid: Point = {
				x: (dragEdge.start.x + dragEdge.end.x) / 2,
				y: (dragEdge.start.y + dragEdge.end.y) / 2
			};
			const distance = pointToLineDistance(dragMid, targetEdge.start, targetEdge.end);

			if (distance <= threshold) {
				const offset = getEdgeAlignmentOffset(dragEdge, targetEdge);
				matches.push({
					draggingEdge: dragEdge,
					targetEdge: targetEdge,
					distance,
					offset
				});
			}
		}
	}

	return matches;
}

/**
 * Create a diagonal guide line that extends through both aligned edges
 */
function createDiagonalGuide(dragEdge: RotatedEdge, targetEdge: RotatedEdge): DiagonalGuide {
	// Find the extent of both edges combined
	const allPoints = [dragEdge.start, dragEdge.end, targetEdge.start, targetEdge.end];

	// Project all points onto the edge direction to find min/max extent
	const dx = targetEdge.end.x - targetEdge.start.x;
	const dy = targetEdge.end.y - targetEdge.start.y;
	const length = Math.sqrt(dx * dx + dy * dy);
	if (length === 0) {
		return { start: targetEdge.start, end: targetEdge.end, angle: targetEdge.angle };
	}

	const dirX = dx / length;
	const dirY = dy / length;

	// Find the extent along the direction
	let minT = Infinity;
	let maxT = -Infinity;
	let minPoint = targetEdge.start;
	let maxPoint = targetEdge.end;

	for (const point of allPoints) {
		const t = (point.x - targetEdge.start.x) * dirX + (point.y - targetEdge.start.y) * dirY;
		if (t < minT) {
			minT = t;
			minPoint = { x: targetEdge.start.x + t * dirX, y: targetEdge.start.y + t * dirY };
		}
		if (t > maxT) {
			maxT = t;
			maxPoint = { x: targetEdge.start.x + t * dirX, y: targetEdge.start.y + t * dirY };
		}
	}

	// Extend the line slightly beyond the edges for visual clarity
	const extension = 24; // 2 feet extension
	return {
		start: {
			x: minPoint.x - dirX * extension,
			y: minPoint.y - dirY * extension
		},
		end: {
			x: maxPoint.x + dirX * extension,
			y: maxPoint.y + dirY * extension
		},
		angle: targetEdge.angle
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Alignment Detection
// ─────────────────────────────────────────────────────────────────────────────

interface AlignmentMatch {
	type: AlignmentType;
	targetValue: number; // The value to snap to
	distance: number; // How far away we are
}

/**
 * Find alignment matches for vertical lines (left, right, centerX)
 */
function findVerticalAlignments(
	draggingBox: BoundingBox,
	targetBox: BoundingBox,
	threshold: number
): AlignmentMatch[] {
	const matches: AlignmentMatch[] = [];

	// Check each vertical alignment point of dragging object against target
	const dragPoints = [
		{ type: 'left' as const, value: draggingBox.left },
		{ type: 'right' as const, value: draggingBox.right },
		{ type: 'centerX' as const, value: draggingBox.centerX }
	];

	const targetPoints = [
		{ type: 'left' as const, value: targetBox.left },
		{ type: 'right' as const, value: targetBox.right },
		{ type: 'centerX' as const, value: targetBox.centerX }
	];

	for (const drag of dragPoints) {
		for (const target of targetPoints) {
			const distance = Math.abs(drag.value - target.value);
			if (distance <= threshold) {
				matches.push({
					type: drag.type,
					targetValue: target.value,
					distance
				});
			}
		}
	}

	return matches;
}

/**
 * Find alignment matches for horizontal lines (top, bottom, centerY)
 */
function findHorizontalAlignments(
	draggingBox: BoundingBox,
	targetBox: BoundingBox,
	threshold: number
): AlignmentMatch[] {
	const matches: AlignmentMatch[] = [];

	const dragPoints = [
		{ type: 'top' as const, value: draggingBox.top },
		{ type: 'bottom' as const, value: draggingBox.bottom },
		{ type: 'centerY' as const, value: draggingBox.centerY }
	];

	const targetPoints = [
		{ type: 'top' as const, value: targetBox.top },
		{ type: 'bottom' as const, value: targetBox.bottom },
		{ type: 'centerY' as const, value: targetBox.centerY }
	];

	for (const drag of dragPoints) {
		for (const target of targetPoints) {
			const distance = Math.abs(drag.value - target.value);
			if (distance <= threshold) {
				matches.push({
					type: drag.type,
					targetValue: target.value,
					distance
				});
			}
		}
	}

	return matches;
}

// ─────────────────────────────────────────────────────────────────────────────
// Distance Calculation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate horizontal distance between two boxes (if they overlap vertically)
 */
function calculateHorizontalDistance(
	draggingBox: BoundingBox,
	targetBox: BoundingBox
): DistanceIndicator | null {
	// Check if boxes overlap vertically (share some Y range)
	const overlapTop = Math.max(draggingBox.top, targetBox.top);
	const overlapBottom = Math.min(draggingBox.bottom, targetBox.bottom);
	if (overlapTop >= overlapBottom) return null; // No vertical overlap

	// Determine horizontal gap
	let from: number, to: number;
	if (draggingBox.right < targetBox.left) {
		// Dragging is to the left of target
		from = draggingBox.right;
		to = targetBox.left;
	} else if (draggingBox.left > targetBox.right) {
		// Dragging is to the right of target
		from = targetBox.right;
		to = draggingBox.left;
	} else {
		// Boxes overlap horizontally, no gap
		return null;
	}

	const distance = to - from;
	if (distance <= 0) return null;

	return {
		axis: 'x',
		from,
		to,
		labelPosition: (overlapTop + overlapBottom) / 2,
		distance
	};
}

/**
 * Calculate vertical distance between two boxes (if they overlap horizontally)
 */
function calculateVerticalDistance(
	draggingBox: BoundingBox,
	targetBox: BoundingBox
): DistanceIndicator | null {
	// Check if boxes overlap horizontally (share some X range)
	const overlapLeft = Math.max(draggingBox.left, targetBox.left);
	const overlapRight = Math.min(draggingBox.right, targetBox.right);
	if (overlapLeft >= overlapRight) return null; // No horizontal overlap

	// Determine vertical gap
	let from: number, to: number;
	if (draggingBox.bottom < targetBox.top) {
		// Dragging is above target
		from = draggingBox.bottom;
		to = targetBox.top;
	} else if (draggingBox.top > targetBox.bottom) {
		// Dragging is below target
		from = targetBox.bottom;
		to = draggingBox.top;
	} else {
		// Boxes overlap vertically, no gap
		return null;
	}

	const distance = to - from;
	if (distance <= 0) return null;

	return {
		axis: 'y',
		from,
		to,
		labelPosition: (overlapLeft + overlapRight) / 2,
		distance
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Entry Point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate smart guide snap and visual feedback
 *
 * @param draggingBox - Bounding box of the object being dragged (at proposed position)
 * @param allBoxes - All other objects' bounding boxes
 * @param thresholdInches - Snap threshold in field inches
 * @returns Snapped position, guide lines, and distance indicators
 */
export function calculateSmartGuides(
	draggingBox: BoundingBox,
	allBoxes: BoundingBox[],
	thresholdInches: number
): SmartGuideResult {
	const guides: AlignmentGuide[] = [];
	const diagonalGuides: DiagonalGuide[] = [];
	let snapX = 0; // Accumulated X snap correction
	let snapY = 0; // Accumulated Y snap correction
	let bestVerticalMatch: AlignmentMatch | null = null;
	let bestHorizontalMatch: AlignmentMatch | null = null;
	let bestRotatedMatch: RotatedAlignmentMatch | null = null;

	// Find best alignment matches across all target objects
	for (const targetBox of allBoxes) {
		if (targetBox.id === draggingBox.id) continue;

		// Vertical alignments (left, right, centerX)
		const vertMatches = findVerticalAlignments(draggingBox, targetBox, thresholdInches);
		for (const match of vertMatches) {
			if (!bestVerticalMatch || match.distance < bestVerticalMatch.distance) {
				bestVerticalMatch = match;
			}
		}

		// Horizontal alignments (top, bottom, centerY)
		const horizMatches = findHorizontalAlignments(draggingBox, targetBox, thresholdInches);
		for (const match of horizMatches) {
			if (!bestHorizontalMatch || match.distance < bestHorizontalMatch.distance) {
				bestHorizontalMatch = match;
			}
		}

		// Rotated edge alignments (for non-axis-aligned beds with same rotation)
		const rotatedMatches = findRotatedEdgeAlignments(draggingBox, targetBox, thresholdInches);
		for (const match of rotatedMatches) {
			if (!bestRotatedMatch || match.distance < bestRotatedMatch.distance) {
				bestRotatedMatch = match;
			}
		}
	}

	// Check if rotated alignment is better than axis-aligned alignments
	// Rotated alignment takes precedence if it's closer than both axis-aligned alignments
	const useRotatedAlignment =
		bestRotatedMatch &&
		(!bestVerticalMatch || bestRotatedMatch.distance <= bestVerticalMatch.distance) &&
		(!bestHorizontalMatch || bestRotatedMatch.distance <= bestHorizontalMatch.distance);

	if (useRotatedAlignment && bestRotatedMatch) {
		// Use rotated edge alignment - apply the 2D offset
		snapX = bestRotatedMatch.offset.x;
		snapY = bestRotatedMatch.offset.y;

		// Create diagonal guide line
		const diagonalGuide = createDiagonalGuide(
			bestRotatedMatch.draggingEdge,
			bestRotatedMatch.targetEdge
		);
		diagonalGuides.push(diagonalGuide);
	} else {
		// Use axis-aligned alignments
		if (bestVerticalMatch) {
			// Calculate snap correction based on which edge aligned
			switch (bestVerticalMatch.type) {
				case 'left':
					snapX = bestVerticalMatch.targetValue - draggingBox.left;
					break;
				case 'right':
					snapX = bestVerticalMatch.targetValue - draggingBox.right;
					break;
				case 'centerX':
					snapX = bestVerticalMatch.targetValue - draggingBox.centerX;
					break;
			}
			guides.push({
				type: 'vertical',
				position: bestVerticalMatch.targetValue,
				alignmentType: bestVerticalMatch.type
			});
		}

		if (bestHorizontalMatch) {
			switch (bestHorizontalMatch.type) {
				case 'top':
					snapY = bestHorizontalMatch.targetValue - draggingBox.top;
					break;
				case 'bottom':
					snapY = bestHorizontalMatch.targetValue - draggingBox.bottom;
					break;
				case 'centerY':
					snapY = bestHorizontalMatch.targetValue - draggingBox.centerY;
					break;
			}
			guides.push({
				type: 'horizontal',
				position: bestHorizontalMatch.targetValue,
				alignmentType: bestHorizontalMatch.type
			});
		}
	}

	// Create snapped bounding box for distance calculations
	const snappedBox: BoundingBox = {
		...draggingBox,
		left: draggingBox.left + snapX,
		right: draggingBox.right + snapX,
		top: draggingBox.top + snapY,
		bottom: draggingBox.bottom + snapY,
		centerX: draggingBox.centerX + snapX,
		centerY: draggingBox.centerY + snapY
	};

	// Calculate distances to nearby objects
	const distances: DistanceIndicator[] = [];
	for (const targetBox of allBoxes) {
		if (targetBox.id === draggingBox.id) continue;

		const hDist = calculateHorizontalDistance(snappedBox, targetBox);
		if (hDist && hDist.distance < 120) {
			// Only show distances < 10 feet
			distances.push(hDist);
		}

		const vDist = calculateVerticalDistance(snappedBox, targetBox);
		if (vDist && vDist.distance < 120) {
			distances.push(vDist);
		}
	}

	// Keep only the closest distance per axis
	const closestHorizontal = distances
		.filter((d) => d.axis === 'x')
		.sort((a, b) => a.distance - b.distance)[0];
	const closestVertical = distances
		.filter((d) => d.axis === 'y')
		.sort((a, b) => a.distance - b.distance)[0];

	const filteredDistances: DistanceIndicator[] = [];
	if (closestHorizontal) filteredDistances.push(closestHorizontal);
	if (closestVertical) filteredDistances.push(closestVertical);

	return {
		snappedX: draggingBox.left + snapX, // Return top-left X after snap
		snappedY: draggingBox.top + snapY, // Return top-left Y after snap
		guides,
		diagonalGuides,
		distances: filteredDistances
	};
}

/**
 * Format distance for display (converts inches to readable format)
 */
export function formatDistance(inches: number): string {
	if (inches >= 12) {
		const feet = Math.floor(inches / 12);
		const remainingInches = Math.round(inches % 12);
		if (remainingInches === 0) {
			return `${feet}'`;
		}
		return `${feet}' ${remainingInches}"`;
	}
	return `${Math.round(inches)}"`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Selection Distance (for 2-object selection)
// ─────────────────────────────────────────────────────────────────────────────

export interface SelectionDistanceResult {
	distance: number; // edge-to-edge distance in inches
	axis: 'x' | 'y'; // primary axis of separation
	// Line endpoints in field coordinates
	lineStart: { x: number; y: number };
	lineEnd: { x: number; y: number };
	// Direction vector (normalized) from box1 to box2
	direction: { x: number; y: number };
}

/**
 * Calculate edge-to-edge distance between two bounding boxes
 * Returns the shortest gap distance and the connection line for rendering
 */
export function calculateSelectionDistance(
	box1: BoundingBox,
	box2: BoundingBox
): SelectionDistanceResult | null {
	// Calculate horizontal and vertical gaps
	let hGap = 0;
	let vGap = 0;

	// Horizontal gap
	if (box1.right < box2.left) {
		hGap = box2.left - box1.right;
	} else if (box2.right < box1.left) {
		hGap = box1.left - box2.right;
	}

	// Vertical gap
	if (box1.bottom < box2.top) {
		vGap = box2.top - box1.bottom;
	} else if (box2.bottom < box1.top) {
		vGap = box1.top - box2.bottom;
	}

	// If boxes overlap in both dimensions, no gap
	if (hGap === 0 && vGap === 0) {
		return null;
	}

	// Determine primary axis based on larger gap
	const axis: 'x' | 'y' = hGap >= vGap ? 'x' : 'y';
	const distance = axis === 'x' ? hGap : vGap;

	// Calculate connection line endpoints
	let lineStart: { x: number; y: number };
	let lineEnd: { x: number; y: number };
	let direction: { x: number; y: number };

	if (axis === 'x') {
		// Horizontal separation - connect at vertical center of overlap
		const overlapTop = Math.max(box1.top, box2.top);
		const overlapBottom = Math.min(box1.bottom, box2.bottom);
		const connectY = overlapTop < overlapBottom
			? (overlapTop + overlapBottom) / 2
			: (box1.centerY + box2.centerY) / 2;

		if (box1.right < box2.left) {
			lineStart = { x: box1.right, y: connectY };
			lineEnd = { x: box2.left, y: connectY };
			direction = { x: 1, y: 0 };
		} else {
			lineStart = { x: box2.right, y: connectY };
			lineEnd = { x: box1.left, y: connectY };
			direction = { x: -1, y: 0 };
		}
	} else {
		// Vertical separation - connect at horizontal center of overlap
		const overlapLeft = Math.max(box1.left, box2.left);
		const overlapRight = Math.min(box1.right, box2.right);
		const connectX = overlapLeft < overlapRight
			? (overlapLeft + overlapRight) / 2
			: (box1.centerX + box2.centerX) / 2;

		if (box1.bottom < box2.top) {
			lineStart = { x: connectX, y: box1.bottom };
			lineEnd = { x: connectX, y: box2.top };
			direction = { x: 0, y: 1 };
		} else {
			lineStart = { x: connectX, y: box2.bottom };
			lineEnd = { x: connectX, y: box1.top };
			direction = { x: 0, y: -1 };
		}
	}

	return {
		distance,
		axis,
		lineStart,
		lineEnd,
		direction
	};
}
