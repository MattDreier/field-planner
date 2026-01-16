<script lang="ts">
	interface Props {
		cx: number; // center x in pixels
		cy: number; // center y in pixels
		radius: number; // radius in pixels
		heightColor: string; // HSL color based on plant height (e.g., "hsl(180, 70%, 50%)")
		hasConflict: boolean;
		isShaded?: boolean;
		isSelected: boolean;
	}

	let { cx, cy, radius, heightColor, hasConflict, isShaded = false, isSelected }: Props = $props();

	// Colors for special states
	const conflictColor = 'rgb(239, 68, 68)';
	const shadedColor = 'rgb(156, 163, 175)';

	// Determine fill and stroke colors based on state
	// Priority: conflict (red) > shaded (grey) > height-based color
	const fillColor = $derived(
		hasConflict
			? conflictColor
			: isShaded
				? shadedColor
				: heightColor
	);

	const strokeColor = $derived(
		hasConflict
			? conflictColor
			: isShaded
				? shadedColor
				: heightColor
	);

	// Opacity varies by state and selection
	const fillOpacity = $derived(hasConflict || isShaded ? 0.15 : 0.15);
	const strokeOpacity = $derived(
		hasConflict || isShaded
			? 1
			: isSelected
				? 1
				: 0.6
	);
</script>

<circle
	{cx}
	{cy}
	r={radius}
	fill={fillColor}
	fill-opacity={fillOpacity}
	stroke={strokeColor}
	stroke-opacity={strokeOpacity}
	stroke-width={isSelected ? 2 : 1}
	stroke-dasharray={hasConflict ? '4 2' : 'none'}
/>
