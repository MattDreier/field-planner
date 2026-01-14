<script lang="ts">
	/**
	 * Small indicator icon shown on plants that are being shaded.
	 * Displays a sun icon with a diagonal line through it.
	 */

	interface Props {
		cx: number; // plant center X in canvas pixels
		cy: number; // plant center Y in canvas pixels
	}

	let { cx, cy }: Props = $props();

	// Position indicator offset from plant center
	const offsetX = 10;
	const offsetY = -10;
</script>

<g transform="translate({cx + offsetX}, {cy + offsetY})" class="pointer-events-none">
	<!-- Background circle -->
	<circle r="7" fill="rgba(0, 0, 0, 0.7)" />

	<!-- Sun rays (simplified) -->
	<g stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round">
		<!-- Center dot -->
		<circle cx="0" cy="0" r="2" fill="#fbbf24" />
		<!-- Rays -->
		<line x1="0" y1="-4" x2="0" y2="-3" />
		<line x1="0" y1="4" x2="0" y2="3" />
		<line x1="-4" y1="0" x2="-3" y2="0" />
		<line x1="4" y1="0" x2="3" y2="0" />
	</g>

	<!-- Diagonal slash indicating "no sun" -->
	<line x1="-5" y1="5" x2="5" y2="-5" stroke="#ef4444" stroke-width="2" stroke-linecap="round" />
</g>
