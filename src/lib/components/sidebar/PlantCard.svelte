<script lang="ts">
	import type { FlowerData } from '$lib/data/flowers';
	import { formatHeight } from '$lib/utils/color';

	interface Props {
		flower: FlowerData;
		onDragStart: (e: DragEvent) => void;
		onClick?: () => void;
	}

	let { flower, onDragStart, onClick }: Props = $props();
</script>

<div
	class="group p-3 border border-border rounded-lg bg-card hover:border-primary/50 hover:bg-accent/50 cursor-grab active:cursor-grabbing transition-all"
	draggable="true"
	ondragstart={onDragStart}
	onclick={onClick}
	onkeydown={(e) => e.key === 'Enter' && onClick?.()}
	role="button"
	tabindex="0"
	data-tour="flower-{flower.id}"
>
	<div class="flex items-start justify-between gap-2">
		<div class="min-w-0">
			<h4 class="font-medium text-sm leading-tight">{flower.name}</h4>
			<p class="text-xs text-muted-foreground italic">{flower.scientificName}</p>
		</div>
	</div>
	<div class="mt-2 pt-2 border-t border-border/50 flex justify-between text-xs text-muted-foreground">
		<span>
			<span class="text-foreground/70">Spacing</span> {flower.spacingMin}–{flower.spacingMax}"
		</span>
		<span>
			<span class="text-foreground/70">Height</span> {formatHeight(flower.heightMin)}–{formatHeight(flower.heightMax)}
		</span>
	</div>
</div>
