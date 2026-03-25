<script lang="ts">
	import { formatHeight } from '$lib/utils/color';

	interface Props {
		minHeight: number;
		maxHeight: number;
	}

	let { minHeight, maxHeight }: Props = $props();
</script>

<!-- On-canvas overlay positioned bottom-left, same stacking as MapControls (behind expanded timeline) -->
<div class="absolute bottom-16 left-4 pointer-events-none" data-tour="height-legend">
	<div class="pointer-events-auto bg-zinc-800/95 backdrop-blur-sm rounded-lg shadow-lg px-3 py-2">
		{#if minHeight === maxHeight}
			<!-- Single height indicator -->
			<div class="flex items-center gap-2">
				<div
					class="w-3 h-3 rounded-full"
					style="background: oklch(0.68 0.14 145)"
				></div>
				<span class="text-xs text-zinc-300">
					All {formatHeight(minHeight)}
				</span>
			</div>
		{:else}
			<!-- Height gradient legend -->
			<div class="flex items-center gap-2">
				<span class="text-[10px] text-zinc-400 tabular-nums">
					{formatHeight(minHeight)}
				</span>
				<div
					class="w-16 h-2 rounded-full"
					style="background: linear-gradient(to right in oklch decreasing hue, oklch(0.68 0.14 260), oklch(0.68 0.14 30))"
				></div>
				<span class="text-[10px] text-zinc-400 tabular-nums">
					{formatHeight(maxHeight)}
				</span>
			</div>
		{/if}
	</div>
</div>
