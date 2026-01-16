<script lang="ts">
	import { ChevronUp, ChevronDown, Calendar, Plus } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import TimelineGantt from './TimelineGantt.svelte';
	import TimelineLegend from './TimelineLegend.svelte';
	import {
		timelineState,
		togglePanel,
		setHardinessZone,
		setViewScale,
		initializeGardenSettings
	} from '$lib/stores/timeline.svelte';
	import { ZONE_OPTIONS, formatZone } from '$lib/data/hardinessZones';
	import type { Bed, PlacedPlant, GardenSettings, PlantingDates } from '$lib/types';
	import type { FlowerData } from '$lib/data/flowers';
	import { FLOWER_DATABASE } from '$lib/data/flowers';
	import { calculateLifecyclePhases, type TimelineEntry } from '$lib/utils/timeline';

	interface Props {
		beds: Bed[];
		plants: PlacedPlant[];
		gardenSettings: GardenSettings;
		onOpenSuccessionPlanner?: () => void;
		onUpdatePlantDates?: (plantId: string, dates: PlantingDates) => void;
	}

	let { beds, plants, gardenSettings, onOpenSuccessionPlanner, onUpdatePlantDates }: Props = $props();

	// Initialize frost dates on first render
	$effect(() => {
		initializeGardenSettings();
	});

	// Build flower lookup map
	const flowerMap = $derived.by(() => {
		const map = new Map<string, FlowerData>();
		for (const flower of FLOWER_DATABASE) {
			map.set(flower.id, flower);
		}
		return map;
	});

	// Build bed name lookup
	const bedNameMap = $derived.by(() => {
		const map = new Map<string, string>();
		for (const bed of beds) {
			map.set(bed._id, bed.name ?? `Bed ${beds.indexOf(bed) + 1}`);
		}
		return map;
	});

	// Build timeline entries from placed plants
	const timelineEntries = $derived.by((): TimelineEntry[] => {
		const entries: TimelineEntry[] = [];

		// Add placed plants that have planting dates
		for (const plant of plants) {
			if (!plant.plantingDates) continue;

			const flower = flowerMap.get(plant.flowerId);
			if (!flower) continue;

			const phases = calculateLifecyclePhases(plant.plantingDates, flower);
			if (phases.length === 0) continue;

			entries.push({
				id: plant._id,
				type: 'placed',
				flowerId: plant.flowerId,
				flowerName: plant.name,
				bedId: plant.bedId,
				bedName: bedNameMap.get(plant.bedId),
				plantingDates: plant.plantingDates,
				phases,
				successionGroupId: plant.successionGroupId,
				successionIndex: plant.successionIndex
			});
		}

		// Add planned plants
		for (const plant of timelineState.plannedPlants) {
			const flower = flowerMap.get(plant.flowerId);
			if (!flower) continue;

			const phases = calculateLifecyclePhases(plant.plantingDates, flower);
			if (phases.length === 0) continue;

			entries.push({
				id: plant._id,
				type: 'planned',
				flowerId: plant.flowerId,
				flowerName: flower.name,
				bedId: plant.bedId,
				bedName: bedNameMap.get(plant.bedId),
				plantingDates: plant.plantingDates,
				phases,
				successionGroupId: plant.successionGroupId,
				successionIndex: plant.successionIndex,
				quantity: plant.quantity,
				status: plant.status
			});
		}

		return entries;
	});

	// View scale options
	const viewScaleOptions = [
		{ value: 'day', label: 'Day' },
		{ value: 'week', label: 'Week' },
		{ value: 'month', label: 'Month' },
		{ value: 'season', label: 'Season' }
	] as const;
</script>

<!-- Timeline Panel - positioned at bottom of canvas area -->
<div
	class="absolute bottom-0 left-0 right-0 z-20 transition-transform duration-300 ease-in-out"
	class:translate-y-[calc(100%-48px)]={!timelineState.isPanelOpen}
