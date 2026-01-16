<script lang="ts">
	/**
	 * Renders an individual plant's shadow as an SVG ellipse with feathered tip.
	 * The ellipse is rotated to point in the shadow direction.
	 * Opacity fades in based on sun altitude for a natural appearance.
	 * A gradient makes the shadow tip fade to transparent.
	 */
	import { getEffectiveTheme } from '$lib/stores/theme.svelte';

	interface Props {
		cx: number; // plant center X in canvas pixels
		cy: number; // plant center Y in canvas pixels
		shadowLengthPixels: number; // shadow length in pixels
		shadowAngle: number; // degrees from North (0-360)
		plantRadiusPixels: number; // plant visual radius in pixels
		opacity?: number; // 0-1, based on sun altitude (defaults to 1)
		plantId: string; // unique ID for gradient definition
	}

	let { cx, cy, shadowLengthPixels, shadowAngle, plantRadiusPixels, opacity = 1, plantId }: Props = $props();

	// Shadow ellipse dimensions
	// Width is slightly wider than plant for natural look
	const shadowWidth = $derived(plantRadiusPixels * 2.5);

	// Calculate ellipse center (midpoint between plant and shadow tip)
	const ellipseCenterX = $derived(
		cx + Math.sin((shadowAngle * Math.PI) / 180) * (shadowLengthPixels / 2)
	);
	const ellipseCenterY = $derived(
		cy - Math.cos((shadowAngle * Math.PI) / 180) * (shadowLengthPixels / 2)
	);

	// Unique gradient ID for this shadow instance
	const gradientId = $derived(`shadow-gradient-${plantId}`);

	// Shadow color based on theme (black for light mode, white for dark mode)
	const shadowColor = $derived(getEffectiveTheme() === 'dark' ? 'white' : 'black');
</script>

<!-- Gradient definition with feathered tip -->
<defs>
	<linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
		<stop offset="0%" stop-color={shadowColor} stop-opacity="0" />
		<stop offset="40%" stop-color={shadowColor} stop-opacity={opacity * 0.15} />
		<stop offset="100%" stop-color={shadowColor} stop-opacity={opacity * 0.35} />
	</linearGradient>
</defs>

<ellipse
	cx={ellipseCenterX}
	cy={ellipseCenterY}
	rx={shadowWidth / 2}
	ry={shadowLengthPixels / 2}
	transform="rotate({shadowAngle}, {ellipseCenterX}, {ellipseCenterY})"
	fill="url(#{gradientId})"
	class="pointer-events-none"
/>
