<script lang="ts">
	import SpacingCircle from './SpacingCircle.svelte';
	import type { PlacedPlant } from '$lib/types';
	import type { LifecyclePhase } from '$lib/utils/timeline';
	import type { Id } from '../../../convex/_generated/dataModel';

	interface PhaseInfo {
		currentPhase: LifecyclePhase | null;
		phaseLabel: string | null;
		phaseColor: string | null;
		phaseProgress: number;
	}

	interface Props {
		plant: PlacedPlant;
		cx: number; // center x in pixels (absolute canvas position)
		cy: number; // center y in pixels (absolute canvas position)
		spacingRadiusPixels: number;
		heightColor: string;
		hasConflict: boolean;
		isShaded?: boolean;
		isSelected: boolean;
		selectedPlantIds: Set<Id<'placedPlants'>>; // All selected plants for multi-drag
		phaseInfo?: PhaseInfo; // Current lifecycle phase info
		onSelect: (id: Id<'placedPlants'>, shiftKey?: boolean) => void;
		onMove?: (id: Id<'placedPlants'>, deltaX: number, deltaY: number, allSelectedIds?: Set<Id<'placedPlants'>>) => void;
		onMoveStart?: () => void; // Called once when drag begins (for history snapshot)
		onMoveEnd?: () => void; // Called when drag ends (for clearing guides)
	}

	let { plant, cx, cy, spacingRadiusPixels, heightColor, hasConflict, isShaded = false, isSelected, selectedPlantIds, phaseInfo, onSelect, onMove, onMoveStart, onMoveEnd }: Props = $props();

	// Plant marker size (visual representation)
	const markerRadius = 8;

	// Lucide icon paths (24x24 viewBox, will be scaled and centered)
	// These match the icons used in PlantDetails sidebar
	const ICON_PATHS = {
		// Home icon - for indoor start
		home: 'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8 M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
		// Sprout icon - for germinating
		sprout: 'M7 20h10 M10 20c5.5-2.5.8-6.4 3-10 M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z',
		// Sun icon - for hardening off
		sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 2v2 M12 20v2 M4.93 4.93l1.41 1.41 M17.66 17.66l1.41 1.41 M2 12h2 M20 12h2 M6.34 17.66l-1.41 1.41 M19.07 4.93l-1.41 1.41',
		// ArrowDownToLine icon - for transplant
		arrowDown: 'M12 17V3 M6 11l6 6 6-6 M19 21H5',
		// Leaf icon - for growing
		leaf: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12',
		// Scissors icon - for harvest
		scissors: 'M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M20 4L8.12 15.88 M14.47 14.48L20 20 M8.12 8.12L12 12'
	} as const;

	// Derive the icon path based on current phase
	const iconPath = $derived.by(() => {
		if (!phaseInfo?.currentPhase) return null;
		switch (phaseInfo.currentPhase) {
			case 'indoor-start': return ICON_PATHS.home;
			case 'germinating': return ICON_PATHS.sprout;
			case 'hardening-off': return ICON_PATHS.sun;
			case 'transplant': return ICON_PATHS.arrowDown;
			case 'growing': return ICON_PATHS.leaf;
			case 'harvest-window': return ICON_PATHS.scissors;
			default: return null;
		}
	});

	// Drag state
	let isDragging = $state(false);
	let dragStartX = $state(0);
	let dragStartY = $state(0);

	function handlePointerDown(e: PointerEvent) {
		if (e.button !== 0) return;

		// Only change selection if:
		// - This plant is NOT already selected (clicking to start a new selection/drag)
		// - OR shift is pressed (toggling in multi-select)
		// If already selected and not shift, preserve selection for multi-drag
		if (!isSelected || e.shiftKey) {
			onSelect(plant._id, e.shiftKey);
		}

		// Notify parent that a drag is starting (for history snapshot)
		onMoveStart?.();

		isDragging = true;
		dragStartX = e.clientX;
		dragStartY = e.clientY;
		(e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
		e.stopPropagation();
	}

	function handlePointerMove(e: PointerEvent) {
		if (isDragging && onMove) {
			const deltaX = e.clientX - dragStartX;
			const deltaY = e.clientY - dragStartY;
			// Pass all selected plant IDs for multi-drag
			onMove(plant._id, deltaX, deltaY, selectedPlantIds);
			dragStartX = e.clientX;
			dragStartY = e.clientY;
		}
	}

	function handlePointerUp(e: PointerEvent) {
		isDragging = false;
		(e.currentTarget as SVGElement).releasePointerCapture(e.pointerId);
		onMoveEnd?.();
	}
</script>

<g class="placed-plant" style="outline: none;" role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && onSelect(plant._id, e.shiftKey)}>
	<!-- Spacing circle - color coded by height (grey when shaded) -->
	<SpacingCircle
		{cx}
		{cy}
		radius={spacingRadiusPixels}
		{heightColor}
		{hasConflict}
		{isShaded}
		{isSelected}
	/>

	<!-- Plant marker - phase icon without background circle -->
	<g
		class="cursor-move touch-none"
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
	>
		<!-- Phase-specific Lucide icon (scaled from 24x24 to ~16px, centered at origin) -->
		<g
			transform="translate({cx}, {cy})"
			style={isShaded ? 'opacity: 0.5; filter: saturate(0.3);' : ''}
		>
			{#if iconPath && phaseInfo?.phaseColor}
				<!-- Lucide-style icon: scale 0.75 and translate to center -->
				<g
					class="transition-all"
					filter={isSelected ? 'url(#selected-glow)' : ''}
					transform="translate(-9, -9) scale(0.75)"
				>
					<!-- White outline for contrast -->
					<path
						d={iconPath}
						fill="none"
						stroke="white"
						stroke-width="4"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
					<!-- Colored icon -->
					<path
						d={iconPath}
						fill="none"
						stroke={phaseInfo.phaseColor}
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</g>
			{:else}
				<!-- Fallback: simple colored dot when no phase info -->
				<circle
					r={markerRadius}
					fill={heightColor}
					stroke={isSelected ? 'white' : 'rgba(0,0,0,0.3)'}
					stroke-width={isSelected ? 3 : 1}
					class="transition-all hover:stroke-white hover:stroke-2"
				/>
			{/if}
		</g>
	</g>

	<!-- Plant label (only show when selected or hovered) -->
	{#if isSelected}
		<text
			x={cx}
			y={cy - markerRadius - 8}
			text-anchor="middle"
			class="text-xs fill-foreground font-medium pointer-events-none"
		>
			{plant.name}
		</text>
	{/if}
</g>
