import type { Id } from '../../convex/_generated/dataModel';

// Re-export scheduling types
export type {
	PlantingTiming,
	RelativeToFrostTiming,
	SoilTemperatureTiming,
	AfterFrostTiming,
	SeasonTiming,
	WorkableSoilTiming,
	ZoneOverride,
	PlantingSchedule,
	ScheduleContext
} from './scheduling';

// Bed shapes
export type BedShape = 'rectangle' | 'circle';

// Base bed interface
export interface BedBase {
	_id: Id<'beds'>;
	layoutId: Id<'layouts'>;
	shape: BedShape;
	x: number; // inches from canvas origin
	y: number; // inches from canvas origin
	widthFeet: number;
	name?: string;
	fillColor?: string;
	rotation?: number; // degrees (0-360), clockwise from North
	createdAt: number;
}

export interface RectangularBed extends BedBase {
	shape: 'rectangle';
	heightFeet: number;
}

export interface CircularBed extends BedBase {
	shape: 'circle';
	// widthFeet represents diameter
}

export type Bed = RectangularBed | CircularBed;

// Timeline planting dates
export interface PlantingDates {
	indoorStartDate?: string; // ISO date for indoor seeding
	transplantDate?: string; // When moved outdoors
	directSowDate?: string; // For direct-sow plants
}

// Placed plant interface
export interface PlacedPlant {
	_id: Id<'placedPlants'>;
	bedId: Id<'beds'>;
	layoutId: Id<'layouts'>;
	flowerId: string;
	x: number; // inches within bed
	y: number; // inches within bed
	spacingMin: number; // inches
	heightMax: number; // inches
	name: string;
	createdAt: number;
	// Timeline scheduling (optional for backward compatibility)
	plantingDates?: PlantingDates;
	successionGroupId?: string; // Links succession plants together
	successionIndex?: number; // Order within succession (0, 1, 2...)
}

// Planned plant (future planting not yet on canvas)
export interface PlannedPlant {
	_id: Id<'plannedPlants'>;
	layoutId: Id<'layouts'>;
	bedId: Id<'beds'>; // Required - all entries linked to beds
	flowerId: string;
	plantingDates: PlantingDates;
	successionGroupId?: string;
	successionIndex?: number;
	quantity: number;
	status: 'planned' | 'started' | 'transplanted' | 'harvesting' | 'complete';
	notes?: string;
	createdAt: number;
	// Position within bed (inches) - if undefined, auto-center in bed
	x?: number;
	y?: number;
}

// Garden settings for timeline calculations
export interface GardenSettings {
	hardinessZone: string; // e.g., "6b", "7a"
	lastFrostDate: string; // ISO date (auto-filled from zone, editable)
	firstFrostDate: string; // ISO date
	latitude: number; // For sun calculations
}

// Layout interface
export interface Layout {
	_id: Id<'layouts'>;
	name: string;
	description?: string;
	canvasWidth: number; // inches
	canvasHeight: number; // inches
	pixelsPerInch: number;
	createdAt: number;
	updatedAt: number;
}

// Plant with computed properties for rendering
export interface PlantWithPosition extends PlacedPlant {
	absoluteX: number;
	absoluteY: number;
	hasConflict: boolean;
	heightColor: string;
	isShaded?: boolean; // true if another plant's shadow covers this plant
}

// Sun simulation state
export interface SunSimulationState {
	enabled: boolean;
	latitude: number; // -90 to 90
	month: number; // 0-11 (continuous for smooth interpolation)
	timeOfDay: number; // 0-1 (sunrise to sunset)
}

// Canvas state
export interface CanvasState {
	zoom: number;
	panX: number;
	panY: number;
	pixelsPerInch: number;
}

// Active tool
export type Tool = 'select' | 'rectangle' | 'circle' | 'shadows';

// Drag source for drag-and-drop
export type DragSource =
	| { type: 'flower'; flowerId: string; flowerName: string; spacingMin: number; heightMax: number }
	| { type: 'plant'; plantId: Id<'placedPlants'> }
	| null;

// Helper: get dimensions in inches
export function getBedDimensionsInInches(bed: Bed): { width: number; height: number } {
	const width = bed.widthFeet * 12;
	const height = bed.shape === 'rectangle' ? bed.heightFeet * 12 : bed.widthFeet * 12;
	return { width, height };
}
