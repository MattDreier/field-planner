<script lang="ts">
	interface Props {
		width: number; // viewport width in pixels
		height: number; // viewport height in pixels
		pixelsPerInch: number;
		zoom: number;
		panX: number; // pan offset in pixels
		panY: number; // pan offset in pixels
	}

	let { width, height, pixelsPerInch, zoom, panX, panY }: Props = $props();

	// Grid spacing: 1 inch minor grid, 12 inches (1 ft) major grid
	const minorGridSize = $derived(pixelsPerInch * zoom);
	const majorGridSize = $derived(pixelsPerInch * 12 * zoom);

	// Pattern offset to align grid with pan position
	// Use modulo to keep offset within pattern bounds for seamless tiling
	const patternOffsetX = $derived(((panX % majorGridSize) + majorGridSize) % majorGridSize);
	const patternOffsetY = $derived(((panY % majorGridSize) + majorGridSize) % majorGridSize);
</script>

<defs>
	<!-- Minor grid pattern (1 inch) -->
	<pattern
		id="minorGrid"
		width={minorGridSize}
		height={minorGridSize}
		patternUnits="userSpaceOnUse"
		patternTransform="translate({patternOffsetX}, {patternOffsetY})"
	>
		<path
			d="M {minorGridSize} 0 L 0 0 0 {minorGridSize}"
			fill="none"
			style="stroke: var(--color-grid-minor)"
			stroke-width="0.5"
		/>
	</pattern>

	<!-- Major grid pattern (1 foot) -->
	<pattern
		id="majorGrid"
		width={majorGridSize}
		height={majorGridSize}
		patternUnits="userSpaceOnUse"
		patternTransform="translate({patternOffsetX}, {patternOffsetY})"
	>
		<rect width={majorGridSize} height={majorGridSize} fill="url(#minorGrid)" />
		<path
			d="M {majorGridSize} 0 L 0 0 0 {majorGridSize}"
			fill="none"
			style="stroke: var(--color-grid-major)"
			stroke-width="1"
		/>
	</pattern>
</defs>

<!-- Background fill with grid -->
<rect {width} {height} style="fill: var(--color-canvas)" />
<rect {width} {height} fill="url(#majorGrid)" />
