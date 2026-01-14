/**
 * Grid snapping utilities for the Field Planner
 *
 * Coordinate system:
 * - Canvas internally uses inches
 * - Bed dimensions stored in feet
 * - Snap increments: 0 (off), 1 (inch), 12 (foot)
 */

export type SnapIncrement = 0 | 1 | 12;

/**
 * Snap a value to the nearest increment
 * @param value - Value to snap (in inches for positions)
 * @param increment - Snap increment (0 = no snapping)
 * @returns Snapped value
 */
export function snapToGrid(value: number, increment: SnapIncrement): number {
	if (increment === 0) return value;
	return Math.round(value / increment) * increment;
}

/**
 * Snap a position (x, y) to the grid
 * @param x - X position in inches
 * @param y - Y position in inches
 * @param increment - Snap increment
 * @returns Snapped position
 */
export function snapPositionToGrid(
	x: number,
	y: number,
	increment: SnapIncrement
): { x: number; y: number } {
	return {
		x: snapToGrid(x, increment),
		y: snapToGrid(y, increment)
	};
}

/**
 * Snap a feet value to the grid
 * Converts increment from inches to handle foot-based dimensions
 * @param feet - Value in feet
 * @param incrementInches - Snap increment in inches (0, 1, or 12)
 * @returns Snapped value in feet
 */
export function snapFeetToGrid(feet: number, incrementInches: SnapIncrement): number {
	if (incrementInches === 0) return feet;
	const inches = feet * 12;
	const snappedInches = snapToGrid(inches, incrementInches);
	return snappedInches / 12;
}

/**
 * Get a human-readable label for a snap increment
 */
export function getSnapLabel(increment: SnapIncrement): string {
	switch (increment) {
		case 0:
			return 'Off';
		case 1:
			return '1"';
		case 12:
			return "1'";
	}
}
