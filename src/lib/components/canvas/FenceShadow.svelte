<script lang="ts">
	/**
	 * Renders a fence segment's shadow as a quadrilateral polygon.
	 * The shadow projects from both ends of the fence segment in the shadow direction.
	 * Uses a gradient for natural feathering effect.
	 */
	import { getEffectiveTheme } from '$lib/stores/theme.svelte';

	interface Props {
		fenceId: string;
		segmentIndex: number;
		// Quadrilateral points in canvas pixels
		p1: { x: number; y: number }; // base start
		p2: { x: number; y: number }; // base end
		p3: { x: number; y: number }; // shadow end
		p4: { x: number; y: number }; // shadow start
		shadowAngle: number; // degrees from North (0-360)
		opacity?: number; // 0-1, based on sun altitude
	}

	let { fenceId, segmentIndex, p1, p2, p3, p4, shadowAngle, opacity = 1 }: Props = $props();

	// Create polygon points string
	const pointsString = $derived(
		`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`
	);

	// Unique gradient ID for this shadow
	const gradientId = $derived(`fence-shadow-gradient-${fenceId}-${segmentIndex}`);

	// Shadow color based on theme
	const shadowColor = $derived(getEffectiveTheme() === 'dark' ? 'white' : 'black');

	// Calculate gradient direction based on shadow angle
	// The gradient should fade from the fence (opaque) to the shadow tip (transparent)
	const gradientAngle = $derived(shadowAngle);
	const gradientX1 = $derived(50 - Math.sin((gradientAngle * Math.PI) / 180) * 50);
	const gradientY1 = $derived(50 + Math.cos((gradientAngle * Math.PI) / 180) * 50);
	const gradientX2 = $derived(50 + Math.sin((gradientAngle * Math.PI) / 180) * 50);
	const gradientY2 = $derived(50 - Math.cos((gradientAngle * Math.PI) / 180) * 50);
</script>

<defs>
	<linearGradient
		id={gradientId}
		x1="{gradientX1}%"
		y1="{gradientY1}%"
		x2="{gradientX2}%"
		y2="{gradientY2}%"
	>
		<stop offset="0%" stop-color={shadowColor} stop-opacity={opacity * 0.3} />
		<stop offset="60%" stop-color={shadowColor} stop-opacity={opacity * 0.15} />
		<stop offset="100%" stop-color={shadowColor} stop-opacity="0" />
	</linearGradient>
</defs>

<polygon
	points={pointsString}
	fill="url(#{gradientId})"
	class="pointer-events-none"
/>
