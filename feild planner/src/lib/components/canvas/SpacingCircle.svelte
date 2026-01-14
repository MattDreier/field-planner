<script lang="ts">
	interface Props {
		cx: number; // center x in pixels
		cy: number; // center y in pixels
		radius: number; // radius in pixels
		hasConflict: boolean;
		isSelected: boolean;
	}

	let { cx, cy, radius, hasConflict, isSelected }: Props = $props();
</script>

<circle
	{cx}
	{cy}
	r={radius}
	fill={hasConflict ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.1)'}
	stroke={hasConflict ? 'rgb(239, 68, 68)' : isSelected ? 'rgb(59, 130, 246)' : 'rgba(59, 130, 246, 0.5)'}
	stroke-width={isSelected ? 2 : 1}
	stroke-dasharray={hasConflict ? '4 2' : 'none'}
/>
