<script lang="ts">
	/**
	 * Static compass rose overlay showing cardinal directions.
	 * North is always up, matching the shadow simulation orientation.
	 */

	interface Props {
		x: number; // position X in canvas pixels
		y: number; // position Y in canvas pixels
		size?: number; // diameter in pixels
	}

	let { x, y, size = 60 }: Props = $props();

	const radius = $derived(size / 2);
	const innerRadius = $derived(radius * 0.6);
	const textOffset = $derived(radius * 0.75);
</script>

<g transform="translate({x}, {y})" class="pointer-events-none" role="img" aria-label="Compass showing North direction">
	<!-- Outer circle background -->
	<circle r={radius} fill="rgba(255, 255, 255, 0.9)" stroke="#9ca3af" stroke-width="1" />

	<!-- Inner circle -->
	<circle r={innerRadius * 0.3} fill="none" stroke="#d1d5db" stroke-width="1" />

	<!-- Cardinal direction lines -->
	<g stroke="#d1d5db" stroke-width="1">
		<line x1="0" y1={-innerRadius} x2="0" y2={innerRadius} />
		<line x1={-innerRadius} y1="0" x2={innerRadius} y2="0" />
	</g>

	<!-- North arrow (red, prominent) -->
	<polygon
		points="0,{-radius * 0.85} {-6},{-radius * 0.45} {6},{-radius * 0.45}"
		fill="#dc2626"
	/>

	<!-- South arrow (gray, subtle) -->
	<polygon
		points="0,{radius * 0.85} {-5},{radius * 0.5} {5},{radius * 0.5}"
		fill="#9ca3af"
	/>

	<!-- East/West indicators -->
	<polygon
		points="{radius * 0.85},0 {radius * 0.5},{-4} {radius * 0.5},{4}"
		fill="#9ca3af"
	/>
	<polygon
		points="{-radius * 0.85},0 {-radius * 0.5},{-4} {-radius * 0.5},{4}"
		fill="#9ca3af"
	/>

	<!-- Cardinal labels -->
	<text
		y={-textOffset}
		text-anchor="middle"
		dominant-baseline="middle"
		class="text-xs font-bold"
		fill="#dc2626"
	>
		N
	</text>
	<text
		y={textOffset}
		text-anchor="middle"
		dominant-baseline="middle"
		class="text-xs"
		fill="#6b7280"
	>
		S
	</text>
	<text
		x={textOffset}
		text-anchor="middle"
		dominant-baseline="middle"
		class="text-xs"
		fill="#6b7280"
	>
		E
	</text>
	<text
		x={-textOffset}
		text-anchor="middle"
		dominant-baseline="middle"
		class="text-xs"
		fill="#6b7280"
	>
		W
	</text>

	<!-- Center dot -->
	<circle r="3" fill="#374151" />
</g>
