<script lang="ts">
	import { ChevronUp, ChevronDown, Calendar, Plus } from 'lucide-svelte';
	import TimelineGantt from './TimelineGantt.svelte';
	import TimelineLegend from './TimelineLegend.svelte';
	import {
		timelineState,
		setHardinessZone,
		setViewScale,
		initializeGardenSettings
	} from '$lib/stores/timeline.svelte';
	import { ZONE_OPTIONS, formatZone } from '$lib/data/hardinessZones';
	import type { Bed, PlacedPlant, GardenSettings, PlantingDates } from '$lib/types';
	import { PLANT_DATABASE, type PlantData } from '$lib/data/plants';
	import { calculateLifecyclePhases, type TimelineEntry } from '$lib/utils/timeline';

	interface Props {
		beds: Bed[];
		plants: PlacedPlant[];
		gardenSettings: GardenSettings;
		onOpenSuccessionPlanner?: () => void;
		onUpdatePlantDates?: (plantId: string, dates: PlantingDates) => void;
		onScrubberRelease?: () => void;
	}

	let { beds, plants, gardenSettings, onOpenSuccessionPlanner, onUpdatePlantDates, onScrubberRelease }: Props = $props();

	// Panel height state (starts closed)
	let contentHeight = $state(0);

	// Track parent container height for max constraint
	let containerElement: HTMLDivElement | null = $state(null);
	let parentHeight = $state(600);

	// Update parent height on mount and resize
	$effect(() => {
		if (!containerElement?.parentElement) return;

		const updateParentHeight = () => {
			if (containerElement?.parentElement) {
				parentHeight = containerElement.parentElement.clientHeight;
			}
		};

		updateParentHeight();

		const resizeObserver = new ResizeObserver(updateParentHeight);
		resizeObserver.observe(containerElement.parentElement);

		return () => resizeObserver.disconnect();
	});

	// Max height is middle of canvas (50% of parent minus header)
	const maxHeight = $derived(Math.max(200, (parentHeight - 48) / 2));

	// Derived states
	const isOpen = $derived(contentHeight > 0);

	// Sync local isOpen state to the store (for tour completion detection)
	$effect(() => {
		timelineState.isPanelOpen = isOpen;
	});

	// Default open height (used when toggling open)
	const defaultOpenHeight = $derived(Math.min(300, maxHeight));

	// Toggle panel open/closed
	function togglePanel() {
		contentHeight = isOpen ? 0 : defaultOpenHeight;
	}

	// Drag state
	let isDragging = $state(false);
	let hasDragged = $state(false); // Track if actual movement occurred
	let dragStartY = $state(0);
	let dragStartHeight = $state(0);

	function handleMouseDown(e: MouseEvent) {
		isDragging = true;
		hasDragged = false;
		dragStartY = e.clientY;
		dragStartHeight = contentHeight;
		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDragging) return;
		// Dragging up (negative deltaY) should increase height
		const deltaY = dragStartY - e.clientY;
		// Only count as drag if moved more than 3px
		if (Math.abs(deltaY) > 3) {
			hasDragged = true;
		}
		const newHeight = Math.max(0, Math.min(maxHeight, dragStartHeight + deltaY));
		contentHeight = newHeight;
	}

	function handleMouseUp() {
		// If no drag occurred, treat as click to toggle
		if (!hasDragged) {
			togglePanel();
		}
		isDragging = false;
		hasDragged = false;
		document.removeEventListener('mousemove', handleMouseMove);
		document.removeEventListener('mouseup', handleMouseUp);
	}

	// Touch support
	function handleTouchStart(e: TouchEvent) {
		if (e.touches.length !== 1) return;
		isDragging = true;
		hasDragged = false;
		dragStartY = e.touches[0].clientY;
		dragStartHeight = contentHeight;
		document.addEventListener('touchmove', handleTouchMove);
		document.addEventListener('touchend', handleTouchEnd);
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isDragging || e.touches.length !== 1) return;
		const deltaY = dragStartY - e.touches[0].clientY;
		if (Math.abs(deltaY) > 3) {
			hasDragged = true;
		}
		const newHeight = Math.max(0, Math.min(maxHeight, dragStartHeight + deltaY));
		contentHeight = newHeight;
	}

	function handleTouchEnd() {
		if (!hasDragged) {
			togglePanel();
		}
		isDragging = false;
		hasDragged = false;
		document.removeEventListener('touchmove', handleTouchMove);
		document.removeEventListener('touchend', handleTouchEnd);
	}

	// Initialize frost dates on first render
	$effect(() => {
		initializeGardenSettings();
	});

	// Build plant lookup map
	const plantMap = $derived.by(() => {
		const map = new Map<string, PlantData>();
		for (const plant of PLANT_DATABASE) {
			map.set(plant.id, plant);
		}
		return map;
	});

	// Build bed name lookup
	const bedNameMap = $derived.by(() => {
		const map = new Map<string, string>();
		for (const bed of beds) {
			map.set(bed._id, bed.name ?? `Bed ${beds.indexOf(bed) + 1}`);
		}
		return map;
	});

	// Build timeline entries from placed plants
	const timelineEntries = $derived.by((): TimelineEntry[] => {
		const entries: TimelineEntry[] = [];

		// Add placed plants that have planting dates
		for (const plant of plants) {
			if (!plant.plantingDates) continue;

			const flower = plantMap.get(plant.flowerId);
			if (!flower) continue;

			const phases = calculateLifecyclePhases(plant.plantingDates, flower);
			if (phases.length === 0) continue;

			entries.push({
				id: plant._id,
				type: 'placed',
				flowerId: plant.flowerId,
				flowerName: plant.name,
				bedId: plant.bedId,
				bedName: bedNameMap.get(plant.bedId),
				plantingDates: plant.plantingDates,
				phases,
				successionGroupId: plant.successionGroupId,
				successionIndex: plant.successionIndex
			});
		}

		// Add planned plants
		for (const plant of timelineState.plannedPlants) {
			const flower = plantMap.get(plant.flowerId);
			if (!flower) continue;

			const phases = calculateLifecyclePhases(plant.plantingDates, flower);
			if (phases.length === 0) continue;

			entries.push({
				id: plant._id,
				type: 'planned',
				flowerId: plant.flowerId,
				flowerName: flower.name,
				bedId: plant.bedId,
				bedName: bedNameMap.get(plant.bedId),
				plantingDates: plant.plantingDates,
				phases,
				successionGroupId: plant.successionGroupId,
				successionIndex: plant.successionIndex,
				quantity: plant.quantity,
				status: plant.status
			});
		}

		return entries;
	});

	// View scale options
	const viewScaleOptions = [
		{ value: 'day', label: 'Day' },
		{ value: 'week', label: 'Week' },
		{ value: 'month', label: 'Month' },
		{ value: 'season', label: 'Season' }
	] as const;

	// Calculate tour marker dates based on first plant's phases
	// Used to position the tour tooltips centered over the actual phase bars
	const tourMarkerDates = $derived.by(() => {
		if (timelineEntries.length === 0) return null;

		const firstEntry = timelineEntries[0];
		const growingPhase = firstEntry.phases.find(p => p.phase === 'growing' && p.label === 'Growing outdoors');
		const harvestPhase = firstEntry.phases.find(p => p.phase === 'harvest-window');

		if (!growingPhase && !harvestPhase) return null;

		return {
			growingStart: growingPhase?.startDate,
			growingEnd: growingPhase?.endDate,
			harvestStart: harvestPhase?.startDate,
			harvestEnd: harvestPhase?.endDate
		};
	});
