import type { Bed, CanvasState } from '$lib/types';
import { getBedDimensionsInInches } from '$lib/types';

/**
 * Convert canvas pixels to field inches
 */
export function canvasToField(
	canvasX: number,
	canvasY: number,
	state: CanvasState
): { x: number; y: number } {
	const scale = state.pixelsPerInch * state.zoom;
	return {
		x: (canvasX - state.panX) / scale,
		y: (canvasY - state.panY) / scale
	};
}

/**
 * Convert field inches to canvas pixels
 */
export function fieldToCanvas(
	fieldX: number,
	fieldY: number,
	state: CanvasState
): { x: number; y: number } {
	const scale = state.pixelsPerInch * state.zoom;
	return {
		x: fieldX * scale + state.panX,
		y: fieldY * scale + state.panY
	};
}

/**
 * Convert field inches to bed-local inches
 */
export function fieldToBedLocal(fieldX: number, fieldY: number, bed: Bed): { x: number; y: number } {
	return {
		x: fieldX - bed.x,
		y: fieldY - bed.y
	};
}

/**
 * Convert bed-local inches to field inches
 */
export function bedLocalToField(localX: number, localY: number, bed: Bed): { x: number; y: number } {
	return {
		x: localX + bed.x,
		y: localY + bed.y
	};
}

/**
 * Check if point (in bed-local inches) is inside bed
 */
export function isInsideBed(localX: number, localY: number, bed: Bed): boolean {
	const dims = getBedDimensionsInInches(bed);

	if (bed.shape === 'rectangle') {
		return localX >= 0 && localX <= dims.width && localY >= 0 && localY <= dims.height;
	} else {
		// Circle: center is at (radius, radius) in local coords
		const radius = dims.width / 2;
		const dx = localX - radius;
		const dy = localY - radius;
		return dx * dx + dy * dy <= radius * radius;
	}
}

/**
 * Constrain a point to be inside a bed
 */
export function constrainToBed(
	localX: number,
	localY: number,
	bed: Bed,
	padding: number = 0
): { x: number; y: number } {
	const dims = getBedDimensionsInInches(bed);

	if (bed.shape === 'rectangle') {
		return {
			x: Math.max(padding, Math.min(dims.width - padding, localX)),
			y: Math.max(padding, Math.min(dims.height - padding, localY))
		};
	} else {
		// Circle: constrain to circle boundary
		const radius = dims.width / 2 - padding;
		const centerX = dims.width / 2;
		const centerY = dims.width / 2;
		const dx = localX - centerX;
		const dy = localY - centerY;
		const dist = Math.sqrt(dx * dx + dy * dy);

		if (dist <= radius) {
			return { x: localX, y: localY };
		}

		// Project onto circle boundary
		const scale = radius / dist;
		return {
			x: centerX + dx * scale,
			y: centerY + dy * scale
		};
	}
}
