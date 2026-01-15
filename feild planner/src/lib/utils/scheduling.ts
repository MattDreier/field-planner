/**
 * Scheduling algorithm for calculating optimal planting dates.
 * Converts PlantingSchedule timing strategies into concrete dates based on
 * frost dates and soil temperature approximations.
 */

import type {
	PlantingTiming,
	PlantingSchedule,
	ScheduleContext,
	PlantingDates
} from '$lib/types';

/**
 * Soil temperature offset lookup table.
 * Maps minimum soil temperature (Fahrenheit) to days offset from last frost date.
 * Based on typical soil warming patterns in temperate climates.
 */
const SOIL_TEMP_OFFSETS: Record<number, number> = {
	50: -14, // 2 weeks before last frost
	55: -7, // 1 week before last frost
	60: 7, // 1 week after last frost
	65: 14, // 2 weeks after last frost
	70: 21, // 3 weeks after last frost
	75: 28 // 4 weeks after last frost
};

/**
 * Adds (or subtracts) a number of days from a date.
 *
 * @param date - The base date
 * @param days - Number of days to add (negative to subtract)
 * @returns A new Date instance with the adjusted date
 */
function addDays(date: Date, days: number): Date {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
}

/**
 * Formats a Date as an ISO date string (YYYY-MM-DD).
 *
 * @param date - The date to format
 * @returns ISO date string
 */
function formatDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Finds the closest soil temperature threshold and returns its offset.
 *
 * @param targetTemp - The minimum soil temperature required
 * @returns Days offset from last frost date
 */
function getSoilTempOffset(targetTemp: number): number {
	const thresholds = Object.keys(SOIL_TEMP_OFFSETS)
		.map(Number)
		.sort((a, b) => a - b);

	// Find the closest threshold
	let closest = thresholds[0];
	let minDiff = Math.abs(targetTemp - closest);

	for (const threshold of thresholds) {
		const diff = Math.abs(targetTemp - threshold);
		if (diff < minDiff) {
			minDiff = diff;
			closest = threshold;
		}
	}

	return SOIL_TEMP_OFFSETS[closest];
}

/**
 * Converts a PlantingTiming strategy into a concrete date.
 *
 * @param timing - The timing strategy to convert
 * @param context - Frost dates and zone information
 * @returns Calculated date for planting
 */
function calculateDateFromTiming(timing: PlantingTiming, context: ScheduleContext): Date {
	switch (timing.type) {
		case 'relative-to-frost': {
			// Use weeksOffsetMax for conservative timing
			const daysOffset = timing.weeksOffsetMax * 7;
			if (timing.reference === 'last') {
				return addDays(context.lastFrostDate, -daysOffset);
			} else {
				return addDays(context.firstFrostDate, -daysOffset);
			}
		}

		case 'soil-temperature': {
			const daysOffset = getSoilTempOffset(timing.minTemp);
			return addDays(context.lastFrostDate, daysOffset);
		}

		case 'after-frost': {
			const daysOffset = timing.weeksAfter * 7;
			return addDays(context.lastFrostDate, daysOffset);
		}

		case 'season': {
			switch (timing.season) {
				case 'early-spring':
				case 'late-winter':
					// ~7 weeks before last frost
					return addDays(context.lastFrostDate, -49);
				case 'spring':
					return new Date(context.lastFrostDate);
				case 'fall':
					// ~7 weeks before first frost
					return addDays(context.firstFrostDate, -49);
			}
			break;
		}

		case 'workable-soil': {
			// ~5 weeks before last frost
			return addDays(context.lastFrostDate, -35);
		}
	}

	// Fallback (should never reach here with proper typing)
	return new Date(context.lastFrostDate);
}

/**
 * Finds the appropriate timing strategy for a given zone.
 * Checks zone overrides first, then falls back to primary timing.
 *
 * @param schedule - The complete planting schedule
 * @param zone - The USDA hardiness zone (e.g., "6b", "7a")
 * @returns The applicable timing strategy
 */
function getTimingForZone(schedule: PlantingSchedule, zone: string): PlantingTiming {
	// Check for zone-specific override
	if (schedule.zoneOverrides) {
		for (const override of schedule.zoneOverrides) {
			if (override.zones.includes(zone)) {
				return override.timing;
			}
		}
	}

	// Fall back to primary timing
	return schedule.primary;
}

/**
 * Calculates the optimal planting date for a flower based on its schedule
 * and the user's zone/frost dates.
 *
 * The algorithm:
 * 1. Checks for zone-specific overrides in the schedule
 * 2. Falls back to the primary timing strategy if no override exists
 * 3. Converts the timing strategy to a concrete date based on frost dates
 *
 * @param schedule - The flower's planting schedule with timing strategies
 * @param context - User's zone, frost dates, and year
 * @returns PlantingDates with either indoorStartDate or directSowDate set
 *
 * @example
 * ```typescript
 * const schedule: PlantingSchedule = {
 *   primary: {
 *     type: 'relative-to-frost',
 *     reference: 'last',
 *     weeksOffsetMin: 8,
 *     weeksOffsetMax: 12,
 *     method: 'indoor'
 *   }
 * };
 *
 * const context: ScheduleContext = {
 *   zone: '6b',
 *   lastFrostDate: new Date('2024-05-01'),
 *   firstFrostDate: new Date('2024-10-15'),
 *   year: 2024
 * };
 *
 * const dates = calculateOptimalPlantingDate(schedule, context);
 * // dates.indoorStartDate === '2024-02-07' (12 weeks before May 1)
 * ```
 */
export function calculateOptimalPlantingDate(
	schedule: PlantingSchedule,
	context: ScheduleContext
): PlantingDates {
	const timing = getTimingForZone(schedule, context.zone);
	const calculatedDate = calculateDateFromTiming(timing, context);
	const dateStr = formatDate(calculatedDate);

	if (timing.method === 'indoor') {
		// For indoor-start plants, also calculate transplant date
		// Transplant typically happens ~1 week after last frost for safety
		const transplantDate = addDays(context.lastFrostDate, 7);
		return {
			indoorStartDate: dateStr,
			transplantDate: formatDate(transplantDate)
		};
	} else {
		return { directSowDate: dateStr };
	}
}
