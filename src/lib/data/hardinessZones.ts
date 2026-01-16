/**
 * USDA Hardiness Zone Data
 * Contains typical frost dates by zone for timeline calculations
 */

export interface HardinessZoneData {
	zone: string;
	minTemp: number; // Fahrenheit
	maxTemp: number; // Fahrenheit
	typicalLastFrost: { month: number; day: number }; // 0-indexed month
	typicalFirstFrost: { month: number; day: number };
	typicalLatitude: number; // Approximate latitude in degrees (for sun angle calculations)
}

export const HARDINESS_ZONES: Record<string, HardinessZoneData> = {
	'3a': {
		zone: '3a',
		minTemp: -40,
		maxTemp: -35,
		typicalLastFrost: { month: 4, day: 15 },
		typicalFirstFrost: { month: 8, day: 15 },
		typicalLatitude: 48 // Northern Minnesota, Montana
	},
	'3b': {
		zone: '3b',
		minTemp: -35,
		maxTemp: -30,
		typicalLastFrost: { month: 4, day: 10 },
		typicalFirstFrost: { month: 8, day: 20 },
		typicalLatitude: 47
	},
	'4a': {
		zone: '4a',
		minTemp: -30,
		maxTemp: -25,
		typicalLastFrost: { month: 4, day: 5 },
		typicalFirstFrost: { month: 8, day: 25 },
		typicalLatitude: 46 // Wisconsin, Vermont
	},
	'4b': {
		zone: '4b',
		minTemp: -25,
		maxTemp: -20,
		typicalLastFrost: { month: 3, day: 30 },
		typicalFirstFrost: { month: 9, day: 1 },
		typicalLatitude: 45
	},
	'5a': {
		zone: '5a',
		minTemp: -20,
		maxTemp: -15,
		typicalLastFrost: { month: 3, day: 20 },
		typicalFirstFrost: { month: 9, day: 8 },
		typicalLatitude: 43 // Iowa, Michigan
	},
	'5b': {
		zone: '5b',
		minTemp: -15,
		maxTemp: -10,
		typicalLastFrost: { month: 3, day: 15 },
		typicalFirstFrost: { month: 9, day: 15 },
		typicalLatitude: 42 // Massachusetts, Illinois
	},
	'6a': {
		zone: '6a',
		minTemp: -10,
		maxTemp: -5,
		typicalLastFrost: { month: 3, day: 10 },
		typicalFirstFrost: { month: 9, day: 20 },
		typicalLatitude: 40 // Missouri, Virginia
	},
	'6b': {
		zone: '6b',
		minTemp: -5,
		maxTemp: 0,
		typicalLastFrost: { month: 3, day: 8 },
		typicalFirstFrost: { month: 9, day: 23 },
		typicalLatitude: 39
	},
	'7a': {
		zone: '7a',
		minTemp: 0,
		maxTemp: 5,
		typicalLastFrost: { month: 3, day: 1 },
		typicalFirstFrost: { month: 9, day: 30 },
		typicalLatitude: 37 // Tennessee, North Carolina
	},
	'7b': {
		zone: '7b',
		minTemp: 5,
		maxTemp: 10,
		typicalLastFrost: { month: 2, day: 25 },
		typicalFirstFrost: { month: 10, day: 5 },
		typicalLatitude: 36
	},
	'8a': {
		zone: '8a',
		minTemp: 10,
		maxTemp: 15,
		typicalLastFrost: { month: 2, day: 15 },
		typicalFirstFrost: { month: 10, day: 10 },
		typicalLatitude: 34 // Texas, Georgia
	},
	'8b': {
		zone: '8b',
		minTemp: 15,
		maxTemp: 20,
		typicalLastFrost: { month: 2, day: 5 },
		typicalFirstFrost: { month: 10, day: 20 },
		typicalLatitude: 33
	},
	'9a': {
		zone: '9a',
		minTemp: 20,
		maxTemp: 25,
		typicalLastFrost: { month: 1, day: 20 },
		typicalFirstFrost: { month: 10, day: 30 },
		typicalLatitude: 31 // Southern Texas, Arizona
	},
	'9b': {
		zone: '9b',
		minTemp: 25,
		maxTemp: 30,
		typicalLastFrost: { month: 1, day: 10 },
		typicalFirstFrost: { month: 11, day: 10 },
		typicalLatitude: 29 // Florida
	},
	'10a': {
		zone: '10a',
		minTemp: 30,
		maxTemp: 35,
		typicalLastFrost: { month: 0, day: 31 },
		typicalFirstFrost: { month: 11, day: 15 },
		typicalLatitude: 27 // Southern Florida
	},
	'10b': {
		zone: '10b',
		minTemp: 35,
		maxTemp: 40,
		typicalLastFrost: { month: 0, day: 15 },
		typicalFirstFrost: { month: 11, day: 31 },
		typicalLatitude: 26 // Key West, Hawaii
	}
};

// Zone labels for dropdown
export const ZONE_OPTIONS = Object.keys(HARDINESS_ZONES).sort((a, b) => {
	const numA = parseFloat(a.replace(/[ab]/, (m) => (m === 'a' ? '.0' : '.5')));
	const numB = parseFloat(b.replace(/[ab]/, (m) => (m === 'a' ? '.0' : '.5')));
	return numA - numB;
});

/**
 * Get frost dates for a given hardiness zone and year
 */
export function getFrostDatesFromZone(
	zone: string,
	year: number = new Date().getFullYear()
): {
	lastFrost: Date;
	firstFrost: Date;
} {
	const zoneData = HARDINESS_ZONES[zone];
	if (!zoneData) {
		// Default to zone 6b if unknown
		return getFrostDatesFromZone('6b', year);
	}

	return {
		lastFrost: new Date(year, zoneData.typicalLastFrost.month, zoneData.typicalLastFrost.day),
		firstFrost: new Date(year, zoneData.typicalFirstFrost.month, zoneData.typicalFirstFrost.day)
	};
}

/**
 * Calculate the growing season length in days for a zone
 */
export function getSeasonLengthDays(zone: string, year?: number): number {
	const { lastFrost, firstFrost } = getFrostDatesFromZone(zone, year);
	return Math.floor((firstFrost.getTime() - lastFrost.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Format a zone for display (e.g., "Zone 6b")
 */
export function formatZone(zone: string): string {
	return `Zone ${zone.toUpperCase()}`;
}

/**
 * Get typical latitude for a hardiness zone (for sun angle calculations)
 */
export function getLatitudeFromZone(zone: string): number {
	const zoneData = HARDINESS_ZONES[zone];
	if (!zoneData) {
		// Default to zone 6b latitude if unknown
		return HARDINESS_ZONES['6b'].typicalLatitude;
	}
	return zoneData.typicalLatitude;
}
