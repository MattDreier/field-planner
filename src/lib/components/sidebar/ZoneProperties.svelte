<script lang="ts">
	import type { Zone, ZoneType } from '$lib/types';
	import { ZONE_LABELS, calculatePolygonArea, sqInchesToSqFeet, calculateCubicYards, calculateFabricRollLength } from '$lib/utils/zone';
	import { Slider } from '$lib/components/ui/slider';

	interface Props {
		zone: Zone;
		snapEnabled?: boolean;
		onUpdateZone: (id: string, updates: Partial<Pick<Zone, 'name' | 'zoneType' | 'depthInches' | 'fabricWidthInches' | 'fabricOverlapInches' | 'fabricRotationDeg'>>) => void;
	}

	let { zone, snapEnabled = false, onUpdateZone }: Props = $props();

	let nameInput = $state('');
	let depthInput = $state('');
	let fabricWidthInput = $state('');
	let fabricOverlapInput = $state('');
	let fabricRotationInput = $state('');

	// Sync inputs when selected zone changes
	$effect(() => {
		nameInput = zone.name ?? '';
		depthInput = zone.depthInches ? String(zone.depthInches) : '';
		fabricWidthInput = zone.fabricWidthInches ? String(zone.fabricWidthInches) : '';
		fabricOverlapInput = String(zone.fabricOverlapInches ?? 6);
		fabricRotationInput = String(zone.fabricRotationDeg ?? 0);
	});

	function snapAngle(degrees: number): number {
		const snapIncrement = 15;
		return Math.round(degrees / snapIncrement) * snapIncrement;
	}

	const isFabric = $derived(zone.zoneType === 'landscape_fabric');
	const areaSqInches = $derived(calculatePolygonArea(zone.vertices));
	const areaSqFt = $derived(sqInchesToSqFeet(areaSqInches));
	const cubicYards = $derived(
		zone.depthInches && !isFabric ? calculateCubicYards(areaSqInches, zone.depthInches) : null
	);
	const fabricOverlap = $derived(zone.fabricOverlapInches ?? 6);
	const fabricLinearFeet = $derived.by(() => {
		if (!isFabric || !zone.fabricWidthInches || zone.fabricWidthInches <= 0) return null;
		if (zone.fabricWidthInches - fabricOverlap <= 0) return null;
		const totalInches = calculateFabricRollLength(
			zone.vertices,
			zone.fabricWidthInches,
			fabricOverlap,
			zone.fabricRotationDeg ?? 0
		);
		return totalInches / 12;
	});

	const zoneTypes = Object.entries(ZONE_LABELS) as [ZoneType, string][];

	function handleNameChange(e: Event) {
		const target = e.target as HTMLInputElement;
		onUpdateZone(zone._id, { name: target.value || undefined });
	}

	function handleTypeChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		onUpdateZone(zone._id, { zoneType: target.value as ZoneType });
	}

	function handleDepthChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const val = parseFloat(target.value);
		onUpdateZone(zone._id, { depthInches: val > 0 ? val : undefined });
	}

	function handleFabricWidthChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const val = parseFloat(target.value);
		onUpdateZone(zone._id, { fabricWidthInches: val > 0 ? val : undefined });
	}

	function handleFabricOverlapChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const val = parseFloat(target.value);
		onUpdateZone(zone._id, { fabricOverlapInches: val >= 0 ? val : undefined });
	}

	let fabricRotationValue = $state([0]);

	// Keep slider value in sync with zone data
	$effect(() => {
		fabricRotationValue = [zone.fabricRotationDeg ?? 0];
	});

	function handleFabricRotationChange(value: number) {
		const applied = snapEnabled ? snapAngle(value) : Math.round(value);
		const normalized = ((applied % 360) + 360) % 360;
		fabricRotationInput = String(normalized);
		fabricRotationValue = [normalized];
		onUpdateZone(zone._id as string, { fabricRotationDeg: normalized });
	}
</script>

<div class="mt-4 pt-4 px-4 pb-4 border-t border-border">
	<h4 class="font-medium text-sm mb-3">Zone Properties</h4>

	<div class="space-y-3">
		<div>
			<label for="zone-name" class="block text-xs text-muted-foreground mb-1">
				Name
			</label>
			<input
				id="zone-name"
				type="text"
				placeholder="Untitled zone"
				bind:value={nameInput}
				onchange={handleNameChange}
				class="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
			/>
		</div>

		<div>
			<label for="zone-type" class="block text-xs text-muted-foreground mb-1">
				Type
			</label>
			<select
				id="zone-type"
				value={zone.zoneType}
				onchange={handleTypeChange}
				class="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
			>
				{#each zoneTypes as [value, label]}
					<option {value}>{label}</option>
				{/each}
			</select>
		</div>

		{#if isFabric}
			<div>
				<label for="zone-fabric-width" class="block text-xs text-muted-foreground mb-1">
					Roll width (inches)
				</label>
				<input
					id="zone-fabric-width"
					type="number"
					min="0"
					step="1"
					placeholder="e.g. 36"
					bind:value={fabricWidthInput}
					onchange={handleFabricWidthChange}
					class="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
				/>
			</div>

			<div>
				<label for="zone-fabric-overlap" class="block text-xs text-muted-foreground mb-1">
					Seam overlap (inches)
				</label>
				<input
					id="zone-fabric-overlap"
					type="number"
					min="0"
					max="24"
					step="1"
					bind:value={fabricOverlapInput}
					onchange={handleFabricOverlapChange}
					class="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
				/>
				<p class="text-xs text-muted-foreground mt-1">Recommended: 6–12"</p>
			</div>

			<div>
				<div class="flex items-center justify-between text-xs text-muted-foreground mb-2">
					<span>Seam rotation</span>
					<span class="font-medium text-foreground">{fabricRotationInput}°</span>
				</div>
				<Slider
					min={0}
					max={359}
					step={snapEnabled ? 15 : 1}
					bind:value={fabricRotationValue}
					onValueChange={(v: number[]) => handleFabricRotationChange(v[0])}
				/>
				<p class="text-xs text-muted-foreground mt-2">
					{snapEnabled ? 'Snapping to 15° increments' : 'Free rotation'}
				</p>
			</div>
		{:else}
			<div>
				<label for="zone-depth" class="block text-xs text-muted-foreground mb-1">
					Depth (inches)
				</label>
				<input
					id="zone-depth"
					type="number"
					min="0"
					step="0.5"
					placeholder="e.g. 3"
					bind:value={depthInput}
					onchange={handleDepthChange}
					class="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
				/>
			</div>
		{/if}

		<div>
			<label class="block text-xs text-muted-foreground mb-1">
				Area
			</label>
			<p class="text-sm font-medium">
				{areaSqFt.toFixed(1)} sq ft
			</p>
		</div>

		{#if cubicYards !== null}
			<div>
				<label class="block text-xs text-muted-foreground mb-1">
					Volume
				</label>
				<p class="text-sm font-medium">
					{cubicYards.toFixed(2)} cubic yards
				</p>
			</div>
		{/if}

		{#if fabricLinearFeet !== null}
			<div>
				<label class="block text-xs text-muted-foreground mb-1">
					Roll length needed
				</label>
				<p class="text-sm font-medium">
					{fabricLinearFeet.toFixed(1)} linear feet
				</p>
			</div>
		{/if}

		<div>
			<label class="block text-xs text-muted-foreground mb-1">
				Vertices
			</label>
			<p class="text-sm text-muted-foreground">
				{zone.vertices.length} points
			</p>
		</div>
	</div>
</div>

