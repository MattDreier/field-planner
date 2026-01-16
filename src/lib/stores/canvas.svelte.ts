import type { Tool, DragSource } from '$lib/types';
import type { Id } from '../../convex/_generated/dataModel';

// Canvas state using Svelte 5 runes
export const canvasState = $state({
	zoom: 1.0,
	panX: 0,
	panY: 0,
	pixelsPerInch: 12, // 1 ft = 144px at zoom 1.0
	selectedBedId: null as Id<'beds'> | null,
	selectedPlantId: null as Id<'placedPlants'> | null,
	tool: 'select' as Tool,
	isDragging: false,
	dragSource: null as DragSource
});

// Canvas actions
export function setZoom(zoom: number) {
	canvasState.zoom = Math.max(0.25, Math.min(4, zoom));
}

export function zoomIn() {
	setZoom(canvasState.zoom * 1.2);
}

export function zoomOut() {
	setZoom(canvasState.zoom / 1.2);
}

export function resetZoom() {
	canvasState.zoom = 1.0;
	canvasState.panX = 0;
	canvasState.panY = 0;
}

export function setPan(x: number, y: number) {
	canvasState.panX = x;
	canvasState.panY = y;
}

export function setTool(tool: Tool) {
	canvasState.tool = tool;
	canvasState.selectedBedId = null;
	canvasState.selectedPlantId = null;
}

export function selectBed(bedId: Id<'beds'> | null) {
	canvasState.selectedBedId = bedId;
	canvasState.selectedPlantId = null;
}

export function selectPlant(plantId: Id<'placedPlants'> | null) {
	canvasState.selectedPlantId = plantId;
	canvasState.selectedBedId = null;
}

export function startDrag(source: DragSource) {
	canvasState.isDragging = true;
	canvasState.dragSource = source;
}

export function endDrag() {
	canvasState.isDragging = false;
	canvasState.dragSource = null;
}

export function clearSelection() {
	canvasState.selectedBedId = null;
	canvasState.selectedPlantId = null;
}
