/**
 * Timeline utility functions for lifecycle phase calculations and succession planning
 */

import type { FlowerData } from '$lib/data/flowers';
import type { PlantingDates } from '$lib/types';

// Phase colors matching the design system
export const PHASE_COLORS = {
	'indoor-start': '#a855f7', // purple
	germinating: '#c084fc', // lighter purple
	'hardening-off': '#f59e0b', // amber
	transplant: '#f97316', // orange
	growing: '#22c55e', // green
	'harvest-window': '#ef4444' // red
} as const;

export type LifecyclePhase =
	| 'indoor-start'
	| 'germinating'
	| 'hardening-off'
	| 'transplant'
	| 'growing'
	| 'harvest-window';

export interface PhaseData {
	phase: LifecyclePhase;
	startDate: Date;
	endDate: Date;
	color: string;
	label: string;
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
}

/**
 * Parse an ISO date string to a Date object
 */
export function parseDate(dateStr: string | undefined): Date | null {
	if (!dateStr) return null;
	const date = new Date(dateStr);
	return isNaN(date.getTime()) ? null : date;
}

/**
 * Format a Date to ISO date string (YYYY-MM-DD)
 */
export function formatDateISO(date: Date): string {
	return date.toISOString().split('T')[0];
}

/**
 * Format a Date for display (e.g., "Mar 15")
 */
