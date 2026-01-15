<script lang="ts">
	import GridBackground from './GridBackground.svelte';
	import Bed from './Bed.svelte';
	import PlacedPlant from './PlacedPlant.svelte';
	import ShadowLayer from './ShadowLayer.svelte';
	import SmartGuides from './SmartGuides.svelte';
	import SelectionDistance from './SelectionDistance.svelte';
	import type { Bed as BedType, PlacedPlant as PlacedPlantType, Tool, DragSource, SunSimulationState } from '$lib/types';
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
	import { calculateAllShadows, detectShadedPlants } from '$lib/utils/shadow';
	import { calculateLifecyclePhases, getPlantVisibilityAtDate, getPlantHeightAtDate, type LifecyclePhase, type PlantVisibility } from '$lib/utils/timeline';
	import { timelineState, updatePlannedPlantPosition } from '$lib/stores/timeline.svelte';
	import { getFlowerById, type FlowerData } from '$lib/data/flowers';
	import type { Id } from '../../../convex/_generated/dataModel';
	import type { PlannedPlant, PlantingDates } from '$lib/types';

	interface Props {
		pixelsPerInch: number;
		zoom: number;
		panX: number;
		panY: number;
		snapEnabled?: boolean;
		tool: Tool;
		beds: BedType[];
		plants: PlacedPlantType[];
		selectedBedIds: Set<Id<'beds'>>;
		selectedPlantIds: Set<Id<'placedPlants'>>;
		dragSource: DragSource;
		sunSimulation: SunSimulationState;
		onSelectBed: (id: Id<'beds'> | null, shiftKey?: boolean) => void;
		onSelectPlant: (id: Id<'placedPlants'> | null, shiftKey?: boolean) => void;
		onCreateBed: (shape: 'rectangle' | 'circle', x: number, y: number, widthFeet: number, heightFeet?: number) => void;
		onMoveBed: (id: Id<'beds'>, newX: number, newY: number) => void;
		onResizeBed: (id: Id<'beds'>, newWidthFeet: number, newHeightFeet: number) => void;
		onRotateBed: (id: Id<'beds'>, rotation: number) => void;
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
		snapEnabled = true,
		tool,
		beds,
		plants,
		selectedBedIds,
		selectedPlantIds,
		dragSource,
		sunSimulation,
		onSelectBed,
		onSelectPlant,
		onCreateBed,
		onMoveBed,
		onResizeBed,
		onRotateBed,
		onPlacePlant,
		onMovePlant,
		onMoveStart,
		onSnapOverrideChange,
		onPan,
		onZoom
	}: Props = $props();

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

	// Selection distance calculation (for exactly 2 selected objects)
	const selectionDistanceInfo = $derived.by((): { info: SelectionDistanceResult; secondObjectId: string; secondObjectType: 'bed' | 'plant' } | null => {
		const totalSelected = selectedBedIds.size + selectedPlantIds.size;
		if (totalSelected !== 2) return null;

		// Gather selected objects with their bounding boxes
		const selectedObjects: Array<{ id: string; type: 'bed' | 'plant'; box: BoundingBox }> = [];

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
		} else {
			const plant = plants.find((p) => p._id === secondObjectId);
			if (plant) {
				onMovePlant(secondObjectId as Id<'placedPlants'>, plant.x + moveX, plant.y + moveY);
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

			const flowerData = getFlowerById(plant.flowerId);
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
				const flowerData = getFlowerById(planned.flowerId);
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

				// Use stored position if available, otherwise auto-center in bed
				const bedDims = getBedDimensionsInInches(bed);
				const localX = planned.x ?? bedDims.width / 2;
				const localY = planned.y ?? bedDims.height / 2;

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
					flowerData: FlowerData;
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

	// Calculate shadows for all plants (using growth-aware current height)
	const shadows = $derived.by(() => {
		if (!sunPosition || sunPosition.isNight) return [];
		const plantsForShadow = plantsWithPositions.map((p) => ({
			id: p._id,
			x: p.absoluteX,
			y: p.absoluteY,
			heightMax: p.currentHeight // Growth-aware height based on timeline date
		}));
		return calculateAllShadows(plantsForShadow, sunPosition);
	});

	// Detect which plants are being shaded (using growth-aware current height)
	const shadedPlants = $derived.by(() => {
		if (!sunPosition || sunPosition.isNight) return new Set<string>();
		const plantsForShadow = plantsWithPositions.map((p) => ({
			id: p._id,
			x: p.absoluteX,
			y: p.absoluteY,
			heightMax: p.currentHeight // Growth-aware height based on timeline date
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

		// Start panning when clicking on empty canvas in select mode
		if (tool === 'select') {
			isPanning = true;
			panStartX = e.clientX;
			panStartY = e.clientY;
			(e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
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
		if (!isCreatingBed) return;
		const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
		bedCurrentX = e.clientX - rect.left;
		bedCurrentY = e.clientY - rect.top;
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

		// Calculate bed dimensions
		const minX = Math.min(bedStartX, bedCurrentX);
		const minY = Math.min(bedStartY, bedCurrentY);
		const width = Math.abs(bedCurrentX - bedStartX);
		const height = Math.abs(bedCurrentY - bedStartY);

		// Convert to field coordinates and feet
		const fieldPos = canvasToField(minX, minY, canvasState);
		const widthInches = width / (pixelsPerInch * zoom);
		const heightInches = height / (pixelsPerInch * zoom);

		// Minimum bed size: 1 foot
		const widthFeet = Math.max(1, Math.round(widthInches / 12));
		const heightFeet = Math.max(1, Math.round(heightInches / 12));

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

	// Drag state for planned plants
	let draggingPlannedId = $state<Id<'plannedPlants'> | null>(null);
	let plannedDragStartX = $state(0);
	let plannedDragStartY = $state(0);
</script>

<svg
	bind:this={svgElement}
	class="w-full h-full border border-border rounded-lg shadow-inner touch-none"
	style="cursor: {isPanning ? 'grabbing' : tool === 'select' ? 'grab' : 'crosshair'};"
	onpointerdown={handleCanvasPointerDown}
	onpointermove={handleCanvasPointerMove}
	onpointerup={handleCanvasPointerUp}
	onwheel={handleWheel}
	ondrop={handleDrop}
	ondragover={handleDragOver}
	role="application"
	aria-label="Garden field planner canvas"
>
	<!-- SVG filter definitions -->
	<defs>
		<!-- Glow effect for selected plant icons -->
		<filter id="selected-glow" x="-50%" y="-50%" width="200%" height="200%">
			<feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="white" flood-opacity="0.8"/>
		</filter>
	</defs>

	<!-- Grid background (fills viewport, offset by pan) -->
	<GridBackground
		width={viewportWidth}
		height={viewportHeight}
		{pixelsPerInch}
		{zoom}
		{panX}
		{panY}
	/>

	<!-- Shadow layer (below beds) -->
	{#if sunSimulation.enabled && shadows.length > 0}
		<ShadowLayer {shadows} {canvasState} />
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
			isSelected={selectedPlantIds.has(plant._id)}
			{selectedPlantIds}
			phaseInfo={plant.visibility.currentPhase ? {
				currentPhase: plant.visibility.currentPhase,
				phaseLabel: plant.visibility.phaseLabel,
				phaseColor: plant.visibility.phaseColor,
				phaseProgress: plant.visibility.phaseProgress
			} : undefined}
			onSelect={onSelectPlant}
			onMove={handlePlantMove}
			{onMoveStart}
			onMoveEnd={handleMoveEnd}
		/>
	{/each}

	<!-- Planned Plants (from succession planning, draggable) -->
	{#each plannedPlantsWithPositions as planned (planned._id)}
		{@const phaseColor = planned.visibility.phaseColor ?? 'hsl(200, 70%, 50%)'}
		{@const isDragging = draggingPlannedId === planned._id}
		<g
			class="planned-plant cursor-move"
			style="opacity: {isDragging ? 0.9 : 0.7};"
			role="button"
			tabindex="0"
			onpointerdown={(e) => {
				if (e.button !== 0) return;
				draggingPlannedId = planned._id;
				plannedDragStartX = e.clientX;
				plannedDragStartY = e.clientY;
				(e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
				e.stopPropagation();
			}}
			onpointermove={(e) => {
				if (draggingPlannedId !== planned._id) return;
				const deltaX = e.clientX - plannedDragStartX;
				const deltaY = e.clientY - plannedDragStartY;
				handlePlannedPlantMove(planned._id, deltaX, deltaY, planned);
				plannedDragStartX = e.clientX;
				plannedDragStartY = e.clientY;
			}}
			onpointerup={(e) => {
				draggingPlannedId = null;
				(e.currentTarget as SVGElement).releasePointerCapture(e.pointerId);
			}}
			onkeydown={(e) => {
				// Arrow key movement
				const step = e.shiftKey ? 12 : 3; // 1 inch or 0.25 inch
				if (e.key === 'ArrowLeft') handlePlannedPlantMove(planned._id, -step * pixelsPerInch * zoom, 0, planned);
				if (e.key === 'ArrowRight') handlePlannedPlantMove(planned._id, step * pixelsPerInch * zoom, 0, planned);
				if (e.key === 'ArrowUp') handlePlannedPlantMove(planned._id, 0, -step * pixelsPerInch * zoom, planned);
				if (e.key === 'ArrowDown') handlePlannedPlantMove(planned._id, 0, step * pixelsPerInch * zoom, planned);
			}}
		>
			<!-- Dashed spacing circle to indicate "planned" status -->
			<circle
				cx={planned.canvasX}
				cy={planned.canvasY}
				r={planned.spacingRadiusPixels}
				fill={phaseColor}
				fill-opacity="0.15"
				stroke={phaseColor}
				stroke-width={isDragging ? 3 : 2}
				stroke-dasharray="6 4"
			/>
			<!-- Plant marker -->
			<circle
				cx={planned.canvasX}
				cy={planned.canvasY}
				r="6"
				fill={phaseColor}
				stroke="white"
				stroke-width="2"
			/>
			<!-- "Planned" badge -->
			<g transform="translate({planned.canvasX + planned.spacingRadiusPixels * 0.6}, {planned.canvasY - planned.spacingRadiusPixels * 0.6})">
				<rect
					x="-18"
					y="-8"
					width="36"
					height="16"
					rx="4"
					fill="rgba(0,0,0,0.6)"
				/>
				<text
					x="0"
					y="4"
					text-anchor="middle"
					class="text-[9px] fill-white font-medium pointer-events-none"
				>
					Planned
				</text>
			</g>
			<!-- Plant name label below -->
			<text
				x={planned.canvasX}
				y={planned.canvasY + planned.spacingRadiusPixels + 14}
				text-anchor="middle"
				class="text-xs fill-muted-foreground font-medium pointer-events-none"
			>
				{planned.flowerData.name}
			</text>
		</g>
	{/each}

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
</svg>