</script>

<!-- Timeline Panel - positioned at bottom of canvas area -->
<div class="absolute bottom-0 left-0 right-0 z-20" bind:this={containerElement}>
	<!-- Resize handle - draggable to open/close panel -->
	<div
		class="absolute -top-6 left-0 right-0 h-6 flex items-center justify-center select-none cursor-ns-resize"
		role="slider"
		aria-label="Drag to resize timeline panel"
		aria-valuemin={0}
		aria-valuemax={maxHeight}
		aria-valuenow={contentHeight}
		tabindex="0"
		onmousedown={handleMouseDown}
		ontouchstart={handleTouchStart}
	>
		<div class="w-12 h-1.5 rounded-full bg-muted-foreground/50 hover:bg-muted-foreground/70 transition-colors"></div>
	</div>

	<!-- Panel header - clickable to toggle -->
	<div
		class="w-full h-12 bg-card border-t border-x border-border rounded-t-lg flex items-center justify-between px-4 cursor-pointer"
		data-tour="timeline-toggle"
		role="button"
		tabindex="0"
		aria-expanded={isOpen}
		aria-label={isOpen ? 'Collapse timeline panel' : 'Expand timeline panel'}
		onclick={togglePanel}
		onkeydown={(e) => e.key === 'Enter' && togglePanel()}
	>
		<div class="flex items-center gap-3">
			<Calendar class="h-4 w-4 text-muted-foreground" />
			<span class="font-medium">Timeline</span>
			{#if timelineEntries.length > 0}
				<span class="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
					{timelineEntries.length} {timelineEntries.length === 1 ? 'plant' : 'plants'}
				</span>
			{/if}
		</div>

		<div class="flex items-center gap-3">
			{#if isOpen}
				<!-- Controls visible when open - stop propagation to prevent toggle -->
				<div
					class="flex items-center gap-2"
					role="group"
					aria-label="Timeline controls"
					onclick={(e) => e.stopPropagation()}
					onkeydown={(e) => e.stopPropagation()}
				>
					<!-- Zone selector -->
					<select
						class="h-8 pl-2 pr-6 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3d%22http%3a%2f%2fwww.w3.org%2f2000%2fsvg%22%20width%3d%2212%22%20height%3d%2212%22%20viewBox%3d%220%200%2024%2024%22%20fill%3d%22none%22%20stroke%3d%22%239ca3af%22%20stroke-width%3d%222%22%3e%3cpath%20d%3d%22m6%209%206%206%206-6%22%2f%3e%3c%2fsvg%3e')] bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat"
						value={timelineState.gardenSettings.hardinessZone}
						onchange={(e) => setHardinessZone(e.currentTarget.value)}
					>
						{#each ZONE_OPTIONS as zone}
							<option value={zone}>{formatZone(zone)}</option>
						{/each}
					</select>

					<!-- View scale selector -->
					<select
						class="h-8 pl-2 pr-6 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3d%22http%3a%2f%2fwww.w3.org%2f2000%2fsvg%22%20width%3d%2212%22%20height%3d%2212%22%20viewBox%3d%220%200%2024%2024%22%20fill%3d%22none%22%20stroke%3d%22%239ca3af%22%20stroke-width%3d%222%22%3e%3cpath%20d%3d%22m6%209%206%206%206-6%22%2f%3e%3c%2fsvg%3e')] bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat"
						value={timelineState.viewScale}
						onchange={(e) => setViewScale(e.currentTarget.value as 'day' | 'week' | 'month' | 'season')}
						data-tour="view-scale"
					>
						{#each viewScaleOptions as opt}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>

					<!-- Add succession button -->
					{#if onOpenSuccessionPlanner}
						<button
							class="h-8 px-3 text-xs bg-background border border-border rounded-md hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring flex items-center gap-1"
							onclick={onOpenSuccessionPlanner}
						>
							<Plus class="h-3 w-3" />
							Succession
						</button>
					{/if}
				</div>
			{/if}

			{#if isOpen}
				<ChevronDown class="h-4 w-4 text-muted-foreground" />
			{:else}
				<ChevronUp class="h-4 w-4 text-muted-foreground" />
			{/if}
		</div>
	</div>

	<!-- Panel content - height controlled by contentHeight, animated when not dragging -->
	<div
		class="bg-card border-x border-b border-border overflow-hidden"
		style="height: {contentHeight}px;{isDragging ? '' : ' transition: height 0.25s cubic-bezier(0.22, 1, 0.36, 1);'}"
	>
		{#if timelineEntries.length === 0}
			<!-- Empty state -->
			<div class="h-full flex flex-col items-center justify-center text-muted-foreground">
				<Calendar class="h-12 w-12 mb-3 opacity-50" />
				<p class="text-sm font-medium">No plants scheduled yet</p>
				<p class="text-xs mt-1">Add planting dates to your plants to see them here</p>
			</div>
		{:else}
			<div class="h-full flex flex-col">
				<!-- Legend -->
				<TimelineLegend />

				<!-- Gantt chart -->
				<div class="flex-1 overflow-hidden">
					<TimelineGantt
						entries={timelineEntries}
						{beds}
						gardenSettings={timelineState.gardenSettings}
						viewYear={timelineState.viewYear}
						viewScale={timelineState.viewScale}
						{onUpdatePlantDates}
						{onScrubberRelease}
						{tourMarkerDates}
					/>
				</div>
			</div>
		{/if}
	</div>
</div>
