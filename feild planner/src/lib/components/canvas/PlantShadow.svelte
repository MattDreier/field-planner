<script lang="ts">
	/**
	 * Renders an individual plant's shadow as an SVG ellipse.
	 * The ellipse is rotated to point in the shadow direction.
	 */

	interface Props {
		cx: number; // plant center X in canvas pixels
		cy: number; // plant center Y in canvas pixels
		shadowLengthPixels: number; // shadow length in pixels
		shadowAngle: number; // degrees from North (0-360)
		plantRadiusPixels: number; // plant visual radius in pixels
	}

	let { cx, cy, shadowLengthPixels, shadowAngle, plantRadiusPixels }: Props = $props();

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
</script>

<ellipse
	cx={ellipseCenterX}
	cy={ellipseCenterY}
	rx={shadowWidth / 2}
	ry={shadowLengthPixels / 2}
	transform="rotate({shadowAngle}, {ellipseCenterX}, {ellipseCenterY})"
	fill="rgba(0, 0, 0, 0.12)"
	class="pointer-events-none"
/>
