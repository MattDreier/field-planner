<script lang="ts">
	import { FLOWER_DATABASE, type FlowerData } from '$lib/data/flowers';
	import PlantCard from './PlantCard.svelte';
	import type { DragSource } from '$lib/types';

	interface Props {
		onDragStart: (source: DragSource) => void;
		onDragEnd: () => void;
	}

	let { onDragStart, onDragEnd }: Props = $props();

	let searchQuery = $state('');

	const filteredFlowers = $derived(
		FLOWER_DATABASE.filter(
			(f) =>
				f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				f.scientificName.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	function handleDragStart(flower: FlowerData, e: DragEvent) {
		// Set drag data
		e.dataTransfer?.setData('text/plain', flower.id);

		// Notify parent
		onDragStart({
			type: 'flower',
			flowerId: flower.id,
			flowerName: flower.name,
			spacingMin: flower.spacingMin,
			heightMax: flower.heightMax
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
			placeholder="Search flowers..."
			bind:value={searchQuery}
			class="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
		/>
	</div>

	<div class="flex-1 overflow-y-auto p-4 space-y-2">
		{#each filteredFlowers as flower (flower.id)}
			<PlantCard
				{flower}
				onDragStart={(e) => handleDragStart(flower, e)}
			/>
		{/each}

		{#if filteredFlowers.length === 0}
			<p class="text-center text-muted-foreground text-sm py-8">
				No flowers found matching "{searchQuery}"
			</p>
		{/if}
	</div>

	<div class="p-4 border-t border-border bg-muted/50">
		<p class="text-xs text-muted-foreground">
			Drag flowers onto beds to place them. Spacing circles show minimum required space.
		</p>
	</div>
</div>
