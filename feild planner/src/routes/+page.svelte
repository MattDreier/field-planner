<script lang="ts">
	import FieldCanvas from '$lib/components/canvas/FieldCanvas.svelte';
	import PlantPalette from '$lib/components/sidebar/PlantPalette.svelte';
	import BedTools from '$lib/components/sidebar/BedTools.svelte';
	import SunControls from '$lib/components/sidebar/SunControls.svelte';
	import PlantDetails from '$lib/components/sidebar/PlantDetails.svelte';
	import HeightLegend from '$lib/components/layout/HeightLegend.svelte';
	import ZoomControls from '$lib/components/layout/ZoomControls.svelte';
	import LayoutManager from '$lib/components/layout/LayoutManager.svelte';
	import SnapControls from '$lib/components/layout/SnapControls.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { Tool, DragSource, Bed, PlacedPlant, SunSimulationState } from '$lib/types';
	import type { Id } from '../convex/_generated/dataModel';
	import { Plus } from 'lucide-svelte';
	import { history } from '$lib/stores/history.svelte';
	import { isConvexAvailable } from '$lib/stores/persistence.svelte';
	import type { SnapIncrement } from '$lib/utils/snap';

	// Check if Convex is available (set in .env as VITE_CONVEX_URL)
	const convexAvailable = $derived(isConvexAvailable());

	// Canvas state
	let zoom = $state(1.0);
	let panX = $state(0);
	let panY = $state(0);
	const pixelsPerInch = 12;

	// Selection and tool state
	let currentTool = $state<Tool>('select');
	let selectedBedId = $state<Id<'beds'> | null>(null);
	let selectedPlantId = $state<Id<'placedPlants'> | null>(null);
	let viewingFlowerId = $state<string | null>(null); // For viewing flower details from palette
	let dragSource = $state<DragSource>(null);

	// Snapping state
	let snapIncrement = $state<SnapIncrement>(0);

	// Sun simulation state (default to zone 6b latitude ~40°N, current month)
	let sunSimulation = $state<SunSimulationState>({
		enabled: false,
		latitude: 40,
		month: new Date().getMonth(),
		timeOfDay: 0.5 // noon
	});

	// Default canvas size (in inches - 20ft x 15ft)
	const canvasWidth = 240; // 20 feet
	const canvasHeight = 180; // 15 feet

	// Local state for beds and plants
	let beds = $state<Bed[]>([]);
	let plants = $state<PlacedPlant[]>([]);

	// Derived: get the currently selected bed (must be after beds declaration)
	const selectedBed = $derived(beds.find((b) => b._id === selectedBedId) ?? null);

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

	// Snap actions
	function setSnapIncrement(increment: SnapIncrement) {
		snapIncrement = increment;
	}

	// Selection handlers
	function selectBed(id: Id<'beds'> | null) {
		selectedBedId = id;
		selectedPlantId = null;
	}

	function selectPlant(id: Id<'placedPlants'> | null) {
		// Toggle: clicking same plant again deselects it
		if (id === selectedPlantId) {
			selectedPlantId = null;
		} else {
			selectedPlantId = id;
		}
		selectedBedId = null;
		viewingFlowerId = null; // Clear palette selection when selecting a placed plant
	}

	// Handle clicking a flower in the palette
	function handleFlowerClick(flowerId: string) {
		// Toggle: clicking same flower again closes panel
		if (flowerId === viewingFlowerId) {
			viewingFlowerId = null;
		} else {
			viewingFlowerId = flowerId;
		}
		selectedPlantId = null; // Clear placed plant selection
		selectedBedId = null;
	}

	// Get the selected plant's flower ID for the details panel
	const selectedPlant = $derived(plants.find((p) => p._id === selectedPlantId) ?? null);

	// Determine which flower to show in details panel (placed plant takes priority)
	const detailsFlowerId = $derived(selectedPlant?.flowerId ?? viewingFlowerId);

	// Bed creation handler
	function handleCreateBed(
		shape: 'rectangle' | 'circle',
		x: number,
		y: number,
		widthFeet: number,
		heightFeet?: number
	) {
		// Save state before mutation
		history.push(beds, plants);

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
		// Save state before mutation
		history.push(beds, plants);

		beds = beds.map((b) =>
			b._id === id ? { ...b, x: newX, y: newY } : b
		);
	}

	// Bed resize handler
	function handleResizeBed(id: Id<'beds'>, newWidthFeet: number, newHeightFeet: number) {
		// Save state before mutation
		history.push(beds, plants);

		beds = beds.map((b) =>
			b._id === id
				? { ...b, widthFeet: newWidthFeet, ...(b.shape === 'rectangle' ? { heightFeet: newHeightFeet } : {}) }
				: b
		);
	}

	// Bed rotation handler
	function handleRotateBed(id: Id<'beds'>, rotation: number) {
		// Save state before mutation
		history.push(beds, plants);

		beds = beds.map((b) =>
			b._id === id ? { ...b, rotation } : b
		);
	}

	// Sun simulation update handler
	function handleUpdateSunSimulation(update: Partial<SunSimulationState>) {
		sunSimulation = { ...sunSimulation, ...update };
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
		// Save state before mutation
		history.push(beds, plants);

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
		// Save state before mutation
		history.push(beds, plants);

		plants = plants.map((p) =>
			p._id === id ? { ...p, x, y } : p
		);
	}

	// Delete handler
	function handleDelete() {
		if (selectedPlantId) {
			// Save state before mutation
			history.push(beds, plants);

			plants = plants.filter((p) => p._id !== selectedPlantId);
			selectedPlantId = null;
		} else if (selectedBedId) {
			// Save state before mutation
			history.push(beds, plants);

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

	// Keyboard shortcuts
	function handleKeyDown(e: KeyboardEvent) {
		// Skip if user is typing in an input
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
			return;
		}

		const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
		const modKey = isMac ? e.metaKey : e.ctrlKey;

		if (e.key === 'Delete' || e.key === 'Backspace') {
			// Delete selected item
			e.preventDefault();
			handleDelete();
		}

		if (e.key === 'Escape') {
			// Clear selection
			selectedBedId = null;
			selectedPlantId = null;
		}

		if (modKey && e.key === 'z') {
			e.preventDefault();
			if (e.shiftKey) {
				// Redo: Cmd/Ctrl+Shift+Z
				const snapshot = history.redo();
				if (snapshot) {
					beds = snapshot.beds;
					plants = snapshot.plants;
					selectedBedId = null;
					selectedPlantId = null;
				}
			} else {
				// Undo: Cmd/Ctrl+Z
				const snapshot = history.undo();
				if (snapshot) {
					beds = snapshot.beds;
					plants = snapshot.plants;
					selectedBedId = null;
					selectedPlantId = null;
				}
			}
		}

		// Alternative Redo: Cmd/Ctrl+Y (common on Windows)
		if (modKey && e.key === 'y') {
			e.preventDefault();
			const snapshot = history.redo();
			if (snapshot) {
				beds = snapshot.beds;
				plants = snapshot.plants;
				selectedBedId = null;
				selectedPlantId = null;
			}
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

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
			<LayoutManager
				isConvexAvailable={convexAvailable}
				{beds}
				{plants}
			/>
			<SnapControls {snapIncrement} onSnapChange={setSnapIncrement} />
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
				{selectedBed}
				{snapIncrement}
				onToolChange={setTool}
				onDelete={handleDelete}
				onResizeBed={(id, widthFeet, heightFeet) => handleResizeBed(id as Id<'beds'>, widthFeet, heightFeet ?? widthFeet)}
				onRotateBed={(id, rotation) => handleRotateBed(id as Id<'beds'>, rotation)}
			/>

			<div class="flex-1 overflow-hidden">
				<PlantPalette onDragStart={handleDragStart} onDragEnd={handleDragEnd} onFlowerClick={handleFlowerClick} />
			</div>

			<SunControls {sunSimulation} onUpdate={handleUpdateSunSimulation} />

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
					{snapIncrement}
					{sunSimulation}
					onSelectBed={selectBed}
					onSelectPlant={selectPlant}
					onCreateBed={handleCreateBed}
					onMoveBed={handleMoveBed}
					onResizeBed={handleResizeBed}
					onRotateBed={handleRotateBed}
					onPlacePlant={handlePlacePlant}
					onMovePlant={handleMovePlant}
				/>
			</div>
		</main>

		<!-- Plant details slide-out panel -->
		{#if detailsFlowerId}
			<PlantDetails
				flowerId={detailsFlowerId}
				onClose={() => {
					selectedPlantId = null;
					viewingFlowerId = null;
				}}
			/>
		{/if}
	</div>
</div>
