<script lang="ts">
	import FieldCanvas from '$lib/components/canvas/FieldCanvas.svelte';
	import PlantPalette from '$lib/components/sidebar/PlantPalette.svelte';
	import BedTools from '$lib/components/sidebar/BedTools.svelte';
	import HeightLegend from '$lib/components/layout/HeightLegend.svelte';
	import ZoomControls from '$lib/components/layout/ZoomControls.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { Tool, DragSource, Bed, PlacedPlant } from '$lib/types';
	import type { Id } from '../convex/_generated/dataModel';
	import { Plus } from 'lucide-svelte';

	// Canvas state
	let zoom = $state(1.0);
	let panX = $state(0);
	let panY = $state(0);
	const pixelsPerInch = 12;

	// Selection and tool state
	let currentTool = $state<Tool>('select');
	let selectedBedId = $state<Id<'beds'> | null>(null);
	let selectedPlantId = $state<Id<'placedPlants'> | null>(null);
	let dragSource = $state<DragSource>(null);

	// Default canvas size (in inches - 20ft x 15ft)
	const canvasWidth = 240; // 20 feet
	const canvasHeight = 180; // 15 feet

	// Local state for beds and plants
	let beds = $state<Bed[]>([]);
	let plants = $state<PlacedPlant[]>([]);

	// Calculate height range for legend
	const heightRange = $derived(() => {
		if (plants.length === 0) return { min: 0, max: 0 };
		const heights = plants.map((p) => p.heightMax);
		return { min: Math.min(...heights), max: Math.max(...heights) };
	});

	// Tool actions
	function setTool(tool: Tool) {
		currentTool = tool;
		selectedBedId = null;
		selectedPlantId = null;
	}

	// Zoom actions
	function zoomIn() {
		zoom = Math.min(4, zoom * 1.2);
	}

	function zoomOut() {
		zoom = Math.max(0.25, zoom / 1.2);
	}

	function resetZoom() {
		zoom = 1.0;
		panX = 0;
		panY = 0;
	}

	// Selection handlers
	function selectBed(id: Id<'beds'> | null) {
		selectedBedId = id;
		selectedPlantId = null;
	}

	function selectPlant(id: Id<'placedPlants'> | null) {
		selectedPlantId = id;
		selectedBedId = null;
	}

	// Bed creation handler
	function handleCreateBed(
		shape: 'rectangle' | 'circle',
		x: number,
		y: number,
		widthFeet: number,
		heightFeet?: number
	) {
		const newBed: Bed = {
			_id: `bed-${Date.now()}` as Id<'beds'>,
			layoutId: 'local-layout' as Id<'layouts'>,
			shape,
			x,
			y,
			widthFeet,
			...(shape === 'rectangle' ? { heightFeet: heightFeet! } : {}),
			createdAt: Date.now()
		} as Bed;
		beds = [...beds, newBed];
		setTool('select');
	}

	// Bed move handler
	function handleMoveBed(id: Id<'beds'>, newX: number, newY: number) {
		beds = beds.map((b) =>
			b._id === id ? { ...b, x: newX, y: newY } : b
		);
	}

	// Plant placement handler
	function handlePlacePlant(
		bedId: Id<'beds'>,
		flowerId: string,
		name: string,
		x: number,
		y: number,
		spacingMin: number,
		heightMax: number
	) {
		const newPlant: PlacedPlant = {
			_id: `plant-${Date.now()}` as Id<'placedPlants'>,
			bedId,
			layoutId: 'local-layout' as Id<'layouts'>,
			flowerId,
			name,
			x,
			y,
			spacingMin,
			heightMax,
			createdAt: Date.now()
		};
		plants = [...plants, newPlant];
	}

	// Plant move handler
	function handleMovePlant(id: Id<'placedPlants'>, x: number, y: number) {
		plants = plants.map((p) =>
			p._id === id ? { ...p, x, y } : p
		);
	}

	// Delete handler
	function handleDelete() {
		if (selectedPlantId) {
			plants = plants.filter((p) => p._id !== selectedPlantId);
			selectedPlantId = null;
		} else if (selectedBedId) {
			// Remove bed and its plants
			plants = plants.filter((p) => p.bedId !== selectedBedId);
			beds = beds.filter((b) => b._id !== selectedBedId);
			selectedBedId = null;
		}
	}

	// Drag handlers
	function handleDragStart(source: DragSource) {
		dragSource = source;
	}

	function handleDragEnd() {
		dragSource = null;
	}
</script>

<div class="flex flex-col h-screen">
	<!-- Header -->
	<header class="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
		<div>
			<h1 class="text-2xl font-bold">Field Planner</h1>
			<p class="text-sm text-muted-foreground">
				Plan your garden beds and plant placements
			</p>
		</div>

		<div class="flex items-center gap-4">
			<ZoomControls {zoom} onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetZoom} />
		</div>
	</header>

	<!-- Main content -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Left sidebar -->
		<aside class="w-80 border-r border-border bg-card flex flex-col overflow-hidden">
			<BedTools
				currentTool={currentTool}
				hasSelection={!!selectedBedId || !!selectedPlantId}
				onToolChange={setTool}
				onDelete={handleDelete}
			/>

			<div class="flex-1 overflow-hidden">
				<PlantPalette onDragStart={handleDragStart} onDragEnd={handleDragEnd} />
			</div>

			{#if plants.length > 0}
				<HeightLegend minHeight={heightRange().min} maxHeight={heightRange().max} />
			{/if}
		</aside>

		<!-- Canvas area -->
		<main class="flex-1 overflow-auto p-6 bg-muted/30">
			<div class="inline-block">
				<FieldCanvas
					{canvasWidth}
					{canvasHeight}
					{pixelsPerInch}
					{zoom}
					{panX}
					{panY}
					tool={currentTool}
					{beds}
					{plants}
					{selectedBedId}
					{selectedPlantId}
					{dragSource}
					onSelectBed={selectBed}
					onSelectPlant={selectPlant}
					onCreateBed={handleCreateBed}
					onMoveBed={handleMoveBed}
					onPlacePlant={handlePlacePlant}
					onMovePlant={handleMovePlant}
				/>
			</div>
		</main>
	</div>
</div>
