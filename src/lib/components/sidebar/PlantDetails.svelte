<script lang="ts">
	import { getPlantById, type PlantData } from '$lib/data/plants';
	import { X, Droplets, Sun, Thermometer, Scissors, Calendar, Ruler, Leaf } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import type { PlacedPlant } from '$lib/types';

	interface Props {
		plantId: string;
		selectedPlant?: PlacedPlant | null;
		onClose: () => void;
		onScrolledToBottom?: () => void;
	}

	let { plantId, selectedPlant = null, onClose, onScrolledToBottom }: Props = $props();

	const plant = $derived(getPlantById(plantId));

	// Scroll-to-bottom detection for tour
	let sentinelElement: HTMLDivElement | null = $state(null);
	let hasTriggeredScroll = $state(false);

	// Set up IntersectionObserver when sentinel element is available
	$effect(() => {
		if (!sentinelElement || !onScrolledToBottom) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && !hasTriggeredScroll) {
					hasTriggeredScroll = true;
					onScrolledToBottom();
				}
			},
			{ threshold: 0.5 }
		);
		observer.observe(sentinelElement);

		return () => observer.disconnect();
	});

	// Reset scroll trigger when plantId changes
	$effect(() => {
		plantId; // dependency
		hasTriggeredScroll = false;
	});

	function formatRange(min: number, max?: number, unit: string = ''): string {
		if (max && max !== min) {
			return `${min}-${max}${unit}`;
		}
		return `${min}${unit}`;
	}
</script>

