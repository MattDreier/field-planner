<script lang="ts">
	import type { FenceVertex } from '$lib/types';

	interface Props {
		vertices: FenceVertex[]; // field-inch coordinates
		scale: number; // pixelsPerInch * zoom (for counter-scaling)
		tracingVertices?: FenceVertex[];
	}

	let { vertices, scale, tracingVertices = [] }: Props = $props();

	const boundaryPoints = $derived(vertices.map(v => `${v.x},${v.y}`).join(' '));
	const tracingPoints = $derived(tracingVertices.map(v => `${v.x},${v.y}`).join(' '));

	const vertexRadius = $derived(4 / scale);
</script>

<!-- Committed boundary polygon -->
{#if vertices.length >= 3}
	<polygon
		points={boundaryPoints}
		fill="none"
		stroke="rgba(251, 191, 36, 0.7)"
		vector-effect="non-scaling-stroke"
		stroke-width="2"
		stroke-dasharray="8 4"
		stroke-linejoin="round"
	/>
{/if}

<!-- In-progress tracing polyline -->
{#if tracingVertices.length >= 2}
	<polyline
		points={tracingPoints}
		fill="none"
		stroke="rgba(251, 191, 36, 0.5)"
		vector-effect="non-scaling-stroke"
		stroke-width="2"
		stroke-dasharray="6 3"
		stroke-linejoin="round"
	/>
{/if}

<!-- Tracing vertex dots -->
{#each tracingVertices as vertex, i}
	<circle
		cx={vertex.x}
		cy={vertex.y}
		r={vertexRadius}
		fill={i === 0 ? 'rgba(251, 191, 36, 0.9)' : 'rgba(251, 191, 36, 0.6)'}
		stroke="white"
		vector-effect="non-scaling-stroke"
		stroke-width="1"
	/>
{/each}

<!-- Committed boundary vertex dots -->
{#each vertices as vertex}
	<circle
		cx={vertex.x}
		cy={vertex.y}
		r={vertexRadius * 0.8}
		fill="rgba(251, 191, 36, 0.5)"
		stroke="rgba(251, 191, 36, 0.8)"
		vector-effect="non-scaling-stroke"
		stroke-width="0.5"
	/>
{/each}
