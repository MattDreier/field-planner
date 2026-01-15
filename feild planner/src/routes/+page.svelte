<script lang="ts">
	import FieldCanvas from '$lib/components/canvas/FieldCanvas.svelte';
	import PlantPalette from '$lib/components/sidebar/PlantPalette.svelte';
	import BedTools from '$lib/components/sidebar/BedTools.svelte';
	import PlantDetails from '$lib/components/sidebar/PlantDetails.svelte';
	import HeightLegend from '$lib/components/layout/HeightLegend.svelte';
	import MapControls from '$lib/components/layout/MapControls.svelte';
		import LayoutManager from '$lib/components/layout/LayoutManager.svelte';
	import TimelinePanel from '$lib/components/timeline/TimelinePanel.svelte';
	import SuccessionPlanner from '$lib/components/timeline/SuccessionPlanner.svelte';
	import { Button } from '$lib/components/ui/button';
	import type { Tool, DragSource, Bed, PlacedPlant, SunSimulationState, GardenSettings, PlantingDates, ScheduleContext } from '$lib/types';
	import type { Id } from '../convex/_generated/dataModel';
	import { Plus, Undo2, Redo2 } from 'lucide-svelte';
	import { history } from '$lib/stores/history.svelte';
	import { isConvexAvailable } from '$lib/stores/persistence.svelte';
	import { timelineState, togglePanel } from '$lib/stores/timeline.svelte';
	import { getFlowerById, FLOWER_DATABASE } from '$lib/data/flowers';
	import { calculateOptimalPlantingDate } from '$lib/utils/scheduling';
	import { untrack } from 'svelte';

	// Check if Convex is available (set in .env as VITE_CONVEX_URL)
	const convexAvailable = $derived(isConvexAvailable());

	// Derived history state for reactivity
	// Access the underlying state directly to ensure proper reactive tracking
	const canUndo = $derived(history.current !== null);
	const canRedo = $derived(history.future.length > 0);

	// Canvas state
	let zoom = $state(1.0);
	let panX = $state(0);
	let panY = $state(0);
	const pixelsPerInch = 12;

	// Selection and tool state
	let currentTool = $state<Tool>('select');
	let selectedBedIds = $state<Set<Id<'beds'>>>(new Set());
	let selectedPlantIds = $state<Set<Id<'placedPlants'>>>(new Set());
	let viewingFlowerId = $state<string | null>(null); // For viewing flower details from palette
	let dragSource = $state<DragSource>(null);
	let showSuccessionPlanner = $state(false);

	// Clipboard for copy/paste
	interface ClipboardData {
		beds: Bed[];
		plants: PlacedPlant[];
	}
	let clipboard = $state<ClipboardData | null>(null);
	const PASTE_OFFSET_INCHES = 24; // 2 feet offset when pasting

	// Derived: backwards-compatible single selection (for components that need it)
	const selectedBedId = $derived(selectedBedIds.size === 1 ? [...selectedBedIds][0] : null);
	const selectedPlantId = $derived(selectedPlantIds.size === 1 ? [...selectedPlantIds][0] : null);

	// Sun simulation state (default to zone 6b latitude ~40°N)
	// Month is derived from the timeline's currentViewDate for unified date control
	let sunSimulationBase = $state<Omit<SunSimulationState, 'month'>>({
		enabled: false,
		latitude: 40,
		timeOfDay: 0.5 // noon
	});

	// Derive shadow month from timeline's current view date
	// Use continuous month value (0-11.99) for smooth sun position interpolation
	const shadowMonth = $derived.by(() => {
		const date = new Date(timelineState.currentViewDate + 'T12:00:00');
		const month = date.getMonth();
		const dayOfMonth = date.getDate();
		const daysInMonth = new Date(date.getFullYear(), month + 1, 0).getDate();
		// Continuous month: e.g., Jan 15 ≈ 0.45, Jan 31 ≈ 0.97, Feb 1 ≈ 1.0
		return month + (dayOfMonth - 1) / daysInMonth;
	});

	// Full sun simulation state with derived month
	const sunSimulation = $derived<SunSimulationState>({
		...sunSimulationBase,
		month: shadowMonth
	});

	// Local state for beds and plants
	let beds = $state<Bed[]>([]);
	let plants = $state<PlacedPlant[]>([]);

	// Initialize history with empty state so first mutation can be undone
	$effect(() => {
		untrack(() => {
			history.initialize([], []);
		});
	});

	// Derived: get the currently selected bed (for single-selection UI like resize panel)
	const selectedBed = $derived(
		selectedBedIds.size === 1 ? beds.find((b) => selectedBedIds.has(b._id)) ?? null : null
	);

	// Calculate height range for legend
	const heightRange = $derived(() => {
		if (plants.length === 0) return { min: 0, max: 0 };
		const heights = plants.map((p) => p.heightMax);
		return { min: Math.min(...heights), max: Math.max(...heights) };
	});

	// Tool actions
	function setTool(tool: Tool) {
		currentTool = tool;
		selectedBedIds = new Set();
		selectedPlantIds = new Set();
	}

	// Zoom actions
	function zoomIn() {
		zoom = Math.min(4, zoom * 1.2);
	}

	function zoomOut() {
		zoom = Math.max(0.1, zoom / 1.2);
	}

	function resetZoom() {
		zoom = 1.0;
		panX = 0;
		panY = 0;
	}

	// Zoom with pivot point (used by wheel zoom)
	function handleZoomWithPivot(newZoom: number, pivotFieldX: number, pivotFieldY: number) {
		// Keep the pivot point fixed on screen while zooming
		const newPanX = panX + pivotFieldX * pixelsPerInch * (zoom - newZoom);
		const newPanY = panY + pivotFieldY * pixelsPerInch * (zoom - newZoom);

		zoom = newZoom;
		panX = newPanX;
		panY = newPanY;
	}

	// Pan handler
	function handlePan(deltaX: number, deltaY: number) {
		panX = panX + deltaX;
		panY = panY + deltaY;
	}

	// Selection handlers with multi-selection support
	function selectBed(id: Id<'beds'> | null, shiftKey = false) {
		if (id === null) {
			// Clicked empty space - clear all
			selectedBedIds = new Set();
			selectedPlantIds = new Set();
			return;
		}

		if (shiftKey) {
			// Shift+click: toggle in selection
			const newSet = new Set(selectedBedIds);
			if (newSet.has(id)) {
				newSet.delete(id);
			} else {
				newSet.add(id);
			}
			selectedBedIds = newSet;
		} else {
			// Regular click: single selection (toggle if same)
			if (selectedBedIds.size === 1 && selectedBedIds.has(id)) {
				selectedBedIds = new Set();
			} else {
				selectedBedIds = new Set([id]);
			}
			selectedPlantIds = new Set();
		}
	}

	function selectPlant(id: Id<'placedPlants'> | null, shiftKey = false) {
		if (id === null) {
			selectedPlantIds = new Set();
			return;
		}

		if (shiftKey) {
			// Shift+click: toggle in selection
			const newSet = new Set(selectedPlantIds);
			if (newSet.has(id)) {
				newSet.delete(id);
			} else {
				newSet.add(id);
			}
			selectedPlantIds = newSet;
		} else {
			// Regular click: single selection (toggle if same)
			if (selectedPlantIds.size === 1 && selectedPlantIds.has(id)) {
				selectedPlantIds = new Set();
			} else {
				selectedPlantIds = new Set([id]);
			}
			selectedBedIds = new Set();
		}
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
		selectedPlantIds = new Set(); // Clear placed plant selection
		selectedBedIds = new Set();
	}

	// Succession planner handlers
	function openSuccessionPlanner() {
		showSuccessionPlanner = true;
	}

	function closeSuccessionPlanner() {
		showSuccessionPlanner = false;
	}

	// Get the selected plant's flower ID for the details panel (single selection only)
	const selectedPlant = $derived(
		selectedPlantIds.size === 1 ? plants.find((p) => selectedPlantIds.has(p._id)) ?? null : null
	);

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

	// Handler called once at the start of any drag/resize operation (for history snapshot)
	function handleMoveStart() {
		history.push(beds, plants);
	}

	// Bed move handler (called continuously during drag - history saved at drag start)
	function handleMoveBed(id: Id<'beds'>, newX: number, newY: number) {
		beds = beds.map((b) =>
			b._id === id ? { ...b, x: newX, y: newY } : b
		);
	}

	// Bed resize handler (called continuously during resize - history saved at drag start)
	function handleResizeBed(id: Id<'beds'>, newWidthFeet: number, newHeightFeet: number) {
		beds = beds.map((b) =>
			b._id === id
				? { ...b, widthFeet: newWidthFeet, ...(b.shape === 'rectangle' ? { heightFeet: newHeightFeet } : {}) }
				: b
		);
	}

	// Bed rotation handler (called continuously during rotation - history saved at rotation start)
	function handleRotateBed(id: Id<'beds'>, rotation: number) {
		beds = beds.map((b) =>
			b._id === id ? { ...b, rotation } : b
		);
	}

	// Sun simulation update handler (month is now controlled by timeline, so we filter it out)
	function handleUpdateSunSimulation(update: Partial<SunSimulationState>) {
		const { month: _month, ...rest } = update;
		sunSimulationBase = { ...sunSimulationBase, ...rest };
	}

	// Determine if a flower should be started indoors based on its data
	function isIndoorStartFlower(flowerId: string): boolean {
		const flower = getFlowerById(flowerId);
		if (!flower) return false;

		// Check propagation method - transplant implies indoor start
		if (flower.propagationMethod === 'transplant') return true;

		// For seed-propagated plants, check the whenToPlant instructions
		if (flower.propagationMethod === 'seed') {
			const whenToPlant = flower.whenToPlant.toLowerCase();
			// Indoor start indicators
			if (whenToPlant.includes('start indoors') || whenToPlant.includes('indoor')) {
				return true;
			}
			// Direct sow indicators - explicit check
			if (whenToPlant.includes('direct sow') || whenToPlant.includes('direct seed')) {
				return false;
			}
		}

		// Corms and divisions are planted directly
		if (flower.propagationMethod === 'corm' || flower.propagationMethod === 'division') {
			return false;
		}

		// Default to direct sow for seeds without explicit indoor instructions
		return false;
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

		// Get flower data for scheduling
		const flower = FLOWER_DATABASE.find(f => f.id === flowerId);

		let plantingDates: PlantingDates;

		if (flower?.plantingSchedule) {
			// Use zone-aware auto-scheduling
			const context: ScheduleContext = {
				zone: timelineState.gardenSettings.hardinessZone,
				lastFrostDate: new Date(timelineState.gardenSettings.lastFrostDate + 'T12:00:00'),
				firstFrostDate: new Date(timelineState.gardenSettings.firstFrostDate + 'T12:00:00'),
				year: new Date().getFullYear()
			};
			plantingDates = calculateOptimalPlantingDate(flower.plantingSchedule, context);
		} else {
			// Fallback for flowers without schedule
			const currentDate = timelineState.currentViewDate;
			plantingDates = isIndoorStartFlower(flowerId)
				? { indoorStartDate: currentDate }
				: { directSowDate: currentDate };
		}

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
			plantingDates,
			createdAt: Date.now()
		};
		plants = [...plants, newPlant];
	}

	// Plant move handler (called continuously during drag - history saved at drag start)
	function handleMovePlant(id: Id<'placedPlants'>, x: number, y: number) {
		plants = plants.map((p) =>
			p._id === id ? { ...p, x, y } : p
		);
	}

	// Delete handler - supports multi-selection
	function handleDelete() {
		if (selectedPlantIds.size > 0 || selectedBedIds.size > 0) {
			// Save state before mutation
			history.push(beds, plants);

			// Delete selected plants
			if (selectedPlantIds.size > 0) {
				plants = plants.filter((p) => !selectedPlantIds.has(p._id));
			}

			// Delete selected beds and their plants
			if (selectedBedIds.size > 0) {
				plants = plants.filter((p) => !selectedBedIds.has(p.bedId));
				beds = beds.filter((b) => !selectedBedIds.has(b._id));
			}

			selectedPlantIds = new Set();
			selectedBedIds = new Set();
		}
	}

	// Update plant dates handler (for timeline scheduling)
	function handleUpdatePlantDates(plantId: string, dates: PlantingDates) {
		// Save state before mutation
		history.push(beds, plants);

		plants = plants.map((p) =>
			p._id === plantId
				? { ...p, plantingDates: dates }
				: p
		);
	}

	// Drag handlers
	function handleDragStart(source: DragSource) {
		dragSource = source;
	}

	function handleDragEnd() {
		dragSource = null;
	}

	// Copy/Paste/Select All handlers
	function handleCopy() {
		if (selectedBedIds.size === 0 && selectedPlantIds.size === 0) return;

		const copiedBeds = beds.filter((b) => selectedBedIds.has(b._id));
		const copiedPlants = plants.filter((p) => selectedPlantIds.has(p._id));

		clipboard = { beds: copiedBeds, plants: copiedPlants };
	}

	function handlePaste() {
		if (!clipboard || (clipboard.beds.length === 0 && clipboard.plants.length === 0)) return;

		history.push(beds, plants);

		// Map old bed IDs to new bed IDs (for reassigning plants to copied beds)
		const bedIdMap = new Map<Id<'beds'>, Id<'beds'>>();
		const newBedIds = new Set<Id<'beds'>>();
		const newPlantIds = new Set<Id<'placedPlants'>>();

		// Paste beds with offset
		clipboard.beds.forEach((bed) => {
			const newId = `bed-${Date.now()}-${Math.random().toString(36).slice(2)}` as Id<'beds'>;
			bedIdMap.set(bed._id, newId);

			const newBed = {
				...bed,
				_id: newId,
				x: bed.x + PASTE_OFFSET_INCHES,
				y: bed.y + PASTE_OFFSET_INCHES,
				createdAt: Date.now()
			} as Bed;
			beds = [...beds, newBed];
			newBedIds.add(newId);
		});

		// Paste plants
		clipboard.plants.forEach((plant) => {
			const newId = `plant-${Date.now()}-${Math.random().toString(36).slice(2)}` as Id<'placedPlants'>;

			// Determine target bed:
			// - If plant's original bed was also copied, use the new bed
			// - Else if a single different bed is selected, paste there
			// - Else use original bed
			let targetBedId = plant.bedId;
			let shouldOffset = true;

			if (bedIdMap.has(plant.bedId)) {
				// Plant's bed was copied - put plant in the new bed
				targetBedId = bedIdMap.get(plant.bedId)!;
			} else if (selectedBedIds.size === 1) {
				// A single bed is selected - paste plant there
				const selectedBed = [...selectedBedIds][0];
				if (selectedBed !== plant.bedId) {
					targetBedId = selectedBed;
					shouldOffset = false; // Don't offset when pasting to different bed
				}
			}

			const newPlant: PlacedPlant = {
				...plant,
				_id: newId,
				bedId: targetBedId,
				x: shouldOffset ? plant.x + PASTE_OFFSET_INCHES : plant.x,
				y: shouldOffset ? plant.y + PASTE_OFFSET_INCHES : plant.y,
				createdAt: Date.now()
			};
			plants = [...plants, newPlant];
			newPlantIds.add(newId);
		});

		// Select newly pasted items
		selectedBedIds = newBedIds;
		selectedPlantIds = newPlantIds;
	}

	function handleSelectAll() {
		selectedBedIds = new Set(beds.map((b) => b._id));
		selectedPlantIds = new Set(plants.map((p) => p._id));
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
			// Delete selected items
			e.preventDefault();
			handleDelete();
		}

		if (e.key === 'Escape') {
			// Clear selection
			selectedBedIds = new Set();
			selectedPlantIds = new Set();
		}

		// Toggle timeline panel with 'T'
		if (e.key === 't' || e.key === 'T') {
			e.preventDefault();
			togglePanel();
		}

		// Copy: Cmd/Ctrl+C
		if (modKey && e.key === 'c') {
			e.preventDefault();
			handleCopy();
		}

		// Paste: Cmd/Ctrl+V
		if (modKey && e.key === 'v') {
			e.preventDefault();
			handlePaste();
		}

		// Select All: Cmd/Ctrl+A
		if (modKey && e.key === 'a') {
			e.preventDefault();
			handleSelectAll();
		}

		if (modKey && e.key === 'z') {
			e.preventDefault();
			if (e.shiftKey) {
				handleRedo();
			} else {
				handleUndo();
			}
		}

		// Alternative Redo: Cmd/Ctrl+Y (common on Windows)
		if (modKey && e.key === 'y') {
			e.preventDefault();
			handleRedo();
		}
	}

	// Undo/Redo handlers (used by both keyboard shortcuts and buttons)
	function handleUndo() {
		// Pass current state so history can save it for redo
		const snapshot = history.undo(beds, plants);
		if (snapshot) {
			beds = snapshot.beds;
			plants = snapshot.plants;
			selectedBedIds = new Set();
			selectedPlantIds = new Set();
		}
	}

	function handleRedo() {
		// Pass current state so history can save it as checkpoint for undo
		const snapshot = history.redo(beds, plants);
		if (snapshot) {
			beds = snapshot.beds;
			plants = snapshot.plants;
			selectedBedIds = new Set();
			selectedPlantIds = new Set();
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
			<!-- Undo/Redo buttons -->
			<div class="flex items-center gap-1">
				<Button
					variant="ghost"
					size="icon"
					onclick={handleUndo}
					disabled={!canUndo}
					title="Undo (Cmd+Z)"
					class="h-9 w-9"
				>
					<Undo2 class="h-4 w-4" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					onclick={handleRedo}
					disabled={!canRedo}
					title="Redo (Cmd+Shift+Z)"
					class="h-9 w-9"
				>
					<Redo2 class="h-4 w-4" />
				</Button>
			</div>

			<LayoutManager
				isConvexAvailable={convexAvailable}
				{beds}
				{plants}
			/>
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
				{sunSimulation}
				onToolChange={setTool}
				onDelete={handleDelete}
				onResizeBed={(id, widthFeet, heightFeet) => handleResizeBed(id as Id<'beds'>, widthFeet, heightFeet ?? widthFeet)}
				onRotateBed={(id, rotation) => handleRotateBed(id as Id<'beds'>, rotation)}
				onUpdateSunSimulation={handleUpdateSunSimulation}
			/>

			<div class="flex-1 overflow-hidden">
				<PlantPalette onDragStart={handleDragStart} onDragEnd={handleDragEnd} onFlowerClick={handleFlowerClick} />
			</div>

			{#if plants.length > 0}
				<HeightLegend minHeight={heightRange().min} maxHeight={heightRange().max} />
			{/if}
		</aside>

		<!-- Canvas area (infinite canvas fills available space) -->
		<main class="flex-1 overflow-hidden bg-muted/30 relative">
			<FieldCanvas
				{pixelsPerInch}
				{zoom}
				{panX}
				{panY}
				tool={currentTool}
				{beds}
				{plants}
				{selectedBedIds}
				{selectedPlantIds}
				{dragSource}
				{sunSimulation}
				onSelectBed={selectBed}
				onSelectPlant={selectPlant}
				onCreateBed={handleCreateBed}
				onMoveBed={handleMoveBed}
				onResizeBed={handleResizeBed}
				onRotateBed={handleRotateBed}
				onPlacePlant={handlePlacePlant}
				onMovePlant={handleMovePlant}
				onMoveStart={handleMoveStart}
				onPan={handlePan}
				onZoom={handleZoomWithPivot}
			/>
			<!-- Canvas overlay controls -->
			<MapControls
				onZoomIn={zoomIn}
				onZoomOut={zoomOut}
				onReset={resetZoom}
			/>
			<!-- Timeline panel -->
			<TimelinePanel
				{beds}
				{plants}
				gardenSettings={timelineState.gardenSettings}
				onOpenSuccessionPlanner={openSuccessionPlanner}
				onUpdatePlantDates={handleUpdatePlantDates}
			/>
		</main>

		<!-- Plant details slide-out panel -->
		{#if detailsFlowerId}
			<PlantDetails
				flowerId={detailsFlowerId}
				selectedPlant={selectedPlant}
				onClose={() => {
					selectedPlantIds = new Set();
					viewingFlowerId = null;
				}}
			/>
		{/if}
	</div>

	<!-- Succession planner modal -->
	{#if showSuccessionPlanner}
		<SuccessionPlanner
			{beds}
			layoutId={'local-layout' as Id<'layouts'>}
			onClose={closeSuccessionPlanner}
		/>
	{/if}
</div>
