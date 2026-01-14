<script lang="ts">
	interface Props {
		width: number; // canvas width in pixels
		height: number; // canvas height in pixels
		pixelsPerInch: number;
		zoom: number;
	}

	let { width, height, pixelsPerInch, zoom }: Props = $props();

	// Grid spacing: 1 inch minor grid, 12 inches (1 ft) major grid
	const minorGridSize = $derived(pixelsPerInch * zoom);
	const majorGridSize = $derived(pixelsPerInch * 12 * zoom);
</script>

<defs>
	<!-- Minor grid pattern (1 inch) -->
	<pattern
		id="minorGrid"
		width={minorGridSize}
		height={minorGridSize}
		patternUnits="userSpaceOnUse"
	>
		<path
			d="M {minorGridSize} 0 L 0 0 0 {minorGridSize}"
			fill="none"
			stroke="rgba(0,0,0,0.1)"
			stroke-width="0.5"
		/>
	</pattern>

	<!-- Major grid pattern (1 foot) -->
	<pattern
		id="majorGrid"
		width={majorGridSize}
		height={majorGridSize}
		patternUnits="userSpaceOnUse"
	>
		<rect width={majorGridSize} height={majorGridSize} fill="url(#minorGrid)" />
		<path
			d="M {majorGridSize} 0 L 0 0 0 {majorGridSize}"
			fill="none"
			stroke="rgba(0,0,0,0.25)"
			stroke-width="1"
		/>
	</pattern>
</defs>

<!-- Background fill with grid -->
<rect {width} {height} fill="white" />
<rect {width} {height} fill="url(#majorGrid)" />
