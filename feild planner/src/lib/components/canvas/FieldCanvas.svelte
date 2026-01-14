<script lang="ts">
	import GridBackground from './GridBackground.svelte';
	import Bed from './Bed.svelte';
	import PlacedPlant from './PlacedPlant.svelte';
	import ShadowLayer from './ShadowLayer.svelte';
	import CompassRose from './CompassRose.svelte';
	import type { Bed as BedType, PlacedPlant as PlacedPlantType, Tool, DragSource, SunSimulationState } from '$lib/types';
	import { getBedDimensionsInInches } from '$lib/types';
	import { fieldToCanvas, canvasToField, bedLocalToField } from '$lib/utils/coordinates';
	import { detectSpacingConflicts } from '$lib/utils/collision';
	import { calculateHeightColors } from '$lib/utils/color';
	import { snapToGrid, snapFeetToGrid, type SnapIncrement } from '$lib/utils/snap';
	import { calculateSunPosition } from '$lib/utils/sun';
	import { calculateAllShadows, detectShadedPlants } from '$lib/utils/shadow';
	import type { Id } from '../../../convex/_generated/dataModel';

	interface Props {
		canvasWidth: number; // in inches
		canvasHeight: number; // in inches
		pixelsPerInch: number;
		zoom: number;
		panX: number;
		panY: number;
		tool: Tool;
		beds: BedType[];
		plants: PlacedPlantType[];
		selectedBedId: Id<'beds'> | null;
		selectedPlantId: Id<'placedPlants'> | null;
		dragSource: DragSource;
		snapIncrement: SnapIncrement;
		sunSimulation: SunSimulationState;
		onSelectBed: (id: Id<'beds'> | null) => void;
		onSelectPlant: (id: Id<'placedPlants'> | null) => void;
		onCreateBed: (shape: 'rectangle' | 'circle', x: number, y: number, widthFeet: number, heightFeet?: number) => void;
		onMoveBed: (id: Id<'beds'>, newX: number, newY: number) => void;
		onResizeBed: (id: Id<'beds'>, newWidthFeet: number, newHeightFeet: number) => void;
		onRotateBed: (id: Id<'beds'>, rotation: number) => void;
		onPlacePlant: (bedId: Id<'beds'>, flowerId: string, name: string, x: number, y: number, spacingMin: number, heightMax: number) => void;
		onMovePlant: (id: Id<'placedPlants'>, x: number, y: number) => void;
	}

	let {
		canvasWidth,
		canvasHeight,
		pixelsPerInch,
		zoom,
		panX,
		panY,
		tool,
		beds,
		plants,
		selectedBedId,
		selectedPlantId,
		dragSource,
		snapIncrement,
		sunSimulation,
		onSelectBed,
		onSelectPlant,
		onCreateBed,
		onMoveBed,
		onResizeBed,
		onRotateBed,
		onPlacePlant,
		onMovePlant
	}: Props = $props();

	// Canvas dimensions in pixels
	const canvasWidthPx = $derived(canvasWidth * pixelsPerInch * zoom);
	const canvasHeightPx = $derived(canvasHeight * pixelsPerInch * zoom);

	// Canvas state helper
	const canvasState = $derived({ zoom, panX, panY, pixelsPerInch });

	// Compute plant positions with absolute coordinates
	const plantsWithPositions = $derived.by(() => {
		return plants.map((plant) => {
			const bed = beds.find((b) => b._id === plant.bedId);
			if (!bed) return null;

			const absolutePos = bedLocalToField(plant.x, plant.y, bed);
			const canvasPos = fieldToCanvas(absolutePos.x, absolutePos.y, canvasState);
			const spacingRadiusPixels = (plant.spacingMin / 2) * pixelsPerInch * zoom;

			return {
				...plant,
				absoluteX: absolutePos.x,
				absoluteY: absolutePos.y,
				canvasX: canvasPos.x,
				canvasY: canvasPos.y,
				spacingRadiusPixels
			};
		}).filter(Boolean) as Array<PlacedPlantType & { absoluteX: number; absoluteY: number; canvasX: number; canvasY: number; spacingRadiusPixels: number }>;
	});

	// Detect spacing conflicts
	const conflicts = $derived.by(() => {
		const positions = plantsWithPositions.map((p) => ({
			id: p._id,
			x: p.absoluteX,
			y: p.absoluteY,
			radius: p.spacingMin / 2
		}));
		return detectSpacingConflicts(positions);
	});

	// Calculate height-based colors
	const heightColors = $derived.by(() => {
		const plantHeights = plants.map((p) => ({ id: p._id, heightMax: p.heightMax }));
		return calculateHeightColors(plantHeights);
	});

	// Calculate sun position and shadows
	const sunPosition = $derived.by(() => {
		if (!sunSimulation.enabled) return null;
		return calculateSunPosition(
			sunSimulation.latitude,
			sunSimulation.month,
			sunSimulation.timeOfDay
		);
	});

	// Calculate shadows for all plants
	const shadows = $derived.by(() => {
		if (!sunPosition || sunPosition.isNight) return [];
		const plantsForShadow = plantsWithPositions.map((p) => ({
			id: p._id,
			x: p.absoluteX,
			y: p.absoluteY,
			heightMax: p.heightMax
		}));
		return calculateAllShadows(plantsForShadow, sunPosition);
	});

	// Detect which plants are being shaded
	const shadedPlants = $derived.by(() => {
		if (!sunPosition || sunPosition.isNight) return new Set<string>();
		const plantsForShadow = plantsWithPositions.map((p) => ({
			id: p._id,
			x: p.absoluteX,
			y: p.absoluteY,
			heightMax: p.heightMax
		}));
		return detectShadedPlants(plantsForShadow, sunPosition);
	});

	// Bed creation drag state
	let isCreatingBed = $state(false);
	let bedStartX = $state(0);
	let bedStartY = $state(0);
	let bedCurrentX = $state(0);
	let bedCurrentY = $state(0);

	function handleCanvasPointerDown(e: PointerEvent) {
		if (e.button !== 0) return;

		// Clear selection when clicking on empty canvas
		if (tool === 'select') {
			onSelectBed(null);
			onSelectPlant(null);
			return;
		}

		// Start bed creation
		if (tool === 'rectangle' || tool === 'circle') {
			const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;
			isCreatingBed = true;
			bedStartX = x;
			bedStartY = y;
			bedCurrentX = x;
			bedCurrentY = y;
			(e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
		}
	}

	function handleCanvasPointerMove(e: PointerEvent) {
		if (!isCreatingBed) return;
		const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
		bedCurrentX = e.clientX - rect.left;
		bedCurrentY = e.clientY - rect.top;
	}

	function handleCanvasPointerUp(e: PointerEvent) {
		if (!isCreatingBed) return;
		isCreatingBed = false;
		(e.currentTarget as SVGElement).releasePointerCapture(e.pointerId);

		// Calculate bed dimensions
		const minX = Math.min(bedStartX, bedCurrentX);
		const minY = Math.min(bedStartY, bedCurrentY);
		const width = Math.abs(bedCurrentX - bedStartX);
		const height = Math.abs(bedCurrentY - bedStartY);

		// Convert to field coordinates and feet
		let fieldPos = canvasToField(minX, minY, canvasState);
		const widthInches = width / (pixelsPerInch * zoom);
		const heightInches = height / (pixelsPerInch * zoom);

		// Apply snapping to position (in inches)
		fieldPos = {
			x: snapToGrid(fieldPos.x, snapIncrement),
			y: snapToGrid(fieldPos.y, snapIncrement)
		};

		// Minimum bed size: 1 foot, with snapping applied
		let widthFeet = Math.max(1, Math.round(widthInches / 12));
		let heightFeet = Math.max(1, Math.round(heightInches / 12));
		widthFeet = snapFeetToGrid(widthFeet, snapIncrement);
		heightFeet = snapFeetToGrid(heightFeet, snapIncrement);

		// Only create if dragged enough
		if (widthFeet >= 1 && heightFeet >= 1) {
			onCreateBed(tool as 'rectangle' | 'circle', fieldPos.x, fieldPos.y, widthFeet, tool === 'rectangle' ? heightFeet : undefined);
		}
	}

	// Handle drop on canvas
	function handleDrop(e: DragEvent) {
		e.preventDefault();
		if (!dragSource || dragSource.type !== 'flower') return;

		const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
		const canvasX = e.clientX - rect.left;
		const canvasY = e.clientY - rect.top;
		const fieldPos = canvasToField(canvasX, canvasY, canvasState);

		// Find which bed the drop is in
		for (const bed of beds) {
			const dims = getBedDimensionsInInches(bed);
			const bedEndX = bed.x + dims.width;
			const bedEndY = bed.y + dims.height;

			if (fieldPos.x >= bed.x && fieldPos.x <= bedEndX && fieldPos.y >= bed.y && fieldPos.y <= bedEndY) {
				// Calculate local position within bed
				const localX = fieldPos.x - bed.x;
				const localY = fieldPos.y - bed.y;

				onPlacePlant(
					bed._id,
					dragSource.flowerId,
					dragSource.flowerName,
					localX,
					localY,
					dragSource.spacingMin,
					dragSource.heightMax
				);
				return;
			}
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
	}

	// Bed move handler
	function handleBedMove(id: Id<'beds'>, deltaX: number, deltaY: number) {
		const bed = beds.find((b) => b._id === id);
		if (!bed) return;

		// Convert pixel delta to inches
		const deltaInchesX = deltaX / (pixelsPerInch * zoom);
		const deltaInchesY = deltaY / (pixelsPerInch * zoom);

		// Apply snapping to new position
		const newX = snapToGrid(bed.x + deltaInchesX, snapIncrement);
		const newY = snapToGrid(bed.y + deltaInchesY, snapIncrement);

		onMoveBed(id, newX, newY);
	}

	// Plant move handler
	function handlePlantMove(id: Id<'placedPlants'>, deltaX: number, deltaY: number) {
		const plant = plants.find((p) => p._id === id);
		if (!plant) return;

		// Convert pixel delta to inches (local bed coordinates)
		const deltaInchesX = deltaX / (pixelsPerInch * zoom);
		const deltaInchesY = deltaY / (pixelsPerInch * zoom);

		// Calculate new position (plants use local bed coordinates)
		const newX = plant.x + deltaInchesX;
		const newY = plant.y + deltaInchesY;

		onMovePlant(id, newX, newY);
	}
</script>

<svg
	width={canvasWidthPx}
	height={canvasHeightPx}
	class="border border-border rounded-lg shadow-inner touch-none"
	onpointerdown={handleCanvasPointerDown}
	onpointermove={handleCanvasPointerMove}
	onpointerup={handleCanvasPointerUp}
	ondrop={handleDrop}
	ondragover={handleDragOver}
	role="application"
	aria-label="Garden field planner canvas"
>
	<!-- Grid background -->
	<GridBackground
		width={canvasWidthPx}
		height={canvasHeightPx}
		{pixelsPerInch}
		{zoom}
	/>

	<!-- Shadow layer (below beds) -->
	{#if sunSimulation.enabled && shadows.length > 0}
		<ShadowLayer {shadows} {canvasState} />
	{/if}

	<!-- Compass rose (fixed position) -->
	{#if sunSimulation.enabled}
		<CompassRose x={50} y={50} size={60} />
	{/if}

	<!-- Beds -->
	{#each beds as bed (bed._id)}
		{@const canvasPos = fieldToCanvas(bed.x, bed.y, canvasState)}
		{@const dims = getBedDimensionsInInches(bed)}
		{@const widthPx = dims.width * pixelsPerInch * zoom}
		{@const heightPx = dims.height * pixelsPerInch * zoom}
		<Bed
			{bed}
			x={canvasPos.x}
			y={canvasPos.y}
			widthPixels={widthPx}
			heightPixels={heightPx}
			{pixelsPerInch}
			{zoom}
			{snapIncrement}
			isSelected={selectedBedId === bed._id}
			onSelect={onSelectBed}
			onMove={handleBedMove}
			onResize={onResizeBed}
			onRotate={onRotateBed}
		/>
	{/each}

	<!-- Plants -->
	{#each plantsWithPositions as plant (plant._id)}
		<PlacedPlant
			{plant}
			cx={plant.canvasX}
			cy={plant.canvasY}
			spacingRadiusPixels={plant.spacingRadiusPixels}
			heightColor={heightColors.get(plant._id) ?? 'hsl(120, 70%, 50%)'}
			hasConflict={conflicts.has(plant._id)}
			isShaded={shadedPlants.has(plant._id)}
			isSelected={selectedPlantId === plant._id}
			onSelect={onSelectPlant}
			onMove={handlePlantMove}
		/>
	{/each}

	<!-- Bed creation preview -->
	{#if isCreatingBed}
		{@const minX = Math.min(bedStartX, bedCurrentX)}
		{@const minY = Math.min(bedStartY, bedCurrentY)}
		{@const width = Math.abs(bedCurrentX - bedStartX)}
		{@const height = Math.abs(bedCurrentY - bedStartY)}
		{#if tool === 'rectangle'}
			<rect
				x={minX}
				y={minY}
				{width}
				{height}
				fill="rgba(139, 69, 19, 0.2)"
				stroke="rgba(139, 69, 19, 0.6)"
				stroke-width="2"
				stroke-dasharray="8 4"
				rx="4"
				ry="4"
			/>
		{:else if tool === 'circle'}
			<ellipse
				cx={minX + width / 2}
				cy={minY + height / 2}
				rx={width / 2}
				ry={height / 2}
				fill="rgba(139, 69, 19, 0.2)"
				stroke="rgba(139, 69, 19, 0.6)"
				stroke-width="2"
				stroke-dasharray="8 4"
			/>
		{/if}
	{/if}
</svg>
