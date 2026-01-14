import type { Id } from '../../convex/_generated/dataModel';

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
}

// Canvas state
export interface CanvasState {
	zoom: number;
	panX: number;
	panY: number;
	pixelsPerInch: number;
}

// Active tool
export type Tool = 'select' | 'rectangle' | 'circle';

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
