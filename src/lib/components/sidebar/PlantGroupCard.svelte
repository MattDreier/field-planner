<script lang="ts">
	import type { PlantData } from '$lib/data/plants';
	import { ChevronRight } from 'lucide-svelte';
	import PlantCard from './PlantCard.svelte';

	interface Props {
		groupName: string;
		plants: PlantData[];
		isExpanded: boolean;
		onToggle: () => void;
		onDragStart: (plant: PlantData, e: DragEvent) => void;
		onPlantClick?: (plantId: string) => void;
	}

	let { groupName, plants, isExpanded, onToggle, onDragStart, onPlantClick }: Props = $props();
</script>

<div class="border border-border rounded-lg bg-card overflow-hidden">
	<!-- Group header (not draggable) -->
	<button
		class="w-full flex items-center gap-2 p-3 hover:bg-accent/50 transition-colors text-left"
		onclick={onToggle}
		aria-expanded={isExpanded}
	>
		<ChevronRight
			class="w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 {isExpanded ? 'rotate-90' : ''}"
		/>
		<span class="font-medium text-sm flex-1">{groupName}</span>
		<span class="text-xs text-muted-foreground">{plants.length} varieties</span>
	</button>

	<!-- Expanded variety list -->
	{#if isExpanded}
		<div class="border-t border-border/50 pl-3 pr-2 py-2 space-y-1.5">
			{#each plants as plant (plant.id)}
				<PlantCard
					{plant}
					onDragStart={(e) => onDragStart(plant, e)}
					onClick={() => onPlantClick?.(plant.id)}
				/>
			{/each}
		</div>
	{/if}
</div>
