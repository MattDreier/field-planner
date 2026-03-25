<script lang="ts">
	import type { PlantData } from '$lib/data/plants';
	import { formatHeight } from '$lib/utils/color';

	interface Props {
		plant: PlantData;
		onDragStart: (e: DragEvent) => void;
		onClick?: () => void;
	}

	let { plant, onDragStart, onClick }: Props = $props();
</script>

<div
	class="group p-3 border border-border rounded-lg bg-card hover:border-primary/50 hover:bg-accent/50 cursor-grab active:cursor-grabbing transition-all"
	draggable="true"
	ondragstart={onDragStart}
	onclick={onClick}
	onkeydown={(e) => e.key === 'Enter' && onClick?.()}
	role="button"
	tabindex="0"
	data-tour="flower-{plant.id}"
>
	<div class="flex items-start justify-between gap-2">
		<div class="min-w-0">
			<h4 class="font-medium text-sm leading-tight">
				{plant.name}
				{#if plant.isUserPlant}
					<span class="ml-1.5 inline-flex px-1.5 py-0.5 text-[10px] font-medium bg-primary/15 text-primary rounded-full align-middle">Custom</span>
				{/if}
			</h4>
			<p class="text-xs text-muted-foreground italic">{plant.scientificName}</p>
		</div>
	</div>
	<div class="mt-2 pt-2 border-t border-border/50 flex justify-between text-xs text-muted-foreground">
		<span>
			<span class="text-foreground/70">Spacing</span> {plant.spacingMin}–{plant.spacingMax}"
		</span>
		<span>
			<span class="text-foreground/70">Height</span> {formatHeight(plant.heightMin)}–{formatHeight(plant.heightMax)}
		</span>
	</div>
</div>
