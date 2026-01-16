<script lang="ts">
	import { getFlowerById, type FlowerData } from '$lib/data/flowers';
	import { X, Droplets, Sun, Thermometer, Scissors, Calendar, Ruler, Leaf } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import type { PlacedPlant } from '$lib/types';

	interface Props {
		flowerId: string;
		selectedPlant?: PlacedPlant | null;
		onClose: () => void;
	}

	let { flowerId, selectedPlant = null, onClose }: Props = $props();

	const flower = $derived(getFlowerById(flowerId));

	function formatRange(min: number, max?: number, unit: string = ''): string {
		if (max && max !== min) {
			return `${min}-${max}${unit}`;
		}
		return `${min}${unit}`;
	}
</script>

{#if flower}
	<aside
		class="w-80 border-l border-border bg-card flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
	>
		<!-- Header -->
		<div class="flex items-start justify-between p-4 border-b border-border">
			<div>
				<h2 class="text-lg font-semibold">{flower.name}</h2>
				<p class="text-sm text-muted-foreground italic">{flower.scientificName}</p>
			</div>
			<Button variant="ghost" size="icon" onclick={onClose} aria-label="Close panel">
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
					<p class="text-sm font-semibold">{formatRange(flower.heightMin, flower.heightMax, '"')}</p>
				</div>
				<div class="bg-muted/50 rounded-lg p-3">
					<div class="flex items-center gap-2 text-muted-foreground mb-1">
						<Leaf class="w-4 h-4" />
						<span class="text-xs font-medium">Spacing</span>
					</div>
					<p class="text-sm font-semibold">{formatRange(flower.spacingMin, flower.spacingMax, '"')}</p>
				</div>
				<div class="bg-muted/50 rounded-lg p-3">
					<div class="flex items-center gap-2 text-muted-foreground mb-1">
						<Calendar class="w-4 h-4" />
						<span class="text-xs font-medium">Days to Harvest</span>
					</div>
					<p class="text-sm font-semibold">{formatRange(flower.daysToHarvest, flower.daysToHarvestMax)}</p>
				</div>
				<div class="bg-muted/50 rounded-lg p-3">
					<div class="flex items-center gap-2 text-muted-foreground mb-1">
						<Scissors class="w-4 h-4" />
						<span class="text-xs font-medium">Vase Life</span>
					</div>
					<p class="text-sm font-semibold">{formatRange(flower.vaseLifeDays, flower.vaseLifeDaysMax)} days</p>
				</div>
			</div>

			<!-- Category & Type -->
			<div>
				<h3 class="text-sm font-medium mb-2">Plant Type</h3>
				<div class="flex flex-wrap gap-2">
					<span class="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full capitalize">
						{flower.category.replace(/-/g, ' ')}
					</span>
					<span class="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full capitalize">
						{flower.propagationMethod}
					</span>
				</div>
			</div>

			<!-- Colors -->
			{#if flower.colors && flower.colors.length > 0}
				<div>
					<h3 class="text-sm font-medium mb-2">Available Colors</h3>
					<div class="flex flex-wrap gap-2">
						{#each flower.colors as color}
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
							<p class="text-sm">{flower.lightRequirements}</p>
						</div>
					</div>
					<div class="flex items-start gap-3">
						<Droplets class="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
						<div>
							<p class="text-xs text-muted-foreground">Water</p>
							<p class="text-sm">{flower.wateringNeeds}</p>
						</div>
					</div>
					<div class="flex items-start gap-3">
						<Thermometer class="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
						<div>
							<p class="text-xs text-muted-foreground">Germination Temp</p>
							<p class="text-sm">{flower.germinationTempMin}-{flower.germinationTempMax}°F</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Soil -->
			<div>
				<h3 class="text-sm font-medium mb-2">Soil Requirements</h3>
				<div class="text-sm space-y-1">
					<p><span class="text-muted-foreground">pH:</span> {flower.soilPH}</p>
					<p><span class="text-muted-foreground">Type:</span> {flower.soilType}</p>
					<p><span class="text-muted-foreground">Fertilizer:</span> {flower.fertilizer}</p>
				</div>
			</div>

			<!-- Germination -->
			<div>
				<h3 class="text-sm font-medium mb-2">Germination</h3>
				<p class="text-sm">
					{formatRange(flower.daysToGermination, flower.daysToGerminationMax)} days
				</p>
				{#if flower.germinationNotes}
					<p class="text-sm text-muted-foreground mt-1">{flower.germinationNotes}</p>
				{/if}
			</div>

			<!-- Cut & Come Again -->
			<div>
				<h3 class="text-sm font-medium mb-2">Harvest Info</h3>
				<div class="text-sm space-y-1">
					<p>
						<span class="text-muted-foreground">Cut & Come Again:</span>
						{flower.cutAndComeAgain ? 'Yes' : 'No'}
					</p>
					{#if flower.cutAndComeAgainNotes}
						<p class="text-muted-foreground">{flower.cutAndComeAgainNotes}</p>
					{/if}
					{#if flower.bloomsPerPlant}
						<p><span class="text-muted-foreground">Blooms per plant:</span> {flower.bloomsPerPlant}</p>
					{/if}
				</div>
			</div>

			<!-- Harvest Tips -->
			{#if flower.harvestTips}
				<div>
					<h3 class="text-sm font-medium mb-2">Harvest Tips</h3>
					<p class="text-sm text-muted-foreground">{flower.harvestTips}</p>
				</div>
			{/if}

			<!-- When to Plant -->
			<div>
				<h3 class="text-sm font-medium mb-2">When to Plant</h3>
				<p class="text-sm">{flower.whenToPlant}</p>
				<p class="text-xs text-muted-foreground mt-1">USDA Zones: {flower.usdaZones}</p>
			</div>

			<!-- Companion Plants -->
			{#if flower.companionPlants && flower.companionPlants.length > 0}
				<div>
					<h3 class="text-sm font-medium mb-2">Companion Plants</h3>
					<div class="flex flex-wrap gap-2">
						{#each flower.companionPlants as companion}
							<span class="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
								{companion}
							</span>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Common Pests -->
			{#if flower.commonPests && flower.commonPests.length > 0}
				<div>
					<h3 class="text-sm font-medium mb-2">Watch Out For</h3>
					<div class="flex flex-wrap gap-2">
						{#each flower.commonPests as pest}
							<span class="px-2 py-1 bg-destructive/10 text-destructive text-xs rounded-full">
								{pest}
							</span>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Special Notes -->
			{#if flower.specialNotes}
				<div>
					<h3 class="text-sm font-medium mb-2">Growing Notes</h3>
					<p class="text-sm text-muted-foreground">{flower.specialNotes}</p>
				</div>
			{/if}
		</div>
	</aside>
{/if}
