<script lang="ts">
	import { PLANT_DATABASE, type PlantData, getAllPlantsWithUserPlants } from '$lib/data/plants';
	import { userPlantsState } from '$lib/stores/userPlants.svelte';
	import PlantCard from './PlantCard.svelte';
	import PlantGroupCard from './PlantGroupCard.svelte';
	import AddPlantDialog from './AddPlantDialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Plus } from 'lucide-svelte';
	import type { DragSource } from '$lib/types';

	interface Props {
		onDragStart: (source: DragSource) => void;
		onDragEnd: () => void;
		onPlantClick?: (plantId: string) => void;
	}

	let { onDragStart, onDragEnd, onPlantClick }: Props = $props();

	let searchQuery = $state('');
	let expandedGroups = $state(new Set<string>());
	let addDialogOpen = $state(false);

	// Merge built-in + user plants
	const allPlants = $derived(getAllPlantsWithUserPlants(userPlantsState.plants));

	// Filter by search
	const filteredPlants = $derived(
		allPlants.filter(
			(f) =>
				f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				f.scientificName.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(f.speciesGroup?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
		)
	);

	// Build grouped + standalone items for rendering
	type PaletteGroup = { type: 'group'; name: string; plants: PlantData[] };
	type PaletteStandalone = { type: 'standalone'; plant: PlantData };
	type PaletteItem = PaletteGroup | PaletteStandalone;

	const paletteItems = $derived.by((): PaletteItem[] => {
		const groups = new Map<string, PlantData[]>();
		const standalone: PlantData[] = [];

		for (const plant of filteredPlants) {
			if (plant.speciesGroup) {
				const existing = groups.get(plant.speciesGroup) ?? [];
				existing.push(plant);
				groups.set(plant.speciesGroup, existing);
			} else {
				standalone.push(plant);
			}
		}

		const items: PaletteItem[] = [];

		// Groups with 2+ members become expandable; single-member "groups" become standalone
		for (const [name, plants] of groups) {
			if (plants.length >= 2) {
				items.push({ type: 'group', name, plants });
			} else {
				standalone.push(...plants);
			}
		}

		// Sort groups alphabetically
		items.sort((a, b) => {
			if (a.type === 'group' && b.type === 'group') return a.name.localeCompare(b.name);
			return 0;
		});

		// Add standalone plants after groups, sorted by name
		standalone.sort((a, b) => a.name.localeCompare(b.name));
		for (const plant of standalone) {
			items.push({ type: 'standalone', plant });
		}

		return items;
	});

	// Auto-expand all groups when searching
	const effectiveExpanded = $derived(
		searchQuery.trim()
			? new Set(paletteItems.filter((i) => i.type === 'group').map((i) => (i as PaletteGroup).name))
			: expandedGroups
	);

	function toggleGroup(name: string) {
		const next = new Set(expandedGroups);
		if (next.has(name)) {
			next.delete(name);
		} else {
			next.add(name);
		}
		expandedGroups = next;
	}

	function handleDragStart(plant: PlantData, e: DragEvent) {
		e.dataTransfer?.setData('text/plain', plant.id);
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
		<div class="flex items-center justify-between mb-2">
			<h3 class="font-semibold text-lg">Plants</h3>
			<Button
				variant="outline"
				size="icon"
				class="h-7 w-7"
				onclick={() => (addDialogOpen = true)}
				aria-label="Add custom plant"
			>
				<Plus class="w-4 h-4" />
			</Button>
		</div>
		<input
			type="search"
			placeholder="Search plants..."
			bind:value={searchQuery}
			class="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
		/>
	</div>

	<div class="flex-1 overflow-y-auto p-4 space-y-2">
		{#each paletteItems as item}
			{#if item.type === 'group'}
				<PlantGroupCard
					groupName={item.name}
					plants={item.plants}
					isExpanded={effectiveExpanded.has(item.name)}
					onToggle={() => toggleGroup(item.name)}
					onDragStart={handleDragStart}
					onPlantClick={onPlantClick}
				/>
			{:else}
				<PlantCard
					plant={item.plant}
					onDragStart={(e) => handleDragStart(item.plant, e)}
					onClick={() => onPlantClick?.(item.plant.id)}
				/>
			{/if}
		{/each}

		{#if paletteItems.length === 0}
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

<AddPlantDialog bind:open={addDialogOpen} onOpenChange={(v) => (addDialogOpen = v)} />
