/**
 * Shared drag state for plant palette → canvas drag-and-drop.
 * Uses Pointer Events instead of HTML5 Drag API for touch device support.
 */

export interface DragPlant {
	flowerId: string;
	flowerName: string;
	spacingMin: number;
	heightMax: number;
}

const dragState = $state<{
	isDragging: boolean;
	plant: DragPlant | null;
	pointerX: number;
	pointerY: number;
}>({
	isDragging: false,
	plant: null,
	pointerX: 0,
	pointerY: 0
});

export const plantDragState = dragState;

export function startPlantDrag(plant: DragPlant, clientX: number, clientY: number): void {
	dragState.isDragging = true;
	dragState.plant = plant;
	dragState.pointerX = clientX;
	dragState.pointerY = clientY;
}

export function updatePlantDragPosition(clientX: number, clientY: number): void {
	dragState.pointerX = clientX;
	dragState.pointerY = clientY;
}

export function endPlantDrag(): DragPlant | null {
	const plant = dragState.plant;
	dragState.isDragging = false;
	dragState.plant = null;
	return plant;
}
