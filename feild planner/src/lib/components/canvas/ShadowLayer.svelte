<script lang="ts">
	/**
	 * Container component for all plant shadows.
	 * Renders as an SVG group below beds for proper z-ordering.
	 */
	import PlantShadow from './PlantShadow.svelte';
	import type { ShadowData } from '$lib/utils/shadow';
	import type { CanvasState } from '$lib/types';
	import { fieldToCanvas } from '$lib/utils/coordinates';

	interface Props {
		shadows: ShadowData[];
		canvasState: CanvasState;
	}

	let { shadows, canvasState }: Props = $props();

	// Convert shadow data to canvas pixel coordinates
	const shadowsWithPixels = $derived(
		shadows.map((shadow) => {
			const canvasPos = fieldToCanvas(shadow.originX, shadow.originY, canvasState);
			const scale = canvasState.pixelsPerInch * canvasState.zoom;

			return {
				...shadow,
				cx: canvasPos.x,
				cy: canvasPos.y,
				shadowLengthPixels: shadow.shadowLength * scale,
				plantRadiusPixels: 8 // Match PlacedPlant marker radius
			};
		})
	);
</script>

<g class="shadow-layer" role="img" aria-label="Plant shadows">
	{#each shadowsWithPixels as shadow (shadow.plantId)}
		<PlantShadow
			cx={shadow.cx}
			cy={shadow.cy}
			shadowLengthPixels={shadow.shadowLengthPixels}
			shadowAngle={shadow.shadowAngle}
			plantRadiusPixels={shadow.plantRadiusPixels}
		/>
	{/each}
</g>
