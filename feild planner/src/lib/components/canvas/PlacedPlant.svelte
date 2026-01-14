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
		isSelected: boolean;
		onSelect: (id: Id<'placedPlants'>) => void;
	}

	let { plant, cx, cy, spacingRadiusPixels, heightColor, hasConflict, isSelected, onSelect }: Props = $props();

	// Plant marker size (visual representation)
	const markerRadius = 8;
</script>

<g class="placed-plant" role="button" tabindex="0" onclick={() => onSelect(plant._id)} onkeydown={(e) => e.key === 'Enter' && onSelect(plant._id)}>
	<!-- Spacing circle (semi-transparent) -->
	<SpacingCircle
		{cx}
		{cy}
		radius={spacingRadiusPixels}
		{hasConflict}
		{isSelected}
	/>

	<!-- Plant marker (solid circle with height-based color) -->
	<circle
		{cx}
		{cy}
		r={markerRadius}
		fill={heightColor}
		stroke={isSelected ? 'white' : 'rgba(0,0,0,0.3)'}
		stroke-width={isSelected ? 3 : 1}
		class="cursor-pointer transition-all hover:stroke-white hover:stroke-2"
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