export function formatDateShort(date: Date): string {
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Calculate lifecycle phases for a plant based on its planting dates and flower data
 */
export function calculateLifecyclePhases(
	plantingDates: PlantingDates,
	flowerData: FlowerData
): PhaseData[] {
	const phases: PhaseData[] = [];

	const indoorStart = parseDate(plantingDates.indoorStartDate);
	const transplant = parseDate(plantingDates.transplantDate);
	const directSow = parseDate(plantingDates.directSowDate);

	// Determine the starting point
	const startDate = indoorStart || directSow;
	if (!startDate) return phases;

	// Germination duration
	const germinationDays = flowerData.daysToGerminationMax ?? flowerData.daysToGermination;

	// Indoor start phase (for plants started indoors)
	if (indoorStart) {
		// Seeding to germination
		const germinationEnd = addDays(indoorStart, germinationDays);
		phases.push({
			phase: 'indoor-start',
			startDate: indoorStart,
			endDate: germinationEnd,
			color: PHASE_COLORS['indoor-start'],
			label: 'Indoor seeding'
		});

		// Growing indoors until hardening off
		if (transplant) {
			const hardeningStart = addDays(transplant, -10); // 10 days of hardening off

			// Only add growing phase if there's time between germination and hardening
			if (germinationEnd < hardeningStart) {
				phases.push({
					phase: 'growing',
					startDate: germinationEnd,
					endDate: hardeningStart,
					color: PHASE_COLORS['growing'],
					label: 'Growing indoors'
				});
			}

			// Hardening off period
			phases.push({
				phase: 'hardening-off',
				startDate: hardeningStart,
				endDate: transplant,
				color: PHASE_COLORS['hardening-off'],
				label: 'Hardening off'
			});
		}
	}

	// Calculate outdoor growing period
	const outdoorStart = transplant || directSow;
	if (outdoorStart) {
		// For direct sow, include germination in the growing phase
		const growingStart = directSow ? addDays(directSow, germinationDays) : outdoorStart;

		// Days to harvest is from transplant/sow date
		const harvestStart = addDays(outdoorStart, flowerData.daysToHarvest);

		phases.push({
			phase: 'growing',
			startDate: growingStart,
			endDate: harvestStart,
			color: PHASE_COLORS['growing'],
			label: 'Growing outdoors'
		});

		// Harvest window duration
		// For cut-and-come-again, extend the harvest window significantly
		let harvestDuration: number;
		if (flowerData.cutAndComeAgain) {
			harvestDuration = 60; // 2 months of repeated harvests
		} else {
			// Use the difference between min and max harvest days, plus vase life as buffer
			const harvestRange =
				(flowerData.daysToHarvestMax ?? flowerData.daysToHarvest) - flowerData.daysToHarvest;
			harvestDuration = Math.max(14, harvestRange + 7);
		}

		phases.push({
			phase: 'harvest-window',
			startDate: harvestStart,
			endDate: addDays(harvestStart, harvestDuration),
			color: PHASE_COLORS['harvest-window'],
			label: 'Harvest'
		});
	}

	return phases;
}

/**
 * Succession planning suggestion
 */
export interface SuccessionSuggestion {
	intervalDays: number;
	totalPlantings: number;
	reasoning: string;
}

/**
 * Suggest succession planting intervals based on flower data and season length
 */
export function suggestSuccessionInterval(
	flowerData: FlowerData,
	seasonLengthDays: number,
	desiredCoverage: 'continuous' | 'staggered' | 'single' = 'continuous'
): SuccessionSuggestion {
	if (desiredCoverage === 'single') {
		return {
			intervalDays: 0,
			totalPlantings: 1,
			reasoning: 'Single planting requested'
		};
	}

	// Base interval on vase life for continuous fresh flowers
	const vaseLife = flowerData.vaseLifeDaysMax ?? flowerData.vaseLifeDays;

	// For cut-and-come-again flowers, we can space plantings further apart
	let baseInterval: number;
	if (flowerData.cutAndComeAgain) {
		// These keep producing, so space them out more
		baseInterval = Math.max(vaseLife * 2, 21); // At least 3 weeks
	} else {
		// Single harvest crops need tighter succession
		baseInterval = vaseLife;
	}

	// For staggered harvests, double the interval
	if (desiredCoverage === 'staggered') {
		baseInterval = baseInterval * 2;
	}

	// Calculate number of plantings that fit in the season
	const growingTime = flowerData.daysToHarvest;
	const effectiveSeasonLength = seasonLengthDays - growingTime;
	const totalPlantings = Math.max(1, Math.floor(effectiveSeasonLength / baseInterval));

	// Build reasoning string
	let reasoning: string;
	if (flowerData.cutAndComeAgain) {
		reasoning = `${flowerData.name} produces continuously, so ${baseInterval}-day intervals maintain steady supply`;
	} else {
		reasoning = `${baseInterval}-day intervals match ${flowerData.name}'s ${vaseLife}-day vase life for continuous blooms`;
	}

	return {
		intervalDays: Math.round(baseInterval),
		totalPlantings,
		reasoning
	};
}

/**
 * Generate succession planting dates from a start date
 */
export function generateSuccessionDates(
	startDate: Date,
	intervalDays: number,
	count: number
): Date[] {
	const dates: Date[] = [];
	for (let i = 0; i < count; i++) {
		dates.push(addDays(startDate, intervalDays * i));
	}
	return dates;
}

/**
 * Timeline entry representing either a PlacedPlant or PlannedPlant
 */
export interface TimelineEntry {
	id: string;
	type: 'placed' | 'planned';
	flowerId: string;
	flowerName: string;
	bedId: string;
	bedName?: string;
	plantingDates: PlantingDates;
	phases: PhaseData[];
	successionGroupId?: string;
	successionIndex?: number;
	quantity?: number;
	status?: string;
}

/**
 * Get the earliest date across all phases of a timeline entry
 */
export function getTimelineEntryStart(entry: TimelineEntry): Date | null {
	if (entry.phases.length === 0) return null;
	return entry.phases.reduce(
		(earliest, phase) => (phase.startDate < earliest ? phase.startDate : earliest),
		entry.phases[0].startDate
	);
}

/**
 * Get the latest date across all phases of a timeline entry
 */
export function getTimelineEntryEnd(entry: TimelineEntry): Date | null {
	if (entry.phases.length === 0) return null;
	return entry.phases.reduce(
		(latest, phase) => (phase.endDate > latest ? phase.endDate : latest),
		entry.phases[0].endDate
	);
}

/**
 * Determine if a plant is visible at a given date based on its lifecycle phases.
 * Returns the current phase info if visible, null if not visible.
 */
export interface PlantVisibility {
	isVisible: boolean;
	currentPhase: LifecyclePhase | null;
	phaseLabel: string | null;
	phaseColor: string | null;
	phaseProgress: number; // 0-1 progress within current phase
}

export function getPlantVisibilityAtDate(
	phases: PhaseData[],
	currentDate: Date
): PlantVisibility {
	if (phases.length === 0) {
		return { isVisible: false, currentPhase: null, phaseLabel: null, phaseColor: null, phaseProgress: 0 };
	}

	// Get the overall lifecycle span
	const lifecycleStart = phases[0].startDate;
	const lifecycleEnd = phases[phases.length - 1].endDate;

	// Check if current date is within the lifecycle
	if (currentDate < lifecycleStart || currentDate > lifecycleEnd) {
		return { isVisible: false, currentPhase: null, phaseLabel: null, phaseColor: null, phaseProgress: 0 };
	}

	// Find which phase we're in
	for (const phase of phases) {
		if (currentDate >= phase.startDate && currentDate <= phase.endDate) {
			const phaseDuration = phase.endDate.getTime() - phase.startDate.getTime();
			const elapsed = currentDate.getTime() - phase.startDate.getTime();
			const progress = phaseDuration > 0 ? elapsed / phaseDuration : 0;

			return {
				isVisible: true,
				currentPhase: phase.phase,
				phaseLabel: phase.label,
				phaseColor: phase.color,
				phaseProgress: Math.min(1, Math.max(0, progress))
			};
		}
	}

	// Fallback: within lifecycle but between phases (shouldn't happen with proper data)
	return { isVisible: true, currentPhase: null, phaseLabel: null, phaseColor: null, phaseProgress: 0 };
}

/**
 * Calculate plant height at a specific date based on growth progress.
 * Returns a smooth interpolation from 0 to heightMax over the growing period.
 *
 * @param plantingDates - The plant's scheduled dates
 * @param flowerData - Flower data including growth timing and max height
 * @param currentDate - The date to calculate height for
 * @returns Current height in inches (0 if not yet growing, heightMax if fully mature)
 */
export function getPlantHeightAtDate(
	plantingDates: PlantingDates,
	flowerData: FlowerData,
	currentDate: Date
): number {
	const transplant = parseDate(plantingDates.transplantDate);
	const directSow = parseDate(plantingDates.directSowDate);

	// Determine when outdoor growth begins
	// For transplants: growth starts at transplant date
	// For direct sow: growth starts after germination
	const germinationDays = flowerData.daysToGerminationMax ?? flowerData.daysToGermination;
	const growthStart = transplant ?? (directSow ? addDays(directSow, germinationDays) : null);

	if (!growthStart) {
		// No planting dates - return max height as fallback
		return flowerData.heightMax;
	}

	// Growth ends at harvest start (daysToHarvest after transplant/sow)
	const outdoorStart = transplant || directSow;
	if (!outdoorStart) return flowerData.heightMax;

	const growthEnd = addDays(outdoorStart, flowerData.daysToHarvest);

	// Before growth starts - height is 0
	if (currentDate < growthStart) {
		return 0;
	}

	// After growth ends - plant is at full height
	if (currentDate >= growthEnd) {
		return flowerData.heightMax;
	}

	// During growth - smooth linear interpolation from 0 to max
	const totalGrowthMs = growthEnd.getTime() - growthStart.getTime();
	const elapsedMs = currentDate.getTime() - growthStart.getTime();
	const progress = totalGrowthMs > 0 ? elapsedMs / totalGrowthMs : 1;

	return flowerData.heightMax * Math.min(1, Math.max(0, progress));
}

/**
 * Group timeline entries by bed
 */
export function groupEntriesByBed(
	entries: TimelineEntry[]
): Map<string, { bedName: string; entries: TimelineEntry[] }> {
	const grouped = new Map<string, { bedName: string; entries: TimelineEntry[] }>();

	for (const entry of entries) {
		const existing = grouped.get(entry.bedId);
		if (existing) {
			existing.entries.push(entry);
		} else {
			grouped.set(entry.bedId, {
				bedName: entry.bedName ?? `Bed ${entry.bedId}`,
				entries: [entry]
			});
		}
	}

	// Sort entries within each bed by start date
	for (const group of grouped.values()) {
		group.entries.sort((a, b) => {
			const aStart = getTimelineEntryStart(a);
			const bStart = getTimelineEntryStart(b);
			if (!aStart) return 1;
			if (!bStart) return -1;
			return aStart.getTime() - bStart.getTime();
		});
	}

	return grouped;
}
