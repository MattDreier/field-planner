/**
 * Structured planting schedule types for zone-aware auto-scheduling.
 * These enable automatic calculation of optimal planting dates based on
 * frost dates and soil temperatures for each hardiness zone.
 */

/**
 * Planting relative to last/first frost date.
 * Used for flowers like Snapdragons: "Start indoors 8-12 weeks before last frost"
 */
export interface RelativeToFrostTiming {
	type: 'relative-to-frost';
	reference: 'last' | 'first';
	weeksOffsetMin: number;
	weeksOffsetMax: number;
	method: 'indoor' | 'direct';
}

/**
 * Planting based on soil temperature threshold.
 * Used for flowers like Zinnias: "After last frost; soil temperature 70°F+"
 */
export interface SoilTemperatureTiming {
	type: 'soil-temperature';
	minTemp: number; // Fahrenheit
	method: 'direct';
}

/**
 * Planting immediately after frost passes.
 * Used for flowers like Hollyhocks: "Spring after last frost"
 */
export interface AfterFrostTiming {
	type: 'after-frost';
	weeksAfter: number; // 0 = immediately after
	method: 'direct';
}

/**
 * Planting based on season name.
 * Used for flowers like Poppies: "Early spring or late fall direct sow"
 */
export interface SeasonTiming {
	type: 'season';
	season: 'early-spring' | 'late-winter' | 'spring' | 'fall';
	method: 'indoor' | 'direct';
}

/**
 * Planting as soon as ground can be worked (typically 4-6 weeks before last frost).
 * Used for Persian Cress: "Direct sow as soon as soil is workable"
 */
export interface WorkableSoilTiming {
	type: 'workable-soil';
	method: 'direct';
}

/**
 * Union of all planting timing strategies
 */
export type PlantingTiming =
	| RelativeToFrostTiming
	| SoilTemperatureTiming
	| AfterFrostTiming
	| SeasonTiming
	| WorkableSoilTiming;

/**
 * Zone-specific override for flowers with different timing in different climates.
 * Example: Anemones are planted in fall in zones 7+ but late winter in colder zones.
 */
export interface ZoneOverride {
	zones: string[]; // USDA zone codes like '7a', '8b'
	timing: PlantingTiming;
}

/**
 * Complete planting schedule for a flower.
 * Includes primary timing strategy and optional zone-specific overrides.
 */
export interface PlantingSchedule {
	primary: PlantingTiming;
	zoneOverrides?: ZoneOverride[];
}

/**
 * Context needed for calculating optimal planting dates
 */
export interface ScheduleContext {
	zone: string;
	lastFrostDate: Date;
	firstFrostDate: Date;
	year: number;
}
