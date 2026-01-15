import type { GardenSettings, PlannedPlant, PlantingDates } from '$lib/types';
import type { Id } from '../../convex/_generated/dataModel';
import { getFrostDatesFromZone } from '$lib/data/hardinessZones';
import { formatDateISO } from '$lib/utils/timeline';

// View scale options
export type TimelineViewScale = 'week' | 'month' | 'season';

// Timeline state using Svelte 5 runes
export const timelineState = $state({
	// Panel visibility
	isPanelOpen: false,
	panelHeight: 300, // pixels

	// View settings
	viewYear: new Date().getFullYear(),
	viewScale: 'month' as TimelineViewScale,
	scrollOffset: 0, // days from year start

	// Current view date (ISO string YYYY-MM-DD)
	// This is the "scrubber" position - the date being viewed for canvas rendering
	currentViewDate: new Date().toISOString().split('T')[0],

	// Garden settings
	gardenSettings: {
		hardinessZone: '6b',
		lastFrostDate: '',
		firstFrostDate: '',
		latitude: 40
	} as GardenSettings,

	// Planned plants (not yet placed on canvas)
	plannedPlants: [] as PlannedPlant[],

	// UI state
	selectedTimelineEntryId: null as string | null,
	hoveredTimelineEntryId: null as string | null
});

// Panel actions
export function togglePanel() {
	timelineState.isPanelOpen = !timelineState.isPanelOpen;
}

export function openPanel() {
	timelineState.isPanelOpen = true;
}

export function closePanel() {
	timelineState.isPanelOpen = false;
}

export function setPanelHeight(height: number) {
	timelineState.panelHeight = Math.max(200, Math.min(600, height));
}

// View actions
export function setViewYear(year: number) {
	timelineState.viewYear = year;
}

export function setViewScale(scale: TimelineViewScale) {
	timelineState.viewScale = scale;
}

export function setScrollOffset(offset: number) {
	timelineState.scrollOffset = Math.max(0, offset);
}

// Current view date actions
export function setCurrentViewDate(dateOrString: Date | string) {
	const dateStr =
		typeof dateOrString === 'string' ? dateOrString : dateOrString.toISOString().split('T')[0];
	timelineState.currentViewDate = dateStr;

	// Also update viewYear if date is in a different year
	const year = parseInt(dateStr.split('-')[0], 10);
	if (year !== timelineState.viewYear) {
		timelineState.viewYear = year;
	}
}

export function getCurrentViewDateAsDate(): Date {
	return new Date(timelineState.currentViewDate + 'T12:00:00');
}

// Garden settings actions
export function setHardinessZone(zone: string) {
	timelineState.gardenSettings.hardinessZone = zone;

	// Auto-populate frost dates from zone
	const frostDates = getFrostDatesFromZone(zone, timelineState.viewYear);
	timelineState.gardenSettings.lastFrostDate = formatDateISO(frostDates.lastFrost);
	timelineState.gardenSettings.firstFrostDate = formatDateISO(frostDates.firstFrost);
}

export function setLastFrostDate(date: string) {
	timelineState.gardenSettings.lastFrostDate = date;
}

export function setFirstFrostDate(date: string) {
	timelineState.gardenSettings.firstFrostDate = date;
}

export function setLatitude(latitude: number) {
	timelineState.gardenSettings.latitude = Math.max(-90, Math.min(90, latitude));
}

export function setGardenSettings(settings: Partial<GardenSettings>) {
	timelineState.gardenSettings = { ...timelineState.gardenSettings, ...settings };
}

// Initialize frost dates from zone on first load
export function initializeGardenSettings() {
	if (!timelineState.gardenSettings.lastFrostDate) {
		setHardinessZone(timelineState.gardenSettings.hardinessZone);
	}
}

