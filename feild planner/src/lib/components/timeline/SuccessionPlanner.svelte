<script lang="ts">
	import { X, Calendar, Repeat, Sprout, Info, ChevronRight } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { FLOWER_DATABASE, getFlowerById, type FlowerData } from '$lib/data/flowers';
	import type { Bed } from '$lib/types';
	import {
		suggestSuccessionInterval,
		generateSuccessionDates,
		formatDateShort,
		formatDateISO,
		parseDate,
		type SuccessionSuggestion
	} from '$lib/utils/timeline';
	import { createSuccessionGroup, timelineState } from '$lib/stores/timeline.svelte';
	import { calculateOptimalPlantingDate } from '$lib/utils/scheduling';
	import type { Id } from '../../../convex/_generated/dataModel';

	interface Props {
		beds: Bed[];
		layoutId: Id<'layouts'>;
		onClose: () => void;
		onCreated?: (groupId: string) => void;
	}

	let { beds, layoutId, onClose, onCreated }: Props = $props();

	// Form state
	let selectedFlowerId = $state('');
	let selectedBedId = $state('');
	let startDate = $state('');
	let plantingMethod = $state<'indoor' | 'direct'>('direct');
	let coverageType = $state<'continuous' | 'staggered' | 'single'>('continuous');

	// Override state
	let useCustomInterval = $state(false);
	let customIntervalDays = $state(14);
	let useCustomCount = $state(false);
	let customPlantingCount = $state(4);

	// Derived state
	const selectedFlower = $derived(selectedFlowerId ? getFlowerById(selectedFlowerId) : null);
	const selectedBed = $derived(beds.find((b) => b._id === selectedBedId));

	// Calculate season length from frost dates
	const seasonLengthDays = $derived.by(() => {
		const lastFrost = parseDate(timelineState.gardenSettings.lastFrostDate);
		const firstFrost = parseDate(timelineState.gardenSettings.firstFrostDate);
		if (!lastFrost || !firstFrost) return 150; // Default 5 months
		return Math.round((firstFrost.getTime() - lastFrost.getTime()) / (1000 * 60 * 60 * 24));
	});

	// Get suggestion from algorithm
	const suggestion = $derived.by((): SuccessionSuggestion | null => {
		if (!selectedFlower) return null;
		return suggestSuccessionInterval(selectedFlower, seasonLengthDays, coverageType);
	});

	// Effective values (custom or suggested)
	const effectiveIntervalDays = $derived(
		useCustomInterval ? customIntervalDays : (suggestion?.intervalDays ?? 14)
	);
	const effectivePlantingCount = $derived(
		useCustomCount ? customPlantingCount : (suggestion?.totalPlantings ?? 4)
	);

	// Generate preview dates
	const previewDates = $derived.by((): Date[] => {
		const start = parseDate(startDate);
		if (!start || effectivePlantingCount < 1) return [];
		return generateSuccessionDates(start, effectiveIntervalDays, effectivePlantingCount);
	});

	// Validation
	const isValid = $derived(
		selectedFlowerId !== '' &&
			selectedBedId !== '' &&
			startDate !== '' &&
			previewDates.length > 0
	);

	// Planting method availability
	const canStartIndoors = $derived(
		selectedFlower?.propagationMethod === 'seed' ||
			selectedFlower?.propagationMethod === 'transplant'
	);
	const canDirectSow = $derived(
		selectedFlower?.propagationMethod === 'seed' ||
			selectedFlower?.propagationMethod === 'corm' ||
			selectedFlower?.propagationMethod === 'division'
	);

	// Reset planting method if not available
	$effect(() => {
		if (plantingMethod === 'indoor' && !canStartIndoors && canDirectSow) {
			plantingMethod = 'direct';
		} else if (plantingMethod === 'direct' && !canDirectSow && canStartIndoors) {
			plantingMethod = 'indoor';
		}
	});

	// When coverage type changes to single, reset to 1 planting
	$effect(() => {
		if (coverageType === 'single') {
			useCustomCount = false;
		}
	});

	function handleConfirm() {
		if (!isValid || !selectedFlower) return;

		const start = parseDate(startDate);
		if (!start) return;

		const groupId = createSuccessionGroup(
			selectedBedId as Id<'beds'>,
			layoutId,
			selectedFlowerId,
			start,
			effectiveIntervalDays,
			effectivePlantingCount,
			plantingMethod
		);

		onCreated?.(groupId);
		onClose();
	}

	function handleFlowerChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		selectedFlowerId = target.value;
		// Reset custom overrides when flower changes
		useCustomInterval = false;
		useCustomCount = false;

		// Auto-fill first planting date based on flower's schedule
		const flower = selectedFlowerId ? getFlowerById(selectedFlowerId) : null;
		if (flower?.plantingSchedule) {
			const lastFrost = parseDate(timelineState.gardenSettings.lastFrostDate);
			const firstFrost = parseDate(timelineState.gardenSettings.firstFrostDate);

			if (lastFrost && firstFrost) {
				const context = {
					zone: timelineState.gardenSettings.hardinessZone,
					lastFrostDate: lastFrost,
					firstFrostDate: firstFrost,
					year: lastFrost.getFullYear()
				};

				const dates = calculateOptimalPlantingDate(flower.plantingSchedule, context);
				// Use indoor start date or direct sow date depending on what's available
				startDate = dates.indoorStartDate ?? dates.directSowDate ?? '';

				// Also set the planting method based on the schedule
				// (compute availability inline since derived values won't update until next cycle)
				const scheduleMethod = flower.plantingSchedule.primary.method;
				const flowerCanIndoor =
					flower.propagationMethod === 'seed' || flower.propagationMethod === 'transplant';
				const flowerCanDirect =
					flower.propagationMethod === 'seed' ||
					flower.propagationMethod === 'corm' ||
					flower.propagationMethod === 'division';

				if (scheduleMethod === 'indoor' && flowerCanIndoor) {
					plantingMethod = 'indoor';
				} else if (scheduleMethod === 'direct' && flowerCanDirect) {
					plantingMethod = 'direct';
				}
			}
		} else if (timelineState.gardenSettings.lastFrostDate) {
			// Fall back to last frost date if no schedule
			startDate = timelineState.gardenSettings.lastFrostDate;
		}
	}

	function handleBedChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		selectedBedId = target.value;
	}

	function handleCoverageChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		coverageType = target.value as 'continuous' | 'staggered' | 'single';
	}

	function handleMethodChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		plantingMethod = target.value as 'indoor' | 'direct';
	}
