<script lang="ts">
	import { type PlantData, getAllPlantsWithUserPlants } from '$lib/data/plants';
	import { userPlantsState } from '$lib/stores/userPlants.svelte';
	import PlantCard from './PlantCard.svelte';
	import PlantGroupCard from './PlantGroupCard.svelte';
	import PlantFilterChips from './PlantFilterChips.svelte';
	import PlantAdvancedFilters from './PlantAdvancedFilters.svelte';
	import AddPlantDialog from './AddPlantDialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Popover from '$lib/components/ui/popover';
	import { SlidersHorizontal, Plus } from 'lucide-svelte';
	import type { DragSource } from '$lib/types';

	interface Props {
		onDragStart: (source: DragSource) => void;
		onDragEnd: () => void;
		onPlantClick?: (plantId: string) => void;
	}

	let { onDragStart, onDragEnd, onPlantClick }: Props = $props();

	// ── State ─────────────────────────────────────────────
	let searchQuery = $state('');
	let expandedGroups = $state(new Set<string>());
	let addDialogOpen = $state(false);

	// Filter state
	let selectedKinds = $state(new Set<PlantData['kind']>());
	let selectedCategories = $state(new Set<string>());
	let quickHarvest = $state(false);
	let cutAndComeAgain = $state(false);
	let beginnerFriendly = $state(false);
	let sortBy = $state<'name' | 'height' | 'days-to-harvest'>('name');

	// ── Derived ───────────────────────────────────────────

	const allPlants = $derived(getAllPlantsWithUserPlants(userPlantsState.plants));

	// Full filter pipeline: search → kind → category → presets
	const filteredPlants = $derived.by((): PlantData[] => {
		let result = allPlants;

		// Text search
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			result = result.filter(
				(p) =>
					p.name.toLowerCase().includes(q) ||
					p.scientificName.toLowerCase().includes(q) ||
					(p.speciesGroup?.toLowerCase().includes(q) ?? false)
			);
		}

		// Kind filter (OR within selection)
		if (selectedKinds.size > 0) {
			result = result.filter((p) => selectedKinds.has(p.kind));
		}

		// Category filter (OR within selection)
		if (selectedCategories.size > 0) {
			result = result.filter((p) => selectedCategories.has(p.category));
		}

		// Quick harvest: <= 60 days
		if (quickHarvest) {
			result = result.filter((p) => p.daysToHarvest > 0 && p.daysToHarvest <= 60);
		}

		// Cut & come again
		if (cutAndComeAgain) {
			result = result.filter((p) => p.cutAndComeAgain);
		}

		// Beginner friendly: fast germination or "easy"/"beginner" in notes
		if (beginnerFriendly) {
			result = result.filter((p) => {
				const hasFastGermination = p.daysToGermination > 0 && p.daysToGermination <= 7;
				const isEasy =
					p.specialNotes.toLowerCase().includes('easy') ||
					p.specialNotes.toLowerCase().includes('beginner');
				return hasFastGermination || isEasy;
			});
		}

		return result;
	});

	// Sort the filtered list
	const sortedPlants = $derived.by((): PlantData[] => {
		const plants = [...filteredPlants];
		switch (sortBy) {
			case 'height':
				return plants.sort((a, b) => a.heightMax - b.heightMax);
			case 'days-to-harvest':
				return plants.sort((a, b) => a.daysToHarvest - b.daysToHarvest);
			default:
				return plants.sort((a, b) => a.name.localeCompare(b.name));
		}
	});

	// Count advanced filters (for the badge — excludes search and kind chips)
	const activeFilterCount = $derived(
		selectedCategories.size +
			(quickHarvest ? 1 : 0) +
			(cutAndComeAgain ? 1 : 0) +
			(beginnerFriendly ? 1 : 0) +
			(sortBy !== 'name' ? 1 : 0)
	);

	const hasAnyFilter = $derived(
		searchQuery.trim() !== '' ||
			selectedKinds.size > 0 ||
			selectedCategories.size > 0 ||
			quickHarvest ||
			cutAndComeAgain ||
			beginnerFriendly
	);

	// Build grouped + standalone items for rendering
	type PaletteGroup = { type: 'group'; name: string; plants: PlantData[] };
	type PaletteStandalone = { type: 'standalone'; plant: PlantData };
	type PaletteItem = PaletteGroup | PaletteStandalone;

	const paletteItems = $derived.by((): PaletteItem[] => {
		const groups = new Map<string, PlantData[]>();
		const standalone: PlantData[] = [];

		for (const plant of sortedPlants) {
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

		// Sort groups: by name default, or by first plant's metric
		items.sort((a, b) => {
			if (a.type === 'group' && b.type === 'group') {
				if (sortBy === 'height') {
					return a.plants[0].heightMax - b.plants[0].heightMax;
				}
				if (sortBy === 'days-to-harvest') {
					return a.plants[0].daysToHarvest - b.plants[0].daysToHarvest;
				}
				return a.name.localeCompare(b.name);
			}
			return 0;
		});

		// Standalone plants are already sorted from sortedPlants
		for (const plant of standalone) {
			items.push({ type: 'standalone', plant });
		}

		return items;
	});

	// Auto-expand all groups when searching
	const effectiveExpanded = $derived(
		searchQuery.trim()
			? new Set(
					paletteItems.filter((i) => i.type === 'group').map((i) => (i as PaletteGroup).name)
				)
			: expandedGroups
	);

	// ── Handlers ──────────────────────────────────────────

	function toggleGroup(name: string) {
		const next = new Set(expandedGroups);
		if (next.has(name)) {
			next.delete(name);
		} else {
			next.add(name);
		}
		expandedGroups = next;
	}

	function toggleKind(kind: PlantData['kind']) {
		const next = new Set(selectedKinds);
		if (next.has(kind)) {
			next.delete(kind);
		} else {
			next.add(kind);
		}
		selectedKinds = next;
	}

	function toggleCategory(cat: string) {
		const next = new Set(selectedCategories);
		if (next.has(cat)) {
			next.delete(cat);
		} else {
			next.add(cat);
		}
		selectedCategories = next;
	}

	function clearAllFilters() {
		searchQuery = '';
		selectedKinds = new Set();
		selectedCategories = new Set();
		quickHarvest = false;
		cutAndComeAgain = false;
		beginnerFriendly = false;
		sortBy = 'name';
	}

	function clearAdvancedFilters() {
		selectedCategories = new Set();
		quickHarvest = false;
		cutAndComeAgain = false;
		beginnerFriendly = false;
		sortBy = 'name';
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
	<!-- Header -->
	<div class="p-4 border-b border-border space-y-2">
		<div class="flex items-center justify-between">
			<h3 class="font-semibold text-lg">
				Plants
				<span class="text-sm font-normal text-muted-foreground">({sortedPlants.length})</span>
			</h3>
		</div>

		<!-- Search + filter button row -->
		<div class="flex gap-2">
			<input
				type="search"
				placeholder="Search plants..."
				bind:value={searchQuery}
				class="flex-1 min-w-0 px-3 py-2 text-sm border border-input rounded-md bg-background"
			/>
			<Popover.Root>
				<Popover.Trigger>
					{#snippet child({ props })}
						<Button
							{...props}
							variant="outline"
							size="icon"
							class="h-9 w-9 shrink-0 relative"
							aria-label="Advanced filters"
						>
							<SlidersHorizontal class="w-4 h-4" />
							{#if activeFilterCount > 0}
								<span
									class="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-primary text-primary-foreground"
								>
									{activeFilterCount}
								</span>
							{/if}
						</Button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content align="end" class="w-72">
					<PlantAdvancedFilters
						{selectedCategories}
						{quickHarvest}
						{cutAndComeAgain}
						{beginnerFriendly}
						{sortBy}
						{activeFilterCount}
						onToggleCategory={toggleCategory}
						onToggleQuickHarvest={() => (quickHarvest = !quickHarvest)}
						onToggleCutAndComeAgain={() => (cutAndComeAgain = !cutAndComeAgain)}
						onToggleBeginnerFriendly={() => (beginnerFriendly = !beginnerFriendly)}
						onSetSortBy={(s) => (sortBy = s)}
						onClearAll={clearAdvancedFilters}
					/>
				</Popover.Content>
			</Popover.Root>
		</div>

		<!-- Kind filter chips -->
		<PlantFilterChips {selectedKinds} onToggle={toggleKind} />
	</div>

	<!-- Filter summary bar -->
	{#if hasAnyFilter}
		<div
			class="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between text-xs"
		>
			<span class="text-muted-foreground">
				{sortedPlants.length} of {allPlants.length} plants
			</span>
			<button
				type="button"
				class="text-muted-foreground hover:text-foreground transition-colors"
				onclick={clearAllFilters}
			>
				Clear filters
			</button>
		</div>
	{/if}

	<!-- Plant list -->
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
				No plants match the current filters.
			</p>
		{/if}

		<!-- Add custom plant CTA -->
		<button
			type="button"
			class="w-full mt-2 py-3 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors flex items-center justify-center gap-2"
			onclick={() => (addDialogOpen = true)}
		>
			<Plus class="w-4 h-4" />
			Add custom plant
		</button>
	</div>

	<div class="p-4 border-t border-border bg-muted/50">
		<p class="text-xs text-muted-foreground">
			Drag plants onto beds to place them. Spacing circles show minimum required space.
		</p>
	</div>
</div>

<AddPlantDialog bind:open={addDialogOpen} onOpenChange={(v) => (addDialogOpen = v)} />