// Planned plant actions
export function addPlannedPlant(plant: Omit<PlannedPlant, '_id' | 'createdAt'>) {
	const newPlant: PlannedPlant = {
		...plant,
		_id: `planned_${Date.now()}_${Math.random().toString(36).slice(2, 9)}` as Id<'plannedPlants'>,
		createdAt: Date.now()
	};
	timelineState.plannedPlants = [...timelineState.plannedPlants, newPlant];
	return newPlant._id;
}

export function updatePlannedPlant(id: Id<'plannedPlants'>, updates: Partial<PlannedPlant>) {
	timelineState.plannedPlants = timelineState.plannedPlants.map((p) =>
		p._id === id ? { ...p, ...updates } : p
	);
}

export function updatePlannedPlantDates(id: Id<'plannedPlants'>, dates: Partial<PlantingDates>) {
	timelineState.plannedPlants = timelineState.plannedPlants.map((p) =>
		p._id === id ? { ...p, plantingDates: { ...p.plantingDates, ...dates } } : p
	);
}

export function removePlannedPlant(id: Id<'plannedPlants'>) {
	timelineState.plannedPlants = timelineState.plannedPlants.filter((p) => p._id !== id);
}

export function updatePlannedPlantPosition(id: Id<'plannedPlants'>, x: number, y: number) {
	timelineState.plannedPlants = timelineState.plannedPlants.map((p) =>
		p._id === id ? { ...p, x, y } : p
	);
}

export function setPlannedPlants(plants: PlannedPlant[]) {
	timelineState.plannedPlants = plants;
}

// Create succession group
export function createSuccessionGroup(
	bedId: Id<'beds'>,
	layoutId: Id<'layouts'>,
	flowerId: string,
	startDate: Date,
	intervalDays: number,
	count: number,
	plantingType: 'indoor' | 'direct' = 'direct'
): string {
	const groupId = `succession_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

	// For indoor plantings, calculate base transplant date (1 week after last frost)
	// Each succession's transplant date is also staggered by intervalDays
	let baseTransplantDate: Date | null = null;
	if (plantingType === 'indoor' && timelineState.gardenSettings.lastFrostDate) {
		const lastFrost = new Date(timelineState.gardenSettings.lastFrostDate + 'T12:00:00');
		baseTransplantDate = new Date(lastFrost);
		baseTransplantDate.setDate(baseTransplantDate.getDate() + 7); // 1 week after last frost
	}

	for (let i = 0; i < count; i++) {
		const plantDate = new Date(startDate);
		plantDate.setDate(plantDate.getDate() + intervalDays * i);
		const dateStr = formatDateISO(plantDate);

		// Calculate staggered transplant date for this succession
		let transplantDateStr: string | undefined;
		if (baseTransplantDate) {
			const transplantDate = new Date(baseTransplantDate);
			transplantDate.setDate(transplantDate.getDate() + intervalDays * i);
			transplantDateStr = formatDateISO(transplantDate);
		}

		addPlannedPlant({
			layoutId,
			bedId,
			flowerId,
			plantingDates:
				plantingType === 'indoor'
					? { indoorStartDate: dateStr, transplantDate: transplantDateStr }
					: { directSowDate: dateStr },
			successionGroupId: groupId,
			successionIndex: i,
			quantity: 1,
			status: 'planned'
		});
	}

	return groupId;
}

// Remove entire succession group
export function removeSuccessionGroup(groupId: string) {
	timelineState.plannedPlants = timelineState.plannedPlants.filter(
		(p) => p.successionGroupId !== groupId
	);
}

// Selection actions
export function selectTimelineEntry(id: string | null) {
	timelineState.selectedTimelineEntryId = id;
}

export function hoverTimelineEntry(id: string | null) {
	timelineState.hoveredTimelineEntryId = id;
}

// Convert planned plant to placed (called when user places it on canvas)
export function convertToPlaced(plannedId: Id<'plannedPlants'>): PlannedPlant | null {
	const plant = timelineState.plannedPlants.find((p) => p._id === plannedId);
	if (plant) {
		removePlannedPlant(plannedId);
	}
	return plant ?? null;
}
