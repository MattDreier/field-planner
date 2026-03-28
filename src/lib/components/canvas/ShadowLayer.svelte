<script lang="ts">
	/**
	 * Container component for all shadows (plants and fences).
	 * Renders as an SVG group below beds for proper z-ordering.
	 * Expects field-inch coordinates; rendered inside a scaled <g> group.
	 */
	import PlantShadow from './PlantShadow.svelte';
	import FenceShadow from './FenceShadow.svelte';
	import type { ShadowData, FenceShadowData } from '$lib/utils/shadow';
	import { getShadowOpacity } from '$lib/utils/shadow';

	interface Props {
		shadows: ShadowData[];
		fenceShadows?: FenceShadowData[];
		scale: number; // pixelsPerInch * zoom (for counter-scaling)
		sunAltitude: number;
	}

	let { shadows, fenceShadows = [], scale, sunAltitude }: Props = $props();

	// Calculate shadow opacity based on sun altitude (fades in as sun rises)
	const shadowOpacity = $derived(getShadowOpacity(sunAltitude));

	// Plant marker radius in field inches (counter-scaled from 8px)
	const plantRadiusInches = $derived(8 / scale);
</script>

<g class="shadow-layer" role="img" aria-label="Shadows">
	<!-- Fence shadows (render first so they appear behind plant shadows) -->
	{#each fenceShadows as fenceShadow (`${fenceShadow.fenceId}-${fenceShadow.segmentIndex}`)}
		<FenceShadow
			fenceId={fenceShadow.fenceId}
			segmentIndex={fenceShadow.segmentIndex}
			p1={fenceShadow.quadrilateral.p1}
			p2={fenceShadow.quadrilateral.p2}
			p3={fenceShadow.quadrilateral.p3}
			p4={fenceShadow.quadrilateral.p4}
			shadowAngle={fenceShadow.shadowAngle}
			opacity={shadowOpacity}
		/>
	{/each}

	<!-- Plant shadows -->
	{#each shadows as shadow (shadow.plantId)}
		<PlantShadow
			cx={shadow.originX}
			cy={shadow.originY}
			shadowLength={shadow.shadowLength}
			shadowAngle={shadow.shadowAngle}
			plantRadius={plantRadiusInches}
			opacity={shadowOpacity}
			plantId={shadow.plantId}
		/>
	{/each}
</g>
