<script lang="ts">
	import { generateHeightLegend, formatHeight } from '$lib/utils/color';

	interface Props {
		minHeight: number;
		maxHeight: number;
	}

	let { minHeight, maxHeight }: Props = $props();

	const legend = $derived(generateHeightLegend(minHeight, maxHeight, 5));
</script>

<div class="p-4 border-t border-border">
	<h4 class="font-semibold text-sm mb-3">Height Legend</h4>

	{#if minHeight === maxHeight}
		<p class="text-xs text-muted-foreground">
			All plants have the same height ({formatHeight(minHeight)})
		</p>
	{:else}
		<div class="flex items-center gap-2">
			<!-- Gradient bar using OKLch for perceptually uniform colors -->
			<div
				class="h-4 flex-1 rounded"
				style="background: linear-gradient(to right in oklch, oklch(0.68 0.14 260), oklch(0.68 0.14 30))"
			></div>
		</div>

		<div class="flex justify-between mt-1 text-xs text-muted-foreground">
			<span>{formatHeight(minHeight)} (short)</span>
			<span>{formatHeight(maxHeight)} (tall)</span>
		</div>
	{/if}
</div>
