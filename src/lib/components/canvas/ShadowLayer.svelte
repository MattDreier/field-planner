<script lang="ts">
	/**
	 * Container component for all shadows (plants and fences).
	 * Renders as an SVG group below beds for proper z-ordering.
	 */
	import PlantShadow from './PlantShadow.svelte';
	import FenceShadow from './FenceShadow.svelte';
	import type { ShadowData, FenceShadowData } from '$lib/utils/shadow';
	import { getShadowOpacity } from '$lib/utils/shadow';
	import type { CanvasState } from '$lib/types';
	import { fieldToCanvas } from '$lib/utils/coordinates';

	interface Props {
		shadows: ShadowData[];
		fenceShadows?: FenceShadowData[];
		canvasState: CanvasState;
		sunAltitude: number;
	}

	let { shadows, fenceShadows = [], canvasState, sunAltitude }: Props = $props();

	// Calculate shadow opacity based on sun altitude (fades in as sun rises)
	const shadowOpacity = $derived(getShadowOpacity(sunAltitude));

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

	// Convert fence shadow quadrilaterals to canvas pixel coordinates
	const fenceShadowsWithPixels = $derived(
		fenceShadows.map((fenceShadow) => {
			const p1 = fieldToCanvas(fenceShadow.quadrilateral.p1.x, fenceShadow.quadrilateral.p1.y, canvasState);
			const p2 = fieldToCanvas(fenceShadow.quadrilateral.p2.x, fenceShadow.quadrilateral.p2.y, canvasState);
			const p3 = fieldToCanvas(fenceShadow.quadrilateral.p3.x, fenceShadow.quadrilateral.p3.y, canvasState);
			const p4 = fieldToCanvas(fenceShadow.quadrilateral.p4.x, fenceShadow.quadrilateral.p4.y, canvasState);

			return {
				...fenceShadow,
				p1,
				p2,
				p3,
				p4
			};
		})
	);
</script>

<g class="shadow-layer" role="img" aria-label="Shadows">
	<!-- Fence shadows (render first so they appear behind plant shadows) -->
	{#each fenceShadowsWithPixels as fenceShadow (`${fenceShadow.fenceId}-${fenceShadow.segmentIndex}`)}
		<FenceShadow
			fenceId={fenceShadow.fenceId}
			segmentIndex={fenceShadow.segmentIndex}
			p1={fenceShadow.p1}
			p2={fenceShadow.p2}
			p3={fenceShadow.p3}
			p4={fenceShadow.p4}
			shadowAngle={fenceShadow.shadowAngle}
			opacity={shadowOpacity}
		/>
	{/each}

	<!-- Plant shadows -->
	{#each shadowsWithPixels as shadow (shadow.plantId)}
		<PlantShadow
			cx={shadow.cx}
			cy={shadow.cy}
			shadowLengthPixels={shadow.shadowLengthPixels}
			shadowAngle={shadow.shadowAngle}
			plantRadiusPixels={shadow.plantRadiusPixels}
			opacity={shadowOpacity}
			plantId={shadow.plantId}
		/>
	{/each}
</g>
