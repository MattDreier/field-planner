<script lang="ts">
	interface Props {
		cx: number; // center x in pixels
		cy: number; // center y in pixels
		radius: number; // radius in pixels
		hasConflict: boolean;
		isShaded?: boolean;
		isSelected: boolean;
	}

	let { cx, cy, radius, hasConflict, isShaded = false, isSelected }: Props = $props();

	// Determine fill and stroke colors based on state
	// Priority: conflict (red) > shaded (grey) > normal (orange)
	const fillColor = $derived(
		hasConflict
			? 'rgba(239, 68, 68, 0.15)'
			: isShaded
				? 'rgba(156, 163, 175, 0.15)'
				: 'rgba(249, 115, 22, 0.1)'
	);

	const strokeColor = $derived(
		hasConflict
			? 'rgb(239, 68, 68)'
			: isShaded
				? 'rgb(156, 163, 175)'
				: isSelected
					? 'rgb(249, 115, 22)'
					: 'rgba(249, 115, 22, 0.5)'
	);
</script>

<circle
	{cx}
	{cy}
	r={radius}
	fill={fillColor}
	stroke={strokeColor}
	stroke-width={isSelected ? 2 : 1}
	stroke-dasharray={hasConflict ? '4 2' : 'none'}
/>
