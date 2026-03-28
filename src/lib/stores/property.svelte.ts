/**
 * Property state management.
 * Tracks property address, coordinates, boundary polygon, and setup dialog state.
 */
import type { Property, FenceVertex } from '$lib/types';

export interface PropertySetupState {
	/** Whether the property setup dialog is open */
	dialogOpen: boolean;
	/** Current step in setup wizard (1=address, 2=satellite align, 3=boundary) */
	step: number;
	/** Whether boundary tracing is active on the canvas */
	isTracingBoundary: boolean;
	/** Vertices being traced (before committing) */
	tracingVertices: FenceVertex[];
}

export const propertyState = $state<{
	property: Property | null;
	setup: PropertySetupState;
}>({
	property: null,
	setup: {
		dialogOpen: false,
		step: 1,
		isTracingBoundary: false,
		tracingVertices: []
	}
});

export function hasProperty(): boolean {
	return propertyState.property !== null;
}

export function openPropertySetup(step: number = 1): void {
	propertyState.setup.dialogOpen = true;
	propertyState.setup.step = step;
}

export function closePropertySetup(): void {
	propertyState.setup.dialogOpen = false;
	propertyState.setup.step = 1;
	propertyState.setup.isTracingBoundary = false;
	propertyState.setup.tracingVertices = [];
}

export function setProperty(property: Property): void {
	propertyState.property = property;
}

export function clearProperty(): void {
	propertyState.property = null;
}

export function startBoundaryTrace(): void {
	propertyState.setup.isTracingBoundary = true;
	propertyState.setup.tracingVertices = [];
}

export function addBoundaryVertex(vertex: FenceVertex): void {
	propertyState.setup.tracingVertices = [...propertyState.setup.tracingVertices, vertex];
}

export function undoBoundaryVertex(): void {
	if (propertyState.setup.tracingVertices.length > 0) {
		propertyState.setup.tracingVertices = propertyState.setup.tracingVertices.slice(0, -1);
	}
}

export function finishBoundaryTrace(): FenceVertex[] {
	const vertices = [...propertyState.setup.tracingVertices];
	propertyState.setup.isTracingBoundary = false;
	propertyState.setup.tracingVertices = [];
	return vertices;
}

export function cancelBoundaryTrace(): void {
	propertyState.setup.isTracingBoundary = false;
	propertyState.setup.tracingVertices = [];
}
