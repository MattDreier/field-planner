<script lang="ts">
	import type { FlowerData } from '$lib/data/flowers';
	import { formatHeight } from '$lib/utils/color';

	interface Props {
		flower: FlowerData;
		onDragStart: (e: DragEvent) => void;
	}

	let { flower, onDragStart }: Props = $props();
</script>

<div
	class="p-3 border border-border rounded-lg bg-card hover:bg-accent cursor-grab active:cursor-grabbing transition-colors"
	draggable="true"
	ondragstart={onDragStart}
	role="button"
	tabindex="0"
>
	<div class="flex items-center gap-2">
		<!-- Color indicator based on typical height -->
		<div
			class="w-4 h-4 rounded-full flex-shrink-0"
			style="background-color: hsl({240 - (flower.heightMax / 96) * 240}, 70%, 50%)"
		></div>
		<div class="flex-1 min-w-0">
			<h4 class="font-medium text-sm truncate">{flower.name}</h4>
			<p class="text-xs text-muted-foreground truncate">{flower.scientificName}</p>
		</div>
	</div>
	<div class="mt-2 flex gap-4 text-xs text-muted-foreground">
		<span title="Spacing">📏 {flower.spacingMin}–{flower.spacingMax}"</span>
		<span title="Height">📐 {formatHeight(flower.heightMin)}–{formatHeight(flower.heightMax)}</span>
	</div>
</div>