{#if plant}
	<aside
		class="w-80 border-l border-border bg-card flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
		data-tour="details-panel"
	>
		<!-- Header -->
		<div class="flex items-start justify-between p-4 border-b border-border">
			<div>
				<h2 class="text-lg font-semibold">{plant.name}</h2>
				<p class="text-sm text-muted-foreground italic">{plant.scientificName}</p>
			</div>
			<Button variant="ghost" size="icon" onclick={onClose} aria-label="Close panel" data-tour="close-details">
				<X class="w-4 h-4" />
			</Button>
		</div>

		<!-- Scrollable content -->
		<div class="flex-1 overflow-y-auto p-4 space-y-6">
			<!-- Quick stats -->
			<div class="grid grid-cols-2 gap-3">
				<div class="bg-muted/50 rounded-lg p-3">
					<div class="flex items-center gap-2 text-muted-foreground mb-1">
						<Ruler class="w-4 h-4" />
						<span class="text-xs font-medium">Height</span>
					</div>
					<p class="text-sm font-semibold">{formatRange(plant.heightMin, plant.heightMax, '"')}</p>
				</div>
				<div class="bg-muted/50 rounded-lg p-3">
					<div class="flex items-center gap-2 text-muted-foreground mb-1">
						<Leaf class="w-4 h-4" />
						<span class="text-xs font-medium">Spacing</span>
					</div>
					<p class="text-sm font-semibold">{formatRange(plant.spacingMin, plant.spacingMax, '"')}</p>
				</div>
				<div class="bg-muted/50 rounded-lg p-3">
					<div class="flex items-center gap-2 text-muted-foreground mb-1">
						<Calendar class="w-4 h-4" />
						<span class="text-xs font-medium">Days to Harvest</span>
					</div>
					<p class="text-sm font-semibold">{formatRange(plant.daysToHarvest, plant.daysToHarvestMax)}</p>
				</div>
				{#if plant.kind === 'flower' && plant.vaseLifeDays}
					<div class="bg-muted/50 rounded-lg p-3">
						<div class="flex items-center gap-2 text-muted-foreground mb-1">
							<Scissors class="w-4 h-4" />
							<span class="text-xs font-medium">Vase Life</span>
						</div>
						<p class="text-sm font-semibold">{formatRange(plant.vaseLifeDays, plant.vaseLifeDaysMax)} days</p>
					</div>
				{:else if plant.kind === 'vegetable' && plant.daysToMaturity}
					<div class="bg-muted/50 rounded-lg p-3">
						<div class="flex items-center gap-2 text-muted-foreground mb-1">
							<Calendar class="w-4 h-4" />
							<span class="text-xs font-medium">Days to Maturity</span>
						</div>
						<p class="text-sm font-semibold">{formatRange(plant.daysToMaturity, plant.daysToMaturityMax)}</p>
					</div>
				{:else if plant.kind === 'herb'}
					<div class="bg-muted/50 rounded-lg p-3">
						<div class="flex items-center gap-2 text-muted-foreground mb-1">
							<Leaf class="w-4 h-4" />
							<span class="text-xs font-medium">Flavor</span>
						</div>
						<p class="text-sm font-semibold">{plant.flavorProfile ?? 'Aromatic'}</p>
					</div>
				{/if}
			</div>

			<!-- Category & Type -->
			<div>
				<h3 class="text-sm font-medium mb-2">Plant Type</h3>
				<div class="flex flex-wrap gap-2">
					<span class="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full capitalize">
						{plant.category.replace(/-/g, ' ')}
					</span>
					<span class="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full capitalize">
						{plant.propagationMethod}
					</span>
				</div>
			</div>

			<!-- Colors -->
			{#if plant.colors && plant.colors.length > 0}
				<div>
					<h3 class="text-sm font-medium mb-2">Available Colors</h3>
					<div class="flex flex-wrap gap-2">
						{#each plant.colors as color}
							<span class="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full capitalize">
								{color}
							</span>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Growing Conditions -->
			<div>
				<h3 class="text-sm font-medium mb-3">Growing Conditions</h3>
				<div class="space-y-3">
					<div class="flex items-start gap-3">
						<Sun class="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
						<div>
							<p class="text-xs text-muted-foreground">Light</p>
							<p class="text-sm">{plant.lightRequirements}</p>
						</div>
					</div>
					<div class="flex items-start gap-3">
						<Droplets class="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
						<div>
							<p class="text-xs text-muted-foreground">Water</p>
							<p class="text-sm">{plant.wateringNeeds}</p>
						</div>
					</div>
					<div class="flex items-start gap-3">
						<Thermometer class="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
						<div>
							<p class="text-xs text-muted-foreground">Germination Temp</p>
							<p class="text-sm">{plant.germinationTempMin}-{plant.germinationTempMax}°F</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Soil -->
			<div>
				<h3 class="text-sm font-medium mb-2">Soil Requirements</h3>
				<div class="text-sm space-y-1">
					<p><span class="text-muted-foreground">pH:</span> {plant.soilPH}</p>
					<p><span class="text-muted-foreground">Type:</span> {plant.soilType}</p>
					<p><span class="text-muted-foreground">Fertilizer:</span> {plant.fertilizer}</p>
				</div>
			</div>

			<!-- Germination -->
			<div>
				<h3 class="text-sm font-medium mb-2">Germination</h3>
				<p class="text-sm">
					{formatRange(plant.daysToGermination, plant.daysToGerminationMax)} days
				</p>
				{#if plant.germinationNotes}
					<p class="text-sm text-muted-foreground mt-1">{plant.germinationNotes}</p>
				{/if}
			</div>

			<!-- Harvest Info (kind-specific) -->
			{#if plant.kind === 'flower'}
				<div>
					<h3 class="text-sm font-medium mb-2">Harvest Info</h3>
					<div class="text-sm space-y-1">
						<p>
							<span class="text-muted-foreground">Cut & Come Again:</span>
							{plant.cutAndComeAgain ? 'Yes' : 'No'}
						</p>
						{#if plant.cutAndComeAgainNotes}
							<p class="text-muted-foreground">{plant.cutAndComeAgainNotes}</p>
						{/if}
						{#if plant.bloomsPerPlant}
							<p><span class="text-muted-foreground">Blooms per plant:</span> {plant.bloomsPerPlant}</p>
						{/if}
					</div>
				</div>
			{/if}

			{#if plant.kind === 'vegetable' || plant.kind === 'herb'}
				<div>
					<h3 class="text-sm font-medium mb-2">
						{plant.kind === 'vegetable' ? 'Harvest Info' : 'Usage Info'}
					</h3>
					<div class="text-sm space-y-1">
						{#if plant.ediblePart}
							<p><span class="text-muted-foreground">Edible part:</span> <span class="capitalize">{plant.ediblePart}</span></p>
						{/if}
						{#if plant.yieldPerPlant}
							<p><span class="text-muted-foreground">Yield per plant:</span> {plant.yieldPerPlant}</p>
						{/if}
						{#if plant.flavorProfile}
							<p><span class="text-muted-foreground">Flavor:</span> {plant.flavorProfile}</p>
						{/if}
						{#if plant.storageLife}
							<p><span class="text-muted-foreground">Storage:</span> {plant.storageLife}</p>
						{/if}
					</div>
				</div>
			{/if}

			{#if plant.cookingUses && plant.cookingUses.length > 0}
				<div>
					<h3 class="text-sm font-medium mb-2">Cooking Uses</h3>
					<div class="flex flex-wrap gap-2">
						{#each plant.cookingUses as use}
							<span class="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full capitalize">
								{use}
							</span>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Harvest Tips -->
			{#if plant.harvestTips}
				<div>
					<h3 class="text-sm font-medium mb-2">Harvest Tips</h3>
					<p class="text-sm text-muted-foreground">{plant.harvestTips}</p>
				</div>
			{/if}

			<!-- When to Plant -->
			<div>
				<h3 class="text-sm font-medium mb-2">When to Plant</h3>
				<p class="text-sm">{plant.whenToPlant}</p>
				<p class="text-xs text-muted-foreground mt-1">USDA Zones: {plant.usdaZones}</p>
			</div>

			<!-- Companion Plants -->
			{#if plant.companionPlants && plant.companionPlants.length > 0}
				<div>
					<h3 class="text-sm font-medium mb-2">Companion Plants</h3>
					<div class="flex flex-wrap gap-2">
						{#each plant.companionPlants as companion}
							<span class="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
								{companion}
							</span>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Common Pests -->
			{#if plant.commonPests && plant.commonPests.length > 0}
				<div>
					<h3 class="text-sm font-medium mb-2">Watch Out For</h3>
					<div class="flex flex-wrap gap-2">
						{#each plant.commonPests as pest}
							<span class="px-2 py-1 bg-destructive/10 text-destructive text-xs rounded-full">
								{pest}
							</span>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Special Notes -->
			{#if plant.specialNotes}
				<div>
					<h3 class="text-sm font-medium mb-2">Growing Notes</h3>
					<p class="text-sm text-muted-foreground">{plant.specialNotes}</p>
				</div>
			{/if}

			<!-- Sentinel for scroll detection (invisible) -->
			<div bind:this={sentinelElement} class="h-1" aria-hidden="true"></div>
		</div>
	</aside>
{/if}