</script>

<!-- Modal backdrop -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200"
	onclick={onClose}
	onkeydown={(e) => e.key === 'Escape' && onClose()}
	role="dialog"
	aria-modal="true"
	aria-labelledby="succession-planner-title"
	tabindex="-1"
>
	<!-- Modal content -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="w-full max-w-lg max-h-[90vh] overflow-hidden bg-card rounded-xl shadow-xl border border-border animate-in zoom-in-95 duration-200"
		onclick={(e) => e.stopPropagation()}
	>
		<!-- Header -->
		<div class="flex items-center justify-between p-4 border-b border-border">
			<div class="flex items-center gap-3">
				<div class="p-2 bg-green-500/10 rounded-lg">
					<Repeat class="w-5 h-5 text-green-500" />
				</div>
				<div>
					<h2 id="succession-planner-title" class="text-lg font-semibold">
						Plan Succession Planting
					</h2>
					<p class="text-sm text-muted-foreground">
						Schedule multiple plantings for continuous harvest
					</p>
				</div>
			</div>
			<Button variant="ghost" size="icon" onclick={onClose} aria-label="Close">
				<X class="w-5 h-5" />
			</Button>
		</div>

		<!-- Scrollable content -->
		<div class="overflow-y-auto max-h-[calc(90vh-140px)] p-4 space-y-4">
			<!-- Selection Section -->
			<div class="grid gap-4 sm:grid-cols-2">
				<!-- Flower Selection -->
				<div>
					<label for="flower-select" class="block text-sm font-medium mb-1.5">
						Flower
					</label>
					<select
						id="flower-select"
						class="w-full h-10 px-3 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
						value={selectedFlowerId}
						onchange={handleFlowerChange}
					>
						<option value="">Select a flower...</option>
						{#each FLOWER_DATABASE as flower}
							<option value={flower.id}>{flower.name}</option>
						{/each}
					</select>
				</div>

				<!-- Bed Selection -->
				<div>
					<label for="bed-select" class="block text-sm font-medium mb-1.5">
						Target Bed
					</label>
					<select
						id="bed-select"
						class="w-full h-10 px-3 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
						value={selectedBedId}
						onchange={handleBedChange}
					>
						<option value="">Select a bed...</option>
						{#each beds as bed, i}
							<option value={bed._id}>{bed.name ?? `Bed ${i + 1}`}</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- Start Date & Method -->
			<div class="grid gap-4 sm:grid-cols-2">
				<!-- Start Date -->
				<div>
					<label for="start-date" class="block text-sm font-medium mb-1.5">
						First Planting Date
					</label>
					<input
						type="date"
						id="start-date"
						bind:value={startDate}
						class="w-full h-10 px-3 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
					/>
				</div>

				<!-- Planting Method -->
				<div>
					<label for="method-select" class="block text-sm font-medium mb-1.5">
						Planting Method
					</label>
					<select
						id="method-select"
						class="w-full h-10 px-3 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
						value={plantingMethod}
						onchange={handleMethodChange}
						disabled={!selectedFlower}
					>
						{#if canStartIndoors}
							<option value="indoor">Start Indoors</option>
						{/if}
						{#if canDirectSow}
							<option value="direct">Direct Sow</option>
						{/if}
					</select>
				</div>
			</div>

			<!-- Coverage Type -->
			<div>
				<label for="coverage-select" class="block text-sm font-medium mb-1.5">
					Coverage Goal
				</label>
				<select
					id="coverage-select"
					class="w-full h-10 px-3 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
					value={coverageType}
					onchange={handleCoverageChange}
				>
					<option value="continuous">Continuous - Fresh flowers always available</option>
					<option value="staggered">Staggered - Periodic harvests with gaps</option>
					<option value="single">Single - One-time planting only</option>
				</select>
			</div>

			<!-- Suggestion Card -->
			{#if suggestion && selectedFlower && coverageType !== 'single'}
				<Card class="bg-muted/30 border-dashed">
					<CardHeader class="pb-2">
						<CardTitle class="text-sm font-medium flex items-center gap-2">
							<Info class="w-4 h-4 text-blue-500" />
							Recommended Schedule
						</CardTitle>
					</CardHeader>
					<CardContent class="text-sm">
						<p class="text-muted-foreground">{suggestion.reasoning}</p>
						<div class="mt-3 flex items-center gap-4 text-xs">
							<span class="px-2 py-1 bg-background rounded border">
								{suggestion.intervalDays} day intervals
							</span>
							<span class="px-2 py-1 bg-background rounded border">
								{suggestion.totalPlantings} plantings
							</span>
						</div>
					</CardContent>
				</Card>
			{/if}

			<!-- Customization Section -->
			{#if coverageType !== 'single'}
				<div class="space-y-3 pt-2">
					<p class="text-sm font-medium">Customize Schedule</p>

					<!-- Custom Interval -->
					<div class="flex items-center gap-3">
						<input
							type="checkbox"
							id="custom-interval"
							bind:checked={useCustomInterval}
							class="w-4 h-4 rounded border-border"
						/>
						<label for="custom-interval" class="text-sm flex-1">
							Override interval
						</label>
						{#if useCustomInterval}
							<div class="flex items-center gap-2">
								<input
									type="number"
									min="1"
									max="365"
									bind:value={customIntervalDays}
									class="w-20 h-8 px-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
								/>
								<span class="text-sm text-muted-foreground">days</span>
							</div>
						{/if}
					</div>

					<!-- Custom Count -->
					<div class="flex items-center gap-3">
						<input
							type="checkbox"
							id="custom-count"
							bind:checked={useCustomCount}
							class="w-4 h-4 rounded border-border"
						/>
						<label for="custom-count" class="text-sm flex-1">
							Override number of plantings
						</label>
						{#if useCustomCount}
							<div class="flex items-center gap-2">
								<input
									type="number"
									min="1"
									max="52"
									bind:value={customPlantingCount}
									class="w-20 h-8 px-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
								/>
								<span class="text-sm text-muted-foreground">plantings</span>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Preview Section -->
			{#if previewDates.length > 0 && selectedFlower}
				<div class="pt-2">
					<div class="flex items-center justify-between mb-3">
						<p class="text-sm font-medium">Preview Schedule</p>
						<span class="text-xs text-muted-foreground">
							{previewDates.length} {previewDates.length === 1 ? 'planting' : 'plantings'}
						</span>
					</div>

					<div class="bg-muted/30 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
						{#each previewDates as date, i}
							<div
								class="flex items-center gap-3 p-2 bg-background rounded-md border border-border/50"
							>
								<div
									class="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center"
								>
									{i + 1}
								</div>
								<div class="flex-1">
									<div class="flex items-center gap-2">
										<Calendar class="w-3.5 h-3.5 text-muted-foreground" />
										<span class="text-sm font-medium">{formatDateShort(date)}</span>
									</div>
									<p class="text-xs text-muted-foreground mt-0.5">
										{plantingMethod === 'indoor' ? 'Start indoors' : 'Direct sow'}
										{#if i > 0}
											<span class="mx-1">-</span>
											{effectiveIntervalDays} days after planting {i}
										{/if}
									</p>
								</div>
								<Sprout class="w-4 h-4 text-green-500" />
							</div>
						{/each}
					</div>

					<!-- Harvest timeline hint -->
					{#if selectedFlower.daysToHarvest}
						<p class="text-xs text-muted-foreground mt-2 flex items-center gap-1">
							<ChevronRight class="w-3 h-3" />
							First harvest expected around {formatDateShort(
								new Date(
									previewDates[0].getTime() +
										selectedFlower.daysToHarvest * 24 * 60 * 60 * 1000
								)
							)}
						</p>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="flex items-center justify-end gap-3 p-4 border-t border-border bg-muted/30">
			<Button variant="outline" onclick={onClose}>Cancel</Button>
			<Button onclick={handleConfirm} disabled={!isValid}>
				<Sprout class="w-4 h-4 mr-2" />
				Create {effectivePlantingCount}
				{effectivePlantingCount === 1 ? 'Planting' : 'Plantings'}
			</Button>
		</div>
	</div>
</div>
