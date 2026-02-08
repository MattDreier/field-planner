<script lang="ts">
	import type { PlantData } from '$lib/data/plants';
	import { getAllSpeciesGroups } from '$lib/data/plants';
	import { addUserPlant, updateUserPlant, generatePlantId, getUserPlants } from '$lib/stores/userPlants.svelte';
	import type { UserPlantData } from '$lib/types/userPlants';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';

	interface Props {
		open: boolean;
		onOpenChange: (open: boolean) => void;
		editingPlant?: UserPlantData | null;
	}

	let { open = $bindable(false), onOpenChange, editingPlant = null }: Props = $props();

	let step = $state(1);
	let errors = $state<Record<string, string>>({});

	// ── Step 1: Basics (required) ──────────────────────────────────
	let name = $state('');
	let kind = $state<PlantData['kind']>('vegetable');
	let spacingMin = $state(6);
	let spacingMax = $state(12);
	let heightMin = $state(12);
	let heightMax = $state(24);
	let scientificName = $state('');
	let speciesGroup = $state('');
	let newGroupName = $state('');
	let useNewGroup = $state(false);

	// ── Step 2: Timeline (optional) ────────────────────────────────
	let category = $state<PlantData['category']>('annual');
	let propagationMethod = $state<PlantData['propagationMethod']>('seed');
	let daysToGermination = $state(7);
	let daysToHarvest = $state(60);
	let harvestWindowDays = $state(30);

	// ── Step 3: Growing details (optional) ─────────────────────────
	let lightRequirements = $state('Full sun (6-8 hours)');
	let wateringNeeds = $state('Regular watering');
	let soilType = $state('Well-drained, fertile soil');
	let soilPH = $state('6.0-7.0');
	let specialNotes = $state('');

	const existingGroups = $derived(getAllSpeciesGroups(getUserPlants()));
	const isEditing = $derived(editingPlant !== null);

	// Load editing data when editingPlant changes
	$effect(() => {
		if (editingPlant) {
			name = editingPlant.name;
			kind = editingPlant.kind;
			spacingMin = editingPlant.spacingMin;
			spacingMax = editingPlant.spacingMax;
			heightMin = editingPlant.heightMin;
			heightMax = editingPlant.heightMax;
			scientificName = editingPlant.scientificName;
			speciesGroup = editingPlant.speciesGroup ?? '';
			category = editingPlant.category;
			propagationMethod = editingPlant.propagationMethod;
			daysToGermination = editingPlant.daysToGermination;
			daysToHarvest = editingPlant.daysToHarvest;
			harvestWindowDays = editingPlant.harvestWindowDays;
			lightRequirements = editingPlant.lightRequirements;
			wateringNeeds = editingPlant.wateringNeeds;
			soilType = editingPlant.soilType;
			soilPH = editingPlant.soilPH;
			specialNotes = editingPlant.specialNotes;
		}
	});

	// Reset form when dialog opens/closes
	$effect(() => {
		if (!open) {
			step = 1;
			errors = {};
			if (!editingPlant) resetForm();
		}
	});

	function resetForm() {
		name = '';
		kind = 'vegetable';
		spacingMin = 6;
		spacingMax = 12;
		heightMin = 12;
		heightMax = 24;
		scientificName = '';
		speciesGroup = '';
		newGroupName = '';
		useNewGroup = false;
		category = 'annual';
		propagationMethod = 'seed';
		daysToGermination = 7;
		daysToHarvest = 60;
		harvestWindowDays = 30;
		lightRequirements = 'Full sun (6-8 hours)';
		wateringNeeds = 'Regular watering';
		soilType = 'Well-drained, fertile soil';
		soilPH = '6.0-7.0';
		specialNotes = '';
	}

	function validate(): boolean {
		const newErrors: Record<string, string> = {};
		if (!name.trim()) newErrors.name = 'Name is required';
		if (spacingMin <= 0) newErrors.spacingMin = 'Must be positive';
		if (heightMax <= 0) newErrors.heightMax = 'Must be positive';

		// Check name uniqueness (skip if editing the same plant)
		const allPlants = [...getUserPlants()];
		const isDuplicate = allPlants.some(
			(p) => p.name.toLowerCase() === name.trim().toLowerCase() && p.id !== editingPlant?.id
		);
		if (isDuplicate) newErrors.name = 'A plant with this name already exists';

		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	function buildPlantData(): Omit<UserPlantData, 'isUserPlant' | 'createdAt' | 'updatedAt'> {
		const resolvedGroup = useNewGroup ? newGroupName.trim() : speciesGroup;
		return {
			id: isEditing ? editingPlant!.id : generatePlantId(name.trim()),
			name: name.trim(),
			scientificName: scientificName.trim() || name.trim(),
			kind,
			category,
			propagationMethod,
			daysToGermination,
			daysToGerminationMax: undefined,
			germinationTempMin: 65,
			germinationTempMax: 85,
			daysToHarvest,
			daysToHarvestMax: undefined,
			heightMin,
			heightMax,
			spacingMin,
			spacingMax,
			lightRequirements,
			wateringNeeds,
			humidity: 'Moderate',
			soilPH,
			soilType,
			fertilizer: 'General purpose',
			harvestWindowDays,
			plantType: category.replace(/-/g, ' '),
			usdaZones: 'Varies',
			whenToPlant: 'After last frost',
			specialNotes: specialNotes.trim(),
			...(resolvedGroup ? { speciesGroup: resolvedGroup } : {})
		};
	}

	function handleSave() {
		if (!validate()) {
			step = 1;
			return;
		}

		const data = buildPlantData();

		if (isEditing) {
			updateUserPlant(editingPlant!.id, data);
		} else {
			addUserPlant(data);
		}

		onOpenChange(false);
	}

	function nextStep() {
		if (step === 1 && !validate()) return;
		step = Math.min(step + 1, 3);
	}

	function prevStep() {
		step = Math.max(step - 1, 1);
	}
</script>

<Dialog.Root bind:open onOpenChange={onOpenChange}>
	<Dialog.Content class="sm:max-w-lg max-h-[85vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>{isEditing ? 'Edit Plant' : 'Add Custom Plant'}</Dialog.Title>
			<Dialog.Description>
				{#if step === 1}
					Plant basics — name, type, and dimensions are required.
				{:else if step === 2}
					Timeline & growth details. These are optional — skip to save anytime.
				{:else}
					Growing conditions. Also optional — defaults will be used for skipped fields.
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<!-- Step indicator -->
		<div class="flex items-center gap-2 py-2">
			{#each [1, 2, 3] as s}
				<div
					class="flex-1 h-1.5 rounded-full transition-colors {s <= step ? 'bg-primary' : 'bg-muted'}"
				></div>
			{/each}
			<span class="text-xs text-muted-foreground ml-1">Step {step}/3</span>
		</div>

		<!-- Step 1: Basics -->
		{#if step === 1}
			<div class="space-y-4">
				<div>
					<label for="plant-name" class="text-sm font-medium">
						Name <span class="text-destructive">*</span>
					</label>
					<input
						id="plant-name"
						type="text"
						bind:value={name}
						placeholder="e.g. Cherry Tomato"
						class="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background {errors.name ? 'border-destructive' : 'border-input'}"
					/>
					{#if errors.name}
						<p class="text-xs text-destructive mt-1">{errors.name}</p>
					{/if}
				</div>

				<div>
					<label for="plant-kind" class="text-sm font-medium">
						Kind <span class="text-destructive">*</span>
					</label>
					<select
						id="plant-kind"
						bind:value={kind}
						class="mt-1 w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
					>
						<option value="flower">Flower</option>
						<option value="vegetable">Vegetable</option>
						<option value="herb">Herb</option>
					</select>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="spacing-min" class="text-sm font-medium">
							Spacing Min (in) <span class="text-destructive">*</span>
						</label>
						<input
							id="spacing-min"
							type="number"
							bind:value={spacingMin}
							min="1"
							class="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background {errors.spacingMin ? 'border-destructive' : 'border-input'}"
						/>
					</div>
					<div>
						<label for="spacing-max" class="text-sm font-medium">Spacing Max (in)</label>
						<input
							id="spacing-max"
							type="number"
							bind:value={spacingMax}
							min="1"
							class="mt-1 w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
						/>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="height-min" class="text-sm font-medium">Height Min (in)</label>
						<input
							id="height-min"
							type="number"
							bind:value={heightMin}
							min="1"
							class="mt-1 w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
						/>
					</div>
					<div>
						<label for="height-max" class="text-sm font-medium">
							Height Max (in) <span class="text-destructive">*</span>
						</label>
						<input
							id="height-max"
							type="number"
							bind:value={heightMax}
							min="1"
							class="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background {errors.heightMax ? 'border-destructive' : 'border-input'}"
						/>
					</div>
				</div>

				<div>
					<label for="scientific-name" class="text-sm font-medium">Scientific Name</label>
					<input
						id="scientific-name"
						type="text"
						bind:value={scientificName}
						placeholder="Optional"
						class="mt-1 w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
					/>
				</div>

				<!-- Species group selection -->
				<div>
					<label for="species-group" class="text-sm font-medium">Species Group</label>
					<p class="text-xs text-muted-foreground mb-1">
						Group with similar plants in the palette
					</p>
					{#if useNewGroup}
						<div class="flex gap-2">
							<input
								id="new-group-name"
								type="text"
								bind:value={newGroupName}
								placeholder="New group name..."
								class="flex-1 px-3 py-2 text-sm border border-input rounded-md bg-background"
							/>
							<Button variant="ghost" size="sm" onclick={() => { useNewGroup = false; newGroupName = ''; }}>
								Cancel
							</Button>
						</div>
					{:else}
						<div class="flex gap-2">
							<select
								id="species-group"
								bind:value={speciesGroup}
								class="flex-1 px-3 py-2 text-sm border border-input rounded-md bg-background"
							>
								<option value="">None (standalone)</option>
								{#each existingGroups as group}
									<option value={group}>{group}</option>
								{/each}
							</select>
							<Button variant="outline" size="sm" onclick={() => (useNewGroup = true)}>
								New
							</Button>
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Step 2: Timeline & Growth -->
		{#if step === 2}
			<div class="space-y-4">
				<div>
					<label for="plant-category" class="text-sm font-medium">Category</label>
					<select
						id="plant-category"
						bind:value={category}
						class="mt-1 w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
					>
						<option value="annual">Annual</option>
						<option value="perennial">Perennial</option>
						<option value="biennial">Biennial</option>
						<option value="tender-perennial">Tender Perennial</option>
						<option value="hardy-annual">Hardy Annual</option>
						<option value="cool-season-annual">Cool Season Annual</option>
					</select>
				</div>

				<div>
					<label for="propagation" class="text-sm font-medium">Propagation Method</label>
					<select
						id="propagation"
						bind:value={propagationMethod}
						class="mt-1 w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
					>
						<option value="seed">Seed</option>
						<option value="corm">Corm</option>
						<option value="division">Division</option>
						<option value="transplant">Transplant</option>
					</select>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="days-germination" class="text-sm font-medium">Days to Germinate</label>
						<input
							id="days-germination"
							type="number"
							bind:value={daysToGermination}
							min="1"
							class="mt-1 w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
						/>
					</div>
					<div>
						<label for="days-harvest" class="text-sm font-medium">Days to Harvest</label>
						<input
							id="days-harvest"
							type="number"
							bind:value={daysToHarvest}
							min="1"
							class="mt-1 w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
						/>
					</div>
				</div>

				<div>
					<label for="harvest-window" class="text-sm font-medium">Harvest Window (days)</label>
					<p class="text-xs text-muted-foreground mb-1">
						How many days the plant actively produces after first harvest
					</p>
					<input
						id="harvest-window"
						type="number"
						bind:value={harvestWindowDays}
						min="1"
						class="mt-1 w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
					/>
				</div>
			</div>
		{/if}

		<!-- Step 3: Growing Details -->
		{#if step === 3}
			<div class="space-y-4">
				<div>
					<label for="light" class="text-sm font-medium">Light Requirements</label>
					<select
						id="light"
						bind:value={lightRequirements}
						class="mt-1 w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
					>
						<option value="Full sun (8+ hours)">Full sun (8+ hours)</option>
						<option value="Full sun (6-8 hours)">Full sun (6-8 hours)</option>
						<option value="Partial shade (4-6 hours)">Partial shade (4-6 hours)</option>
						<option value="Shade tolerant (2-4 hours)">Shade tolerant (2-4 hours)</option>
					</select>
				</div>

				<div>
					<label for="water" class="text-sm font-medium">Watering Needs</label>
					<input
						id="water"
						type="text"
						bind:value={wateringNeeds}
						placeholder="e.g. Regular watering, 1-2 inches/week"
						class="mt-1 w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
					/>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="soil-type" class="text-sm font-medium">Soil Type</label>
						<input
							id="soil-type"
							type="text"
							bind:value={soilType}
							class="mt-1 w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
						/>
					</div>
					<div>
						<label for="soil-ph" class="text-sm font-medium">Soil pH</label>
						<input
							id="soil-ph"
							type="text"
							bind:value={soilPH}
							placeholder="e.g. 6.0-7.0"
							class="mt-1 w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
						/>
					</div>
				</div>

				<div>
					<label for="notes" class="text-sm font-medium">Special Notes</label>
					<textarea
						id="notes"
						bind:value={specialNotes}
						rows="3"
						placeholder="Growing tips, companion planting notes, etc."
						class="mt-1 w-full px-3 py-2 text-sm border border-input rounded-md bg-background resize-none"
					></textarea>
				</div>
			</div>
		{/if}

		<!-- Footer navigation -->
		<Dialog.Footer class="flex items-center justify-between gap-2 pt-4">
			<div>
				{#if step > 1}
					<Button variant="ghost" size="sm" onclick={prevStep}>
						<ChevronLeft class="w-4 h-4 mr-1" />
						Back
					</Button>
				{/if}
			</div>
			<div class="flex gap-2">
				{#if step > 1}
					<Button variant="outline" size="sm" onclick={handleSave}>
						{isEditing ? 'Save' : 'Skip to Save'}
					</Button>
				{/if}
				{#if step < 3}
					<Button size="sm" onclick={nextStep}>
						Next
						<ChevronRight class="w-4 h-4 ml-1" />
					</Button>
				{:else}
					<Button size="sm" onclick={handleSave}>
						{isEditing ? 'Save Changes' : 'Add Plant'}
					</Button>
				{/if}
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
