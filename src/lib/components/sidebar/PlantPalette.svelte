<script lang="ts">
	import { PLANT_DATABASE, type PlantData } from '$lib/data/plants';
	import PlantCard from './PlantCard.svelte';
	import type { DragSource } from '$lib/types';

	interface Props {
		onDragStart: (source: DragSource) => void;
		onDragEnd: () => void;
		onPlantClick?: (plantId: string) => void;
	}

	let { onDragStart, onDragEnd, onPlantClick }: Props = $props();

	let searchQuery = $state('');

	const filteredPlants = $derived(
		PLANT_DATABASE.filter(
			(f) =>
				f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				f.scientificName.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	function handleDragStart(plant: PlantData, e: DragEvent) {
		// Set drag data
		e.dataTransfer?.setData('text/plain', plant.id);

		// Notify parent
		onDragStart({
			type: 'flower',
			flowerId: plant.id,
			flowerName: plant.name,
			spacingMin: plant.spacingMin,
			heightMax: plant.heightMax
		});
	}

	function handleDragEnd() {
		onDragEnd();
	}
</script>

<svelte:window ondragend={handleDragEnd} />

<div class="flex flex-col h-full">
	<div class="p-4 border-b border-border">
		<h3 class="font-semibold text-lg mb-2">Plants</h3>
		<input
			type="search"
			placeholder="Search plants..."
			bind:value={searchQuery}
			class="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
		/>
	</div>

	<div class="flex-1 overflow-y-auto p-4 space-y-2">
		{#each filteredPlants as plant (plant.id)}
			<PlantCard
				{plant}
				onDragStart={(e) => handleDragStart(plant, e)}
				onClick={() => onPlantClick?.(plant.id)}
			/>
		{/each}

		{#if filteredPlants.length === 0}
			<p class="text-center text-muted-foreground text-sm py-8">
				No plants found matching "{searchQuery}"
			</p>
		{/if}
	</div>

	<div class="p-4 border-t border-border bg-muted/50">
		<p class="text-xs text-muted-foreground">
			Drag plants onto beds to place them. Spacing circles show minimum required space.
		</p>
	</div>
</div>
