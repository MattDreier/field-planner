<script lang="ts">
	import GridBackground from './GridBackground.svelte';
	import Bed from './Bed.svelte';
	import FenceComponent from './Fence.svelte';
	import PlantMarker from './PlantMarker.svelte';
	import ShadowLayer from './ShadowLayer.svelte';
	import SmartGuides from './SmartGuides.svelte';
	import SelectionDistance from './SelectionDistance.svelte';
	import type { Bed as BedType, PlacedPlant as PlacedPlantType, Fence as FenceType, FenceVertex, Tool, DragSource, SunSimulationState } from '$lib/types';
	import { getBedDimensionsInInches } from '$lib/types';
	import { fieldToCanvas, canvasToField, bedLocalToField } from '$lib/utils/coordinates';
	import { detectSpacingConflicts } from '$lib/utils/collision';
	import { calculateHeightColors } from '$lib/utils/color';
	import {
		calculateSmartGuides,
		calculateSelectionDistance,
		getBedBoundingBox,
		createBoundingBox,
		createCircleBoundingBox,
		type AlignmentGuide,
		type DiagonalGuide,
		type DistanceIndicator,
		type BoundingBox,
		type SelectionDistanceResult
	} from '$lib/utils/smartGuides';
	import { calculateSunPosition } from '$lib/utils/sun';
	import { calculateAllShadows, calculateFenceShadows, calculateBedShadows, detectShadedPlants, fencesToStructures, bedsToStructures, type BedForShadow } from '$lib/utils/shadow';
	import { calculateLifecyclePhases, getPlantVisibilityAtDate, getPlantHeightAtDate, type LifecyclePhase, type PlantVisibility } from '$lib/utils/timeline';
	import { timelineState, updatePlannedPlantPosition } from '$lib/stores/timeline.svelte';
	import { getPlantById, type PlantData } from '$lib/data/plants';
	import { getUserPlants } from '$lib/stores/userPlants.svelte';
	import type { Id } from '../../../convex/_generated/dataModel';
	import type { PlannedPlant, PlantingDates } from '$lib/types';

	interface BedDefaults {
		widthFeet: number;
		heightFeet: number;
		rotation: number;
		raisedBedHeightFeet?: number;
	}

	interface FenceDefaults {
		heightFeet: number;
	}

	interface Props {
		pixelsPerInch: number;
		zoom: number;
		panX: number;
		panY: number;
		rotation?: number; // Field rotation in degrees (0-360), clockwise from North
		snapEnabled?: boolean;
		tool: Tool;
		beds: BedType[];
		plants: PlacedPlantType[];
		fences?: FenceType[];
		selectedBedIds: Set<Id<'beds'>>;
		selectedPlantIds: Set<Id<'placedPlants'>>;
		selectedFenceIds?: Set<Id<'fences'>>;
		dragSource: DragSource;
		sunSimulation: SunSimulationState;
		bedDefaults?: BedDefaults;
		fenceDefaults?: FenceDefaults;
		onSelectBed: (id: Id<'beds'> | null, shiftKey?: boolean) => void;
		onSelectPlant: (id: Id<'placedPlants'> | null, shiftKey?: boolean) => void;
		onSelectFence?: (id: Id<'fences'> | null, shiftKey?: boolean) => void;
		onCreateBed: (shape: 'rectangle' | 'circle', x: number, y: number, widthFeet: number, heightFeet?: number) => void;
		onCreateFence?: (vertices: FenceVertex[], heightFeet: number) => void;
		onMoveBed: (id: Id<'beds'>, newX: number, newY: number) => void;
		onResizeBed: (id: Id<'beds'>, newWidthFeet: number, newHeightFeet: number) => void;
		onRotateBed: (id: Id<'beds'>, rotation: number) => void;
		onMoveFence?: (id: Id<'fences'>, deltaX: number, deltaY: number) => void;
		onMoveVertex?: (fenceId: Id<'fences'>, vertexIndex: number, x: number, y: number) => void;
		onPlacePlant: (bedId: Id<'beds'>, flowerId: string, name: string, x: number, y: number, spacingMin: number, heightMax: number) => void;
		onMovePlant: (id: Id<'placedPlants'>, x: number, y: number) => void;
		onMoveStart?: () => void; // Called once when a drag/resize begins (for history snapshot)
		onSnapOverrideChange?: (active: boolean) => void; // Called when Alt key toggles snap override during drag
		onPan: (deltaX: number, deltaY: number) => void;
		onZoom: (newZoom: number, pivotX: number, pivotY: number) => void;
	}

	let {
		pixelsPerInch,
		zoom,
		panX,
		panY,
		rotation = 0,
		snapEnabled = true,
		tool,
		beds,
		plants,
		fences = [],
		selectedBedIds,
		selectedPlantIds,
		selectedFenceIds = new Set(),
		dragSource,
		sunSimulation,
		bedDefaults = { widthFeet: 4, heightFeet: 8, rotation: 0, raisedBedHeightFeet: 0 },
		fenceDefaults = { heightFeet: 6 },
		onSelectBed,
		onSelectPlant,
		onSelectFence,
		onCreateBed,
		onCreateFence,
		onMoveBed,
		onResizeBed,
		onRotateBed,
		onMoveFence,
		onMoveVertex,
		onPlacePlant,
		onMovePlant,
		onMoveStart,
		onSnapOverrideChange,
		onPan,
		onZoom
	}: Props = $props();

	// Local selection state for planned plants (not managed by parent)
	let selectedPlannedPlantIds = $state<Set<Id<'plannedPlants'>>>(new Set());

	function selectPlannedPlant(id: Id<'plannedPlants'> | null, shiftKey = false) {
		if (id === null) {
			selectedPlannedPlantIds = new Set();
			return;
		}

		if (shiftKey) {
			// Shift+click: toggle in selection (allows cross-type selection for distance measurement)
			const newSet = new Set(selectedPlannedPlantIds);
			if (newSet.has(id)) {
				newSet.delete(id);
			} else {
				newSet.add(id);
			}
			selectedPlannedPlantIds = newSet;
			// Don't clear other selections with shift - allows mixed selection
		} else {
			// Regular click: single selection (toggle if same)
			if (selectedPlannedPlantIds.size === 1 && selectedPlannedPlantIds.has(id)) {
				selectedPlannedPlantIds = new Set();
			} else {
				selectedPlannedPlantIds = new Set([id]);
			}
			// Clear other selections only on regular click
			onSelectPlant(null);
			onSelectBed(null);
		}
	}

	// Smart guides state
	let activeGuides = $state<AlignmentGuide[]>([]);
	let activeDiagonalGuides = $state<DiagonalGuide[]>([]);
	let activeDistances = $state<DistanceIndicator[]>([]);

	// Track snap override state (Alt key during drag)
	let lastSnapOverride = $state(false);
	function updateSnapOverride(disableSnap: boolean) {
		if (disableSnap !== lastSnapOverride) {
			lastSnapOverride = disableSnap;
			onSnapOverrideChange?.(disableSnap);
		}
	}

	// Snap threshold in pixels (converted to inches based on zoom)
	// Lower value = less aggressive snapping, easier to position freely
	const SNAP_THRESHOLD_PX = 4;

	// Selection distance calculation (for exactly 2 selected objects - beds, placed plants, or planned plants)
	const selectionDistanceInfo = $derived.by((): { info: SelectionDistanceResult; secondObjectId: string; secondObjectType: 'bed' | 'plant' | 'planned' } | null => {
		const totalSelected = selectedBedIds.size + selectedPlantIds.size + selectedPlannedPlantIds.size;
		if (totalSelected !== 2) return null;

		// Gather selected objects with their bounding boxes
		const selectedObjects: Array<{ id: string; type: 'bed' | 'plant' | 'planned'; box: BoundingBox }> = [];

		for (const bedId of selectedBedIds) {
			const bed = beds.find((b) => b._id === bedId);
			if (bed) {
				selectedObjects.push({
					id: bedId,
					type: 'bed',
					box: getBedBoundingBox(bed)
				});
			}
		}

		for (const plantId of selectedPlantIds) {
			const plant = plants.find((p) => p._id === plantId);
			if (plant) {
				const bed = beds.find((b) => b._id === plant.bedId);
				if (bed) {
					const fieldX = plant.x + bed.x;
					const fieldY = plant.y + bed.y;
					const radius = plant.spacingMin / 2;
					selectedObjects.push({
						id: plantId,
						type: 'plant',
						box: createCircleBoundingBox(plantId, fieldX, fieldY, radius)
					});
				}
			}
		}

		// Include planned plants in selection distance
		for (const plannedId of selectedPlannedPlantIds) {
			const planned = plannedPlantsWithPositions.find((p) => p._id === plannedId);
			if (planned) {
				const radius = planned.flowerData.spacingMin / 2;
				selectedObjects.push({
					id: plannedId,
					type: 'planned',
					box: createCircleBoundingBox(plannedId, planned.absoluteX, planned.absoluteY, radius)
				});
			}
		}

		if (selectedObjects.length !== 2) return null;

		const distanceResult = calculateSelectionDistance(selectedObjects[0].box, selectedObjects[1].box);
		if (!distanceResult) return null;

		// The second object in selection order will be moved
		return {
			info: distanceResult,
			secondObjectId: selectedObjects[1].id,
			secondObjectType: selectedObjects[1].type
		};
	});

	// Handle distance change from the selection overlay
	function handleSelectionDistanceChange(newDistance: number) {
		if (!selectionDistanceInfo) return;

		const { info, secondObjectId, secondObjectType } = selectionDistanceInfo;
		const currentDistance = info.distance;
		const delta = newDistance - currentDistance;

		// Move the second object along the direction vector
		const moveX = info.direction.x * delta;
		const moveY = info.direction.y * delta;

		// Save history snapshot before moving
		onMoveStart?.();

		if (secondObjectType === 'bed') {
			const bed = beds.find((b) => b._id === secondObjectId);
			if (bed) {
				onMoveBed(secondObjectId as Id<'beds'>, bed.x + moveX, bed.y + moveY);
			}
		} else if (secondObjectType === 'plant') {
			const plant = plants.find((p) => p._id === secondObjectId);
			if (plant) {
				onMovePlant(secondObjectId as Id<'placedPlants'>, plant.x + moveX, plant.y + moveY);
			}
		} else if (secondObjectType === 'planned') {
			const planned = plannedPlantsWithPositions.find((p) => p._id === secondObjectId);
			if (planned) {
				// Move planned plant by delta, clamped to bed bounds
				const newX = planned.localX + moveX;
				const newY = planned.localY + moveY;
				const bedDims = getBedDimensionsInInches(planned.bed);
				const clampedX = Math.max(0, Math.min(bedDims.width, newX));
				const clampedY = Math.max(0, Math.min(bedDims.height, newY));
				updatePlannedPlantPosition(secondObjectId as Id<'plannedPlants'>, clampedX, clampedY);
			}
		}
	}

	// SVG element reference for size tracking
	let svgElement = $state<SVGSVGElement | null>(null);
	let viewportWidth = $state(800);
	let viewportHeight = $state(600);

	// Track viewport size with ResizeObserver
	$effect(() => {
		if (!svgElement) return;

		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				viewportWidth = entry.contentRect.width;
				viewportHeight = entry.contentRect.height;
			}
		});

		resizeObserver.observe(svgElement);
		return () => resizeObserver.disconnect();
	});

	// Canvas state helper
	const canvasState = $derived({ zoom, panX, panY, pixelsPerInch });

	// Panning state
	let isPanning = $state(false);
	let panStartX = $state(0);
	let panStartY = $state(0);

	// Handle wheel zoom (zoom toward cursor)
	function handleWheel(e: WheelEvent) {
		e.preventDefault();

		const rect = svgElement?.getBoundingClientRect();
		if (!rect) return;

		// Get mouse position relative to viewport
		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;

		// Zoom factor (invert for natural scrolling feel)
		const delta = e.deltaY > 0 ? 0.9 : 1.1;
		const newZoom = Math.min(4, Math.max(0.1, zoom * delta));

		// Pivot point in field coordinates (before zoom)
		const pivotFieldX = (mouseX - panX) / (pixelsPerInch * zoom);
		const pivotFieldY = (mouseY - panY) / (pixelsPerInch * zoom);

		onZoom(newZoom, pivotFieldX, pivotFieldY);
	}

	// Current view date for filtering plants
	const currentViewDate = $derived(new Date(timelineState.currentViewDate + 'T12:00:00'));

	// Compute plant positions with absolute coordinates and visibility filtering
	const plantsWithPositions = $derived.by(() => {
		return plants.map((plant) => {
			const bed = beds.find((b) => b._id === plant.bedId);
			if (!bed) return null;

			// Calculate visibility based on current timeline date
			let visibility: PlantVisibility = { isVisible: true, currentPhase: null, phaseLabel: null, phaseColor: null, phaseProgress: 0 };
			let currentHeight = plant.heightMax; // Default to max height

			const flowerData = getPlantById(plant.flowerId, getUserPlants());
			if (plant.plantingDates && flowerData) {
				const phases = calculateLifecyclePhases(plant.plantingDates, flowerData);
				visibility = getPlantVisibilityAtDate(phases, currentViewDate);
				// Calculate growth-aware height for shadows
				currentHeight = getPlantHeightAtDate(plant.plantingDates, flowerData, currentViewDate);
			}

			// Filter out plants that aren't visible at current date
			if (!visibility.isVisible && plant.plantingDates) {
				return null;
			}

			const absolutePos = bedLocalToField(plant.x, plant.y, bed);
			const canvasPos = fieldToCanvas(absolutePos.x, absolutePos.y, canvasState);
			const spacingRadiusPixels = (plant.spacingMin / 2) * pixelsPerInch * zoom;

			return {
				...plant,
				absoluteX: absolutePos.x,
				absoluteY: absolutePos.y,
				canvasX: canvasPos.x,
				canvasY: canvasPos.y,
				spacingRadiusPixels,
				visibility,
				currentHeight
			};
		}).filter(Boolean) as Array<PlacedPlantType & {
			absoluteX: number;
			absoluteY: number;
			canvasX: number;
			canvasY: number;
			spacingRadiusPixels: number;
			visibility: PlantVisibility;
			currentHeight: number;
		}>;
	});

	// Compute planned plant positions (auto-positioned at bed center)
	const plannedPlantsWithPositions = $derived.by(() => {
		return timelineState.plannedPlants
			.map((planned) => {
				const bed = beds.find((b) => b._id === planned.bedId);
				if (!bed) return null;

				// Get flower data for spacing and visibility calculations
				const flowerData = getPlantById(planned.flowerId, getUserPlants());
				if (!flowerData) return null;

				// Calculate visibility based on current timeline date
				let visibility: PlantVisibility = { isVisible: true, currentPhase: null, phaseLabel: null, phaseColor: null, phaseProgress: 0 };

				if (planned.plantingDates) {
					const phases = calculateLifecyclePhases(planned.plantingDates, flowerData);
					visibility = getPlantVisibilityAtDate(phases, currentViewDate);
				}

				// Filter out plants that aren't visible at current date
				if (!visibility.isVisible) {
					return null;
				}

				// Use stored position if available, otherwise place along top edge of bed
				const bedDims = getBedDimensionsInInches(bed);
				let localX = planned.x;
				let localY = planned.y;

				if (localX === undefined || localY === undefined) {
					// Place succession plants in a row along the top edge, outside the bed
					const index = planned.successionIndex ?? 0;
					const spacing = flowerData.spacingMin;
					const startX = spacing / 2; // Start half-spacing from left edge
					localX = startX + index * spacing;
					localY = -spacing / 2; // Above the bed (negative Y = outside top edge)
				}

				// Convert to absolute field coordinates
				const absolutePos = bedLocalToField(localX, localY, bed);
				const canvasPos = fieldToCanvas(absolutePos.x, absolutePos.y, canvasState);
				const spacingRadiusPixels = (flowerData.spacingMin / 2) * pixelsPerInch * zoom;

				return {
					...planned,
					flowerData,
					bed,
					localX,
					localY,
					absoluteX: absolutePos.x,
					absoluteY: absolutePos.y,
					canvasX: canvasPos.x,
					canvasY: canvasPos.y,
					spacingRadiusPixels,
					visibility
				};
			})
			.filter(Boolean) as Array<
				PlannedPlant & {
					flowerData: PlantData;
					bed: BedType;
					localX: number;
					localY: number;
					absoluteX: number;
					absoluteY: number;
					canvasX: number;
					canvasY: number;
					spacingRadiusPixels: number;
					visibility: PlantVisibility;
				}
			>;
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

	// Combine placed + planned plants for shadow calculations
	const allPlantsForShadow = $derived.by(() => {
		const placed = plantsWithPositions.map((p) => ({
			id: p._id,
			x: p.absoluteX,
			y: p.absoluteY,
			heightMax: p.currentHeight // Growth-aware height based on timeline date
		}));

		const planned = plannedPlantsWithPositions.map((p) => ({
			id: p._id,
			x: p.absoluteX,
			y: p.absoluteY,
			heightMax: getPlantHeightAtDate(p.plantingDates, p.flowerData, currentViewDate)
		}));

		return [...placed, ...planned];
	});

	// Calculate shadows for all plants (placed + planned)
	const shadows = $derived.by(() => {
		if (!sunPosition || sunPosition.isNight) return [];
		return calculateAllShadows(allPlantsForShadow, sunPosition);
	});

	// Calculate fence shadows
	const fenceShadows = $derived.by(() => {
		if (!sunPosition || sunPosition.isNight || fences.length === 0) return [];
		const fencesForShadow = fences.map(f => ({
			id: f._id,
			vertices: f.vertices,
			heightFeet: f.heightFeet
		}));
		return calculateFenceShadows(fencesForShadow, sunPosition);
	});

	// Prepare beds for shadow calculations (only raised beds cast shadows)
	const bedsForShadow = $derived.by((): BedForShadow[] => {
		return beds
			.filter(b => (b.raisedBedHeightFeet ?? 0) > 0)
			.map(b => ({
				id: b._id,
				x: b.x,
				y: b.y,
				widthInches: b.widthFeet * 12,
				heightInches: (b.shape === 'rectangle' ? b.heightFeet : b.widthFeet) * 12,
				raisedBedHeightFeet: b.raisedBedHeightFeet ?? 0,
				rotation: b.rotation,
				shape: b.shape
			}));
	});

	// Calculate bed shadows (for raised beds)
	const bedShadows = $derived.by(() => {
		if (!sunPosition || sunPosition.isNight || bedsForShadow.length === 0) return [];
		return calculateBedShadows(bedsForShadow, sunPosition);
	});

	// Combined shadows for rendering (fence + bed shadows)
	const allStructureShadows = $derived([...fenceShadows, ...bedShadows]);

	// Detect which plants are being shaded (by plants, fences, AND raised beds)
	const shadedPlants = $derived.by(() => {
		if (!sunPosition || sunPosition.isNight) return new Set<string>();

		// Build structures array from fences and raised beds
		const fencesForShadow = fences.map(f => ({
			id: f._id,
			vertices: f.vertices,
			heightFeet: f.heightFeet
		}));
		const fenceStructures = fencesToStructures(fencesForShadow);
		const bedStructures = bedsToStructures(bedsForShadow);
		const allStructures = [...fenceStructures, ...bedStructures];

		return detectShadedPlants(allPlantsForShadow, sunPosition, allStructures);
	});

	// Bed creation drag state
	let isCreatingBed = $state(false);
	let bedStartX = $state(0);
	let bedStartY = $state(0);
	let bedCurrentX = $state(0);
	let bedCurrentY = $state(0);

	// Fence creation state
	let isCreatingFence = $state(false);
	let fenceVertices = $state<Array<{ x: number; y: number }>>([]);
	let fencePreviewPoint = $state<{ x: number; y: number } | null>(null);

	// Finish fence creation (called by double-click or Enter key)
	function finishFence() {
		if (fenceVertices.length >= 2 && onCreateFence) {
			onCreateFence(fenceVertices, fenceDefaults.heightFeet);
		}
		// Reset fence creation state
		isCreatingFence = false;
		fenceVertices = [];
		fencePreviewPoint = null;
	}

	// Cancel fence creation (called by Escape key)
	function cancelFence() {
		isCreatingFence = false;
		fenceVertices = [];
		fencePreviewPoint = null;
	}

	function handleCanvasPointerDown(e: PointerEvent) {
		if (e.button !== 0) return;

		// Start panning when clicking on empty canvas in select mode
		if (tool === 'select') {
			isPanning = true;
			panStartX = e.clientX;
			panStartY = e.clientY;
			(e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
			onSelectBed(null);
			onSelectPlant(null);
			onSelectFence?.(null);
			selectedPlannedPlantIds = new Set(); // Clear planned plant selection too
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

		// Fence tool: add vertex on click
		if (tool === 'fence') {
			const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
			const canvasX = e.clientX - rect.left;
			const canvasY = e.clientY - rect.top;
			const fieldPos = canvasToField(canvasX, canvasY, canvasState);

			isCreatingFence = true;
			fenceVertices = [...fenceVertices, { x: fieldPos.x, y: fieldPos.y }];
		}
	}

	function handleCanvasPointerMove(e: PointerEvent) {
		// Handle panning
		if (isPanning) {
			const deltaX = e.clientX - panStartX;
			const deltaY = e.clientY - panStartY;
			panStartX = e.clientX;
			panStartY = e.clientY;
			onPan(deltaX, deltaY);
			return;
		}

		// Handle bed creation
		if (isCreatingBed) {
			const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
			bedCurrentX = e.clientX - rect.left;
			bedCurrentY = e.clientY - rect.top;
			return;
		}

		// Handle fence preview
		if (tool === 'fence' && isCreatingFence && fenceVertices.length > 0) {
			const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
			const canvasX = e.clientX - rect.left;
			const canvasY = e.clientY - rect.top;
			const fieldPos = canvasToField(canvasX, canvasY, canvasState);
			fencePreviewPoint = { x: fieldPos.x, y: fieldPos.y };
		}
	}

	function handleCanvasPointerUp(e: PointerEvent) {
		// End panning
		if (isPanning) {
			isPanning = false;
			(e.currentTarget as SVGElement).releasePointerCapture(e.pointerId);
			return;
		}

		// End bed creation
		if (!isCreatingBed) return;
		isCreatingBed = false;
		(e.currentTarget as SVGElement).releasePointerCapture(e.pointerId);

		// Calculate drag distance in pixels
		const dragWidth = Math.abs(bedCurrentX - bedStartX);
		const dragHeight = Math.abs(bedCurrentY - bedStartY);
		const dragDistance = Math.sqrt(dragWidth * dragWidth + dragHeight * dragHeight);

		// Threshold for "click to place" vs "drag to size" (24 pixels)
		const CLICK_THRESHOLD = 24;

		if (dragDistance < CLICK_THRESHOLD) {
			// Click to place: use bedDefaults dimensions, center on click position
			const widthInches = bedDefaults.widthFeet * 12;
			const heightInches = (tool === 'circle' ? bedDefaults.widthFeet : bedDefaults.heightFeet) * 12;

			// Convert click position to field coordinates, then offset to center the bed
			const clickFieldPos = canvasToField(bedStartX, bedStartY, canvasState);
			const fieldX = clickFieldPos.x - widthInches / 2;
			const fieldY = clickFieldPos.y - heightInches / 2;

			onCreateBed(
				tool as 'rectangle' | 'circle',
				fieldX,
				fieldY,
				bedDefaults.widthFeet,
				tool === 'rectangle' ? bedDefaults.heightFeet : undefined
			);
		} else {
			// Drag to size: use drag dimensions (original behavior)
			const minX = Math.min(bedStartX, bedCurrentX);
			const minY = Math.min(bedStartY, bedCurrentY);

			// Convert to field coordinates and feet
			const fieldPos = canvasToField(minX, minY, canvasState);
			const widthInches = dragWidth / (pixelsPerInch * zoom);
			const heightInches = dragHeight / (pixelsPerInch * zoom);

			// Minimum bed size: 1 foot
			const widthFeet = Math.max(1, Math.round(widthInches / 12));
			const heightFeet = Math.max(1, Math.round(heightInches / 12));

			// Only create if dragged enough
			if (widthFeet >= 1 && heightFeet >= 1) {
				onCreateBed(tool as 'rectangle' | 'circle', fieldPos.x, fieldPos.y, widthFeet, tool === 'rectangle' ? heightFeet : undefined);
			}
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

	// Double-click to finish fence
	function handleDblClick(e: MouseEvent) {
		if (tool === 'fence' && isCreatingFence && fenceVertices.length >= 2) {
			e.preventDefault();
			finishFence();
		}
	}

	// Keyboard handler for fence tool (Enter to finish, Escape to cancel)
	function handleKeyDown(e: KeyboardEvent) {
		if (tool === 'fence' && isCreatingFence) {
			if (e.key === 'Enter' && fenceVertices.length >= 2) {
				e.preventDefault();
				finishFence();
			} else if (e.key === 'Escape') {
				e.preventDefault();
				cancelFence();
			}
		}
	}

	// Clear smart guides when drag ends
	function handleMoveEnd() {
		activeGuides = [];
		activeDiagonalGuides = [];
		activeDistances = [];
		// Reset snap override state
		updateSnapOverride(false);
	}

	// Get all bounding boxes for smart guide calculations (excluding dragged objects)
	function getAllBoundingBoxes(excludeIds: Set<string>): BoundingBox[] {
		const boxes: BoundingBox[] = [];

		// Add bed bounding boxes
		for (const bed of beds) {
			if (excludeIds.has(bed._id)) continue;
			boxes.push(getBedBoundingBox(bed));
		}

		// Add plant bounding boxes (in field coordinates)
		for (const plant of plants) {
			if (excludeIds.has(plant._id)) continue;
			const bed = beds.find((b) => b._id === plant.bedId);
			if (!bed) continue;

			// Convert plant's bed-local coords to field coords
			const fieldX = plant.x + bed.x;
			const fieldY = plant.y + bed.y;
			const radius = plant.spacingMin / 2;

			boxes.push(createCircleBoundingBox(plant._id, fieldX, fieldY, radius));
		}

		return boxes;
	}

	// Bed move handler - supports multi-selection drag with smart guides
	function handleBedMove(id: Id<'beds'>, deltaX: number, deltaY: number, allSelectedIds?: Set<Id<'beds'>>, disableSnap?: boolean) {
		// Convert pixel delta to inches
		const deltaInchesX = deltaX / (pixelsPerInch * zoom);
		const deltaInchesY = deltaY / (pixelsPerInch * zoom);

		// Determine which beds to move: all selected if multi-selected, otherwise just the clicked one
		const idsToMove = allSelectedIds && allSelectedIds.size > 1 && allSelectedIds.has(id)
			? allSelectedIds
			: new Set([id]);

		// Get the primary bed being dragged (for smart guide calculations)
		const primaryBed = beds.find((b) => b._id === id);
		if (!primaryBed) return;

		// Calculate proposed new position for primary bed
		const proposedX = primaryBed.x + deltaInchesX;
		const proposedY = primaryBed.y + deltaInchesY;
		const dims = getBedDimensionsInInches(primaryBed);

		// Create bounding box for proposed position (include rotation for diagonal alignment)
		const proposedBox = createBoundingBox(
			primaryBed._id,
			proposedX,
			proposedY,
			dims.width,
			dims.height,
			primaryBed.rotation
		);

		// Get all other objects' bounding boxes (excluding dragged objects)
		const excludeIds = new Set([...idsToMove].map(String));
		const otherBoxes = getAllBoundingBoxes(excludeIds);

		// Calculate snap offset (or skip if Alt key disables snapping)
		let snapOffsetX = 0;
		let snapOffsetY = 0;

		// Alt key toggles snap behavior in either direction
		// When snap is ON: Alt temporarily disables it
		// When snap is OFF: Alt temporarily enables it
		const skipSnap = snapEnabled === !!disableSnap;

		// Notify parent of snap override state change (Alt key held)
		updateSnapOverride(!!disableSnap);

		if (skipSnap) {
			// Clear guides when snapping is disabled
			activeGuides = [];
			activeDiagonalGuides = [];
			activeDistances = [];
		} else {
			// Calculate snap threshold in inches (based on zoom)
			const thresholdInches = SNAP_THRESHOLD_PX / (pixelsPerInch * zoom);

			// Calculate smart guides
			const result = calculateSmartGuides(proposedBox, otherBoxes, thresholdInches);

			// Update visual guides
			activeGuides = result.guides;
			activeDiagonalGuides = result.diagonalGuides;
			activeDistances = result.distances;

			// Calculate the snap offset (difference between proposed and snapped position)
			snapOffsetX = result.snappedX - proposedX;
			snapOffsetY = result.snappedY - proposedY;
		}

		// Move all selected beds with the same offset
		for (const bedId of idsToMove) {
			const bed = beds.find((b) => b._id === bedId);
			if (!bed) continue;

			const newX = bed.x + deltaInchesX + snapOffsetX;
			const newY = bed.y + deltaInchesY + snapOffsetY;

			onMoveBed(bedId, newX, newY);
		}
	}

	// Plant move handler - supports multi-selection drag with smart guides
	function handlePlantMove(id: Id<'placedPlants'>, deltaX: number, deltaY: number, allSelectedIds?: Set<Id<'placedPlants'>>, disableSnap?: boolean) {
		// Convert pixel delta to inches (local bed coordinates)
		const deltaInchesX = deltaX / (pixelsPerInch * zoom);
		const deltaInchesY = deltaY / (pixelsPerInch * zoom);

		// Determine which plants to move: all selected if multi-selected, otherwise just the clicked one
		const idsToMove = allSelectedIds && allSelectedIds.size > 1 && allSelectedIds.has(id)
			? allSelectedIds
			: new Set([id]);

		// Get the primary plant being dragged
		const primaryPlant = plants.find((p) => p._id === id);
		if (!primaryPlant) return;

		const primaryBed = beds.find((b) => b._id === primaryPlant.bedId);
		if (!primaryBed) return;

		// Calculate proposed new field position
		const proposedFieldX = primaryPlant.x + primaryBed.x + deltaInchesX;
		const proposedFieldY = primaryPlant.y + primaryBed.y + deltaInchesY;
		const radius = primaryPlant.spacingMin / 2;

		// Create bounding box for proposed position
		const proposedBox = createCircleBoundingBox(
			primaryPlant._id,
			proposedFieldX,
			proposedFieldY,
			radius
		);

		// Get all other objects' bounding boxes (excluding dragged plants)
		const excludeIds = new Set([...idsToMove].map(String));
		const otherBoxes = getAllBoundingBoxes(excludeIds);

		// Alt key toggles snap behavior in either direction
		// When snap is ON: Alt temporarily disables it
		// When snap is OFF: Alt temporarily enables it
		let snapOffsetX = 0;
		let snapOffsetY = 0;
		const skipSnap = snapEnabled === !!disableSnap;

		// Notify parent of snap override state change (Alt key held)
		updateSnapOverride(!!disableSnap);

		if (skipSnap) {
			// Clear guides when snapping is disabled
			activeGuides = [];
			activeDiagonalGuides = [];
			activeDistances = [];
		} else {
			// Calculate snap threshold in inches
			const thresholdInches = SNAP_THRESHOLD_PX / (pixelsPerInch * zoom);

			// Calculate smart guides (center-only for plants - they're circles)
			const result = calculateSmartGuides(proposedBox, otherBoxes, thresholdInches, { centerOnly: true });

			// Update visual guides
			activeGuides = result.guides;
			activeDiagonalGuides = result.diagonalGuides;
			activeDistances = result.distances;

			// Calculate snap offset (for circles, snappedX/Y is the center after snap)
			// We need to convert back to the delta that should be applied
			const snappedCenterX = result.snappedX + radius; // snappedX is left edge, add radius for center
			const snappedCenterY = result.snappedY + radius; // snappedY is top edge, add radius for center
			snapOffsetX = snappedCenterX - proposedFieldX;
			snapOffsetY = snappedCenterY - proposedFieldY;
		}

		// Move all selected plants with the same offset
		for (const plantId of idsToMove) {
			const plant = plants.find((p) => p._id === plantId);
			if (!plant) continue;

			// Calculate new local position (plants use local bed coordinates)
			const newX = plant.x + deltaInchesX + snapOffsetX;
			const newY = plant.y + deltaInchesY + snapOffsetY;

			onMovePlant(plantId, newX, newY);
		}
	}

	// Planned plant move handler
	function handlePlannedPlantMove(
		id: Id<'plannedPlants'>,
		deltaX: number,
		deltaY: number,
		planned: PlannedPlant & { bed: BedType; localX: number; localY: number }
	) {
		// Convert pixel delta to inches
		const deltaInchesX = deltaX / (pixelsPerInch * zoom);
		const deltaInchesY = deltaY / (pixelsPerInch * zoom);

		// Calculate new local position within bed
		const newX = planned.localX + deltaInchesX;
		const newY = planned.localY + deltaInchesY;

		// Clamp to bed bounds
		const bedDims = getBedDimensionsInInches(planned.bed);
		const clampedX = Math.max(0, Math.min(bedDims.width, newX));
		const clampedY = Math.max(0, Math.min(bedDims.height, newY));

		updatePlannedPlantPosition(id, clampedX, clampedY);
	}

	// Fence move handler - moves entire fence by delta
	function handleFenceMove(id: Id<'fences'>, deltaX: number, deltaY: number, _allSelectedIds?: Set<Id<'fences'>>, _disableSnap?: boolean) {
		if (!onMoveFence) return;

		// Convert pixel delta to inches
		const deltaInchesX = deltaX / (pixelsPerInch * zoom);
		const deltaInchesY = deltaY / (pixelsPerInch * zoom);

		onMoveFence(id, deltaInchesX, deltaInchesY);
	}

	// Fence vertex move handler - moves a single vertex
	function handleFenceVertexMove(fenceId: Id<'fences'>, vertexIndex: number, newX: number, newY: number) {
		if (!onMoveVertex) return;
		onMoveVertex(fenceId, vertexIndex, newX, newY);
	}

</script>

<svg
	bind:this={svgElement}
	class="w-full h-full border border-border rounded-lg shadow-inner touch-none"
	style="cursor: {isPanning ? 'grabbing' : tool === 'select' ? 'grab' : 'crosshair'};"
	onpointerdown={handleCanvasPointerDown}
	onpointermove={handleCanvasPointerMove}
	onpointerup={handleCanvasPointerUp}
	ondblclick={handleDblClick}
	onkeydown={handleKeyDown}
	onwheel={handleWheel}
	ondrop={handleDrop}
	ondragover={handleDragOver}
	tabindex="0"
	role="application"
	aria-label="Garden field planner canvas"
	data-tour="canvas"
>
	<!-- SVG filter definitions -->
	<defs>
		<!-- Glow effect for selected plant icons -->
		<filter id="selected-glow" x="-50%" y="-50%" width="200%" height="200%">
			<feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="white" flood-opacity="0.8"/>
		</filter>
	</defs>

	<!-- Grid background (fixed, doesn't rotate - serves as coordinate reference) -->
	<GridBackground
		width={viewportWidth}
		height={viewportHeight}
		{pixelsPerInch}
		{zoom}
		{panX}
		{panY}
	/>

	<!-- Rotation wrapper - rotates garden content around viewport center -->
	<g transform="rotate({rotation}, {viewportWidth / 2}, {viewportHeight / 2})">

	<!-- Shadow layer (below beds) -->
	{#if sunSimulation.enabled && (shadows.length > 0 || allStructureShadows.length > 0) && sunPosition}
		<ShadowLayer {shadows} fenceShadows={allStructureShadows} {canvasState} sunAltitude={sunPosition.altitude} />
	{/if}

	<!-- Beds and Plants group (for tour spotlight targeting) -->
	<g data-tour="garden-content">
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
				isSelected={selectedBedIds.has(bed._id)}
				{selectedBedIds}
				onSelect={onSelectBed}
				onMove={handleBedMove}
				{onMoveStart}
				onMoveEnd={handleMoveEnd}
				onResize={onResizeBed}
				onRotate={onRotateBed}
			/>
		{/each}

		<!-- Fences -->
		{#each fences as fence (fence._id)}
			{@const canvasVertices = fence.vertices.map(v => fieldToCanvas(v.x, v.y, canvasState))}
			<FenceComponent
				{fence}
				{canvasVertices}
				{pixelsPerInch}
				{zoom}
				isSelected={selectedFenceIds.has(fence._id)}
				{selectedFenceIds}
				onSelect={(id, shiftKey) => onSelectFence?.(id, shiftKey)}
				onMove={handleFenceMove}
				onMoveVertex={handleFenceVertexMove}
				{onMoveStart}
				onMoveEnd={handleMoveEnd}
			/>
		{/each}

		<!-- Placed Plants -->
	{#each plantsWithPositions as plant, plantIndex (plant._id)}
		<PlantMarker
			{plant}
			cx={plant.canvasX}
			cy={plant.canvasY}
			spacingRadiusPixels={plant.spacingRadiusPixels}
			heightColor={heightColors.get(plant._id) ?? 'hsl(120, 70%, 50%)'}
			hasConflict={conflicts.has(plant._id)}
			isShaded={shadedPlants.has(plant._id)}
			isSelected={selectedPlantIds.has(plant._id)}
			{selectedPlantIds}
			phaseInfo={plant.visibility.currentPhase ? {
				currentPhase: plant.visibility.currentPhase,
				phaseLabel: plant.visibility.phaseLabel,
				phaseColor: plant.visibility.phaseColor,
				phaseProgress: plant.visibility.phaseProgress
			} : undefined}
			dataTour={plantIndex === 0 ? 'first-placed-plant' : plantIndex === 1 ? 'second-placed-plant' : undefined}
			onSelect={(id, shiftKey) => {
				// Only clear planned selection on regular click, not shift+click (allows cross-type selection)
				if (!shiftKey) {
					selectedPlannedPlantIds = new Set();
				}
				onSelectPlant(id as Id<'placedPlants'>, shiftKey);
			}}
			onMove={handlePlantMove}
			{onMoveStart}
			onMoveEnd={handleMoveEnd}
		/>
	{/each}

	<!-- Planned Plants (from succession planning) -->
	{#each plannedPlantsWithPositions as planned (planned._id)}
		{@const phaseColor = planned.visibility.phaseColor ?? 'hsl(200, 70%, 50%)'}
		<PlantMarker
			plant={{ ...planned, flowerData: planned.flowerData }}
			cx={planned.canvasX}
			cy={planned.canvasY}
			spacingRadiusPixels={planned.spacingRadiusPixels}
			heightColor={phaseColor}
			hasConflict={false}
			isShaded={shadedPlants.has(planned._id)}
			isSelected={selectedPlannedPlantIds.has(planned._id)}
			selectedPlantIds={selectedPlannedPlantIds}
			phaseInfo={{
				currentPhase: planned.visibility.currentPhase,
				phaseLabel: planned.visibility.phaseLabel,
				phaseColor: planned.visibility.phaseColor,
				phaseProgress: planned.visibility.phaseProgress
			}}
			successionIndex={planned.successionIndex}
			onSelect={(id, shiftKey) => selectPlannedPlant(id as Id<'plannedPlants'>, shiftKey)}
			onMove={(id, deltaX, deltaY) => handlePlannedPlantMove(id, deltaX, deltaY, planned)}
		/>
	{/each}
	</g>

	<!-- Smart guides overlay (rendered on top during drag) -->
	{#if activeGuides.length > 0 || activeDiagonalGuides.length > 0 || activeDistances.length > 0}
		<SmartGuides
			guides={activeGuides}
			diagonalGuides={activeDiagonalGuides}
			distances={activeDistances}
			{canvasState}
			{viewportWidth}
			{viewportHeight}
		/>
	{/if}

	<!-- Selection distance overlay (when exactly 2 objects selected) -->
	{#if selectionDistanceInfo}
		<SelectionDistance
			distanceInfo={selectionDistanceInfo.info}
			{canvasState}
			onDistanceChange={handleSelectionDistanceChange}
		/>
	{/if}

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

	<!-- Fence creation preview -->
	{#if isCreatingFence && fenceVertices.length > 0}
		{@const canvasVertices = fenceVertices.map(v => fieldToCanvas(v.x, v.y, canvasState))}
		{@const previewCanvasPoint = fencePreviewPoint ? fieldToCanvas(fencePreviewPoint.x, fencePreviewPoint.y, canvasState) : null}

		<!-- Placed vertices line -->
		{#if canvasVertices.length >= 2}
			<polyline
				points={canvasVertices.map(v => `${v.x},${v.y}`).join(' ')}
				fill="none"
				stroke="rgb(120, 113, 108)"
				stroke-width="3"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		{/if}

		<!-- Preview line from last vertex to cursor -->
		{#if previewCanvasPoint}
			{@const lastVertex = canvasVertices[canvasVertices.length - 1]}
			<line
				x1={lastVertex.x}
				y1={lastVertex.y}
				x2={previewCanvasPoint.x}
				y2={previewCanvasPoint.y}
				stroke="rgb(120, 113, 108)"
				stroke-width="3"
				stroke-dasharray="8 4"
				stroke-linecap="round"
			/>
		{/if}

		<!-- Vertex markers -->
		{#each canvasVertices as vertex, index}
			<circle
				cx={vertex.x}
				cy={vertex.y}
				r="6"
				fill="white"
				stroke="rgb(120, 113, 108)"
				stroke-width="2"
			/>
		{/each}
	{/if}

	</g><!-- End rotation wrapper -->
</svg>
