<script lang="ts">
	import SpacingCircle from './SpacingCircle.svelte';
	import type { PlacedPlant } from '$lib/types';
	import type { Id } from '../../../convex/_generated/dataModel';

	interface Props {
		plant: PlacedPlant;
		cx: number; // center x in pixels (absolute canvas position)
		cy: number; // center y in pixels (absolute canvas position)
		spacingRadiusPixels: number;
		heightColor: string;
		hasConflict: boolean;
		isShaded?: boolean;
		isSelected: boolean;
		onSelect: (id: Id<'placedPlants'>) => void;
		onMove?: (id: Id<'placedPlants'>, deltaX: number, deltaY: number) => void;
	}

	let { plant, cx, cy, spacingRadiusPixels, heightColor, hasConflict, isShaded = false, isSelected, onSelect, onMove }: Props = $props();

	// Plant marker size (visual representation)
	const markerRadius = 8;

	// Drag state
	let isDragging = $state(false);
	let dragStartX = $state(0);
	let dragStartY = $state(0);

	function handlePointerDown(e: PointerEvent) {
		if (e.button !== 0) return;
		onSelect(plant._id);
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
			onMove(plant._id, deltaX, deltaY);
			dragStartX = e.clientX;
			dragStartY = e.clientY;
		}
	}

	function handlePointerUp(e: PointerEvent) {
		isDragging = false;
		(e.currentTarget as SVGElement).releasePointerCapture(e.pointerId);
	}
</script>

<g class="placed-plant" style="outline: none;" role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && onSelect(plant._id)}>
	<!-- Spacing circle (semi-transparent, turns grey when shaded) -->
	<SpacingCircle
		{cx}
		{cy}
		radius={spacingRadiusPixels}
		{hasConflict}
		{isShaded}
		{isSelected}
	/>

	<!-- Plant marker (solid circle with height-based color, greyed when shaded) -->
	<circle
		{cx}
		{cy}
		r={markerRadius}
		fill={heightColor}
		stroke={isSelected ? 'white' : 'rgba(0,0,0,0.3)'}
		stroke-width={isSelected ? 3 : 1}
		style={isShaded ? 'opacity: 0.5; filter: saturate(0.3);' : ''}
		class="cursor-move touch-none transition-all hover:stroke-white hover:stroke-2"
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
	/>

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
