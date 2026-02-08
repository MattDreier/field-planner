<script lang="ts">
	import type { PlantData } from '$lib/data/plants';

	interface Props {
		selectedCategories: Set<string>;
		quickHarvest: boolean;
		cutAndComeAgain: boolean;
		beginnerFriendly: boolean;
		sortBy: 'name' | 'height' | 'days-to-harvest';
		onToggleCategory: (cat: string) => void;
		onToggleQuickHarvest: () => void;
		onToggleCutAndComeAgain: () => void;
		onToggleBeginnerFriendly: () => void;
		onSetSortBy: (sort: 'name' | 'height' | 'days-to-harvest') => void;
		onClearAll: () => void;
		activeFilterCount: number;
	}

	let {
		selectedCategories,
		quickHarvest,
		cutAndComeAgain,
		beginnerFriendly,
		sortBy,
		onToggleCategory,
		onToggleQuickHarvest,
		onToggleCutAndComeAgain,
		onToggleBeginnerFriendly,
		onSetSortBy,
		onClearAll,
		activeFilterCount
	}: Props = $props();

	const categories: { value: PlantData['category']; label: string }[] = [
		{ value: 'annual', label: 'Annual' },
		{ value: 'perennial', label: 'Perennial' },
		{ value: 'biennial', label: 'Biennial' },
		{ value: 'tender-perennial', label: 'Tender Perennial' },
		{ value: 'hardy-annual', label: 'Hardy Annual' },
		{ value: 'cool-season-annual', label: 'Cool Season' }
	];

	const sortOptions: { value: 'name' | 'height' | 'days-to-harvest'; label: string }[] = [
		{ value: 'name', label: 'Name' },
		{ value: 'height', label: 'Height' },
		{ value: 'days-to-harvest', label: 'Days to Harvest' }
	];
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<span class="text-sm font-semibold">Advanced Filters</span>
		{#if activeFilterCount > 0}
			<button
				type="button"
				class="text-xs text-muted-foreground hover:text-foreground transition-colors"
				onclick={onClearAll}
			>
				Clear all
			</button>
		{/if}
	</div>

	<!-- Category -->
	<div class="space-y-1.5">
		<span class="text-xs font-medium text-muted-foreground">Category</span>
		<div class="flex flex-wrap gap-1.5">
			{#each categories as cat}
				<button
					type="button"
					class="px-2 py-0.5 text-xs rounded-full border transition-colors
						{selectedCategories.has(cat.value)
						? 'bg-primary text-primary-foreground border-primary'
						: 'bg-transparent text-muted-foreground border-border hover:bg-muted hover:text-foreground'}"
					onclick={() => onToggleCategory(cat.value)}
				>
					{cat.label}
				</button>
			{/each}
		</div>
	</div>

	<!-- Quick Presets -->
	<div class="space-y-1.5">
		<span class="text-xs font-medium text-muted-foreground">Quick Presets</span>
		<div class="flex flex-wrap gap-1.5">
			<button
				type="button"
				class="px-2 py-0.5 text-xs rounded-full border transition-colors
					{quickHarvest
					? 'bg-primary text-primary-foreground border-primary'
					: 'bg-transparent text-muted-foreground border-border hover:bg-muted hover:text-foreground'}"
				onclick={onToggleQuickHarvest}
			>
				Quick Harvest
			</button>
			<button
				type="button"
				class="px-2 py-0.5 text-xs rounded-full border transition-colors
					{cutAndComeAgain
					? 'bg-primary text-primary-foreground border-primary'
					: 'bg-transparent text-muted-foreground border-border hover:bg-muted hover:text-foreground'}"
				onclick={onToggleCutAndComeAgain}
			>
				Cut & Come Again
			</button>
			<button
				type="button"
				class="px-2 py-0.5 text-xs rounded-full border transition-colors
					{beginnerFriendly
					? 'bg-primary text-primary-foreground border-primary'
					: 'bg-transparent text-muted-foreground border-border hover:bg-muted hover:text-foreground'}"
				onclick={onToggleBeginnerFriendly}
			>
				Beginner Friendly
			</button>
		</div>
	</div>

	<!-- Sort By -->
	<div class="space-y-1.5">
		<span class="text-xs font-medium text-muted-foreground">Sort By</span>
		<div class="flex gap-1.5">
			{#each sortOptions as opt}
				<button
					type="button"
					class="px-2 py-0.5 text-xs rounded-full border transition-colors
						{sortBy === opt.value
						? 'bg-primary text-primary-foreground border-primary'
						: 'bg-transparent text-muted-foreground border-border hover:bg-muted hover:text-foreground'}"
					onclick={() => onSetSortBy(opt.value)}
				>
					{opt.label}
				</button>
			{/each}
		</div>
	</div>
</div>