>
	<!-- Panel header / collapse handle -->
	<button
		type="button"
		onclick={togglePanel}
		class="w-full h-12 bg-card border-t border-x border-border rounded-t-lg flex items-center justify-between px-4 hover:bg-accent/50 transition-colors cursor-pointer"
	>
		<div class="flex items-center gap-3">
			<Calendar class="h-4 w-4 text-muted-foreground" />
			<span class="font-medium">Timeline</span>
			<span class="text-xs text-muted-foreground">(T)</span>
			{#if timelineEntries.length > 0}
				<span class="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
					{timelineEntries.length} {timelineEntries.length === 1 ? 'plant' : 'plants'}
				</span>
			{/if}
		</div>

		<div class="flex items-center gap-3">
			{#if timelineState.isPanelOpen}
				<!-- Controls visible when open -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<div
					class="flex items-center gap-2"
					onclick={(e) => e.stopPropagation()}
					onkeydown={(e) => e.stopPropagation()}
					role="group"
					aria-label="Timeline controls"
				>
					<!-- Zone selector -->
					<select
						class="h-8 pl-2 pr-6 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3d%22http%3a%2f%2fwww.w3.org%2f2000%2fsvg%22%20width%3d%2212%22%20height%3d%2212%22%20viewBox%3d%220%200%2024%2024%22%20fill%3d%22none%22%20stroke%3d%22%239ca3af%22%20stroke-width%3d%222%22%3e%3cpath%20d%3d%22m6%209%206%206%206-6%22%2f%3e%3c%2fsvg%3e')] bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat"
						value={timelineState.gardenSettings.hardinessZone}
						onchange={(e) => setHardinessZone(e.currentTarget.value)}
					>
						{#each ZONE_OPTIONS as zone}
							<option value={zone}>{formatZone(zone)}</option>
						{/each}
					</select>

					<!-- View scale selector -->
					<select
						class="h-8 pl-2 pr-6 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3d%22http%3a%2f%2fwww.w3.org%2f2000%2fsvg%22%20width%3d%2212%22%20height%3d%2212%22%20viewBox%3d%220%200%2024%2024%22%20fill%3d%22none%22%20stroke%3d%22%239ca3af%22%20stroke-width%3d%222%22%3e%3cpath%20d%3d%22m6%209%206%206%206-6%22%2f%3e%3c%2fsvg%3e')] bg-[length:12px] bg-[right_0.5rem_center] bg-no-repeat"
						value={timelineState.viewScale}
						onchange={(e) => setViewScale(e.currentTarget.value as 'day' | 'week' | 'month' | 'season')}
					>
						{#each viewScaleOptions as opt}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>

					<!-- Add succession button -->
					{#if onOpenSuccessionPlanner}
						<Button variant="outline" size="sm" class="h-8 text-xs border-border" onclick={onOpenSuccessionPlanner}>
							<Plus class="h-3 w-3 mr-1" />
							Succession
						</Button>
					{/if}
				</div>
			{/if}

			{#if timelineState.isPanelOpen}
				<ChevronDown class="h-4 w-4 text-muted-foreground" />
			{:else}
				<ChevronUp class="h-4 w-4 text-muted-foreground" />
			{/if}
		</div>
	</button>

	<!-- Panel content -->
	<div
		class="bg-card border-x border-b border-border overflow-hidden"
		style="height: {timelineState.panelHeight}px"
	>
		{#if timelineEntries.length === 0}
			<!-- Empty state -->
			<div class="h-full flex flex-col items-center justify-center text-muted-foreground">
				<Calendar class="h-12 w-12 mb-3 opacity-50" />
				<p class="text-sm font-medium">No plants scheduled yet</p>
				<p class="text-xs mt-1">Add planting dates to your plants to see them here</p>
			</div>
		{:else}
			<div class="h-full flex flex-col">
				<!-- Legend -->
				<TimelineLegend />

				<!-- Gantt chart -->
				<div class="flex-1 overflow-hidden">
					<TimelineGantt
						entries={timelineEntries}
						{beds}
						gardenSettings={timelineState.gardenSettings}
						viewYear={timelineState.viewYear}
						viewScale={timelineState.viewScale}
						{onUpdatePlantDates}
					/>
				</div>
			</div>
		{/if}
	</div>
</div>
