<script lang="ts">
	import { ToggleGroup } from 'bits-ui';
	import { Button } from '$lib/components/ui/button';
	import type { Tool, Bed, SunSimulationState } from '$lib/types';
	import { MousePointer2, Square, Circle, Fence, Sun, Trash2, MapPin, Magnet } from 'lucide-svelte';
	import { getMonthName, formatTimeOfDay, getDaylightHours } from '$lib/utils/sun';
	import { setLatitude } from '$lib/stores/timeline.svelte';

	interface BedDefaults {
		widthFeet: number;
		heightFeet: number;
		rotation: number;
		raisedBedHeightFeet?: number;
	}

	interface FenceDefaults {
		heightFeet: number;
	}

	interface Props {
		currentTool: Tool;
		hasSelection: boolean;
		selectedBed: Bed | null;
		sunSimulation: SunSimulationState;
		bedDefaults: BedDefaults;
		fenceDefaults?: FenceDefaults;
		snapEnabled?: boolean;
		snapTemporarilyDisabled?: boolean; // True when Alt/Option is held during drag
		onToolChange: (tool: Tool) => void;
		onDelete: () => void;
		onResizeBed: (id: string, widthFeet: number, heightFeet?: number) => void;
		onRotateBed?: (id: string, rotation: number) => void;
		onUpdateBedRaisedHeight?: (id: string, raisedBedHeightFeet: number) => void;
		onUpdateSunSimulation: (state: Partial<SunSimulationState>) => void;
		onUpdateBedDefaults: (defaults: Partial<BedDefaults>) => void;
		onUpdateFenceDefaults?: (defaults: Partial<FenceDefaults>) => void;
		onToggleSnap?: () => void;
		onTimeSliderRelease?: () => void;
	}

	let {
		currentTool,
		hasSelection,
		selectedBed,
		sunSimulation,
		bedDefaults,
		fenceDefaults = { heightFeet: 6 },
		snapEnabled = true,
		snapTemporarilyDisabled = false,
		onToolChange,
		onDelete,
		onResizeBed,
		onRotateBed,
		onUpdateBedRaisedHeight,
		onUpdateSunSimulation,
		onUpdateBedDefaults,
		onUpdateFenceDefaults,
		onToggleSnap,
		onTimeSliderRelease
	}: Props = $props();

	// Expanded mode when any tool other than select is active
	const expanded = $derived(currentTool !== 'select');

	// Show bed settings form when shape tool active OR when a bed is selected
	const showBedSettings = $derived(
		(currentTool === 'rectangle' || currentTool === 'circle') || selectedBed !== null
	);

	// Bed property inputs (for selected bed)
	let widthInput = $state('');
	let heightInput = $state('');
	let rotationInput = $state('');
	let raisedHeightInput = $state('');

	// Default bed inputs (for new beds)
	let defaultWidthInput = $state('');
	let defaultHeightInput = $state('');
	let defaultRotationInput = $state('');
	let defaultRaisedHeightInput = $state('');

	// Sun simulation state
	let isRequestingLocation = $state(false);
	let locationError = $state<string | null>(null);

	// Derived values for shadow controls
	const monthName = $derived(getMonthName(sunSimulation.month));
	const timeDisplay = $derived(formatTimeOfDay(sunSimulation.timeOfDay));
	const daylightHours = $derived(getDaylightHours(sunSimulation.latitude, sunSimulation.month));

	// Sync bed inputs when selected bed changes
	$effect(() => {
		if (selectedBed) {
			widthInput = selectedBed.widthFeet.toFixed(2);
			heightInput = selectedBed.shape === 'rectangle' ? selectedBed.heightFeet.toFixed(2) : '';
			rotationInput = (selectedBed.rotation ?? 0).toFixed(0);
			raisedHeightInput = (selectedBed.raisedBedHeightFeet ?? 0).toFixed(1);
		}
	});

	// Sync default inputs with bedDefaults prop
	$effect(() => {
		defaultWidthInput = bedDefaults.widthFeet.toFixed(2);
		defaultHeightInput = bedDefaults.heightFeet.toFixed(2);
		defaultRotationInput = bedDefaults.rotation.toFixed(0);
		defaultRaisedHeightInput = (bedDefaults.raisedBedHeightFeet ?? 0).toFixed(1);
	});

	// Handlers for default bed settings
	function handleDefaultWidthChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const value = parseFloat(target.value);
		if (!isNaN(value) && value >= 0.5) {
			onUpdateBedDefaults({ widthFeet: value });
		}
	}

	function handleDefaultHeightChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const value = parseFloat(target.value);
		if (!isNaN(value) && value >= 0.5) {
			onUpdateBedDefaults({ heightFeet: value });
		}
	}

	function handleDefaultRotationChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const value = parseFloat(target.value);
		if (!isNaN(value)) {
			const normalizedValue = ((value % 360) + 360) % 360;
			onUpdateBedDefaults({ rotation: normalizedValue });
		}
	}

	function handleDefaultRaisedHeightChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const value = parseFloat(target.value);
		if (!isNaN(value) && value >= 0 && value <= 4) {
			onUpdateBedDefaults({ raisedBedHeightFeet: value });
		}
	}

	// Fence height input
	let fenceHeightInput = $state('');

	// Sync fence height input with defaults
	$effect(() => {
		fenceHeightInput = fenceDefaults.heightFeet.toFixed(0);
	});

	function handleFenceHeightChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const value = parseFloat(target.value);
		if (!isNaN(value) && value >= 1 && value <= 12 && onUpdateFenceDefaults) {
			onUpdateFenceDefaults({ heightFeet: value });
		}
	}

	function handleToolChange(value: string | undefined) {
		if (!value) {
			// User clicked to deselect current tool - switch back to select
			onToolChange('select');
			return;
		}
		const tool = value as Tool;
		// Auto-enable shadows when switching to shadows tool
		if (tool === 'shadows' && !sunSimulation.enabled) {
			onUpdateSunSimulation({ enabled: true });
		}
		onToolChange(tool);
	}

	function handleWidthChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const value = parseFloat(target.value);
		if (!isNaN(value) && value >= 0.5 && selectedBed) {
			const height = selectedBed.shape === 'rectangle' ? selectedBed.heightFeet : undefined;
			onResizeBed(selectedBed._id, value, height);
		}
	}

	function handleHeightChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const value = parseFloat(target.value);
		if (!isNaN(value) && value >= 0.5 && selectedBed && selectedBed.shape === 'rectangle') {
			onResizeBed(selectedBed._id, selectedBed.widthFeet, value);
		}
	}

	function handleRotationChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const value = parseFloat(target.value);
		if (!isNaN(value) && selectedBed && onRotateBed) {
			const normalizedValue = ((value % 360) + 360) % 360;
			onRotateBed(selectedBed._id, normalizedValue);
		}
	}

	function handleRaisedHeightChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const value = parseFloat(target.value);
		if (!isNaN(value) && value >= 0 && value <= 4 && selectedBed && onUpdateBedRaisedHeight) {
			onUpdateBedRaisedHeight(selectedBed._id, value);
		}
	}

	function handleTimeChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const value = parseFloat(target.value);
		onUpdateSunSimulation({ timeOfDay: value });
	}

	function handleLatitudeChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const value = parseFloat(target.value);
		if (!isNaN(value) && value >= -90 && value <= 90) {
			// Update latitude in timeline store (the source of truth for shadow calculations)
			setLatitude(value);
		}
	}

	async function requestGeolocation() {
		if (!navigator.geolocation) {
			locationError = 'Geolocation not supported';
			return;
		}

		isRequestingLocation = true;
		locationError = null;

		try {
			const position = await new Promise<GeolocationPosition>((resolve, reject) => {
				navigator.geolocation.getCurrentPosition(resolve, reject, {
					enableHighAccuracy: false,
					timeout: 10000,
					maximumAge: 300000
				});
			});

			// Update latitude in timeline store (the source of truth for shadow calculations)
			setLatitude(position.coords.latitude);
		} catch (error) {
			if (error instanceof GeolocationPositionError) {
				switch (error.code) {
					case error.PERMISSION_DENIED:
						locationError = 'Location access denied';
						break;
					case error.POSITION_UNAVAILABLE:
						locationError = 'Location unavailable';
						break;
					case error.TIMEOUT:
						locationError = 'Location request timed out';
						break;
				}
			} else {
				locationError = 'Failed to get location';
			}
		} finally {
			isRequestingLocation = false;
		}
	}
</script>

<div class="p-4 {expanded ? 'flex-1 overflow-auto' : 'border-b border-border'}">
	<h3 class="font-semibold text-lg mb-3">Tools</h3>

	<!-- Icon-only toolbar (Figma style) -->
	<div class="flex items-center gap-2">
		<ToggleGroup.Root
			type="single"
			value={currentTool}
			onValueChange={handleToolChange}
			class="inline-flex rounded-lg bg-muted p-1 gap-1"
		>
			<ToggleGroup.Item
				value="select"
				title="Select (V)"
				class="w-8 h-8 rounded-md flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground data-[state=on]:bg-foreground data-[state=on]:text-background"
			>
				<MousePointer2 class="w-4 h-4" />
			</ToggleGroup.Item>

			<span class="inline-flex gap-1" data-tour="bed-tools">
				<ToggleGroup.Item
					value="rectangle"
					title="Rectangle Bed (R)"
					class="w-8 h-8 rounded-md flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground data-[state=on]:bg-foreground data-[state=on]:text-background"
					data-tour="rectangle-tool"
				>
					<Square class="w-4 h-4" />
				</ToggleGroup.Item>

				<ToggleGroup.Item
					value="circle"
					title="Circle Bed (C)"
					class="w-8 h-8 rounded-md flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground data-[state=on]:bg-foreground data-[state=on]:text-background"
					data-tour="circle-tool"
				>
					<Circle class="w-4 h-4" />
				</ToggleGroup.Item>

				<ToggleGroup.Item
					value="fence"
					title="Fence Tool (F)"
					class="w-8 h-8 rounded-md flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground data-[state=on]:bg-foreground data-[state=on]:text-background"
					data-tour="fence-tool"
				>
					<Fence class="w-4 h-4" />
				</ToggleGroup.Item>
			</span>

			<ToggleGroup.Item
				value="shadows"
				title="Shadow Simulation"
				class="w-8 h-8 rounded-md flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground data-[state=on]:bg-foreground data-[state=on]:text-background {sunSimulation.enabled && currentTool !== 'shadows' ? '!text-amber-500' : ''}"
				data-tour="shadows-tool"
			>
				<Sun class="w-4 h-4" />
			</ToggleGroup.Item>
		</ToggleGroup.Root>

		<!-- Snap toggle (separate from tool selection) -->
		{#if onToggleSnap}
			<button
				onclick={onToggleSnap}
				title={snapEnabled ? 'Snap ON (S to toggle, hold Alt to disable temporarily)' : 'Snap OFF (S to toggle, hold Alt to enable temporarily)'}
				class="w-8 h-8 rounded-md flex items-center justify-center transition-colors {snapEnabled && !snapTemporarilyDisabled ? 'bg-foreground text-background hover:bg-foreground/90' : snapTemporarilyDisabled ? 'bg-zinc-400 text-zinc-100' : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'}"
			>
				<Magnet class="w-4 h-4" />
			</button>
		{/if}
	</div>

	<!-- Delete button (when selection exists) -->
	{#if hasSelection}
		<div class="mt-4 pt-4 border-t border-border">
			<Button
				variant="destructive"
				size="sm"
				onclick={onDelete}
				class="w-full flex items-center justify-center gap-2"
			>
				<Trash2 class="w-4 h-4" />
				Delete Selected
			</Button>
		</div>
	{/if}

	<!-- New Bed Settings (when shape tool active, no bed selected) -->
	{#if expanded && !selectedBed && (currentTool === 'rectangle' || currentTool === 'circle')}
		<div class="mt-4 pt-4 border-t border-border flex-1">
			<h4 class="font-medium text-sm mb-3">
				{currentTool === 'rectangle' ? 'Rectangular' : 'Circular'} Bed
			</h4>

			<div class="space-y-3">
				<div>
					<label for="default-width" class="block text-xs text-muted-foreground mb-1">
						{currentTool === 'circle' ? 'Diameter (ft)' : 'Width (ft)'}
					</label>
					<input
						id="default-width"
						type="number"
						min="0.5"
						step="0.5"
						bind:value={defaultWidthInput}
						onchange={handleDefaultWidthChange}
						class="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
					/>
				</div>

				{#if currentTool === 'rectangle'}
					<div>
						<label for="default-height" class="block text-xs text-muted-foreground mb-1">
							Height (ft)
						</label>
						<input
							id="default-height"
							type="number"
							min="0.5"
							step="0.5"
							bind:value={defaultHeightInput}
							onchange={handleDefaultHeightChange}
							class="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
						/>
					</div>
				{/if}

				<div>
					<label for="default-rotation" class="block text-xs text-muted-foreground mb-1">
						Rotation (degrees)
					</label>
					<input
						id="default-rotation"
						type="number"
						min="0"
						max="360"
						step="1"
						bind:value={defaultRotationInput}
						onchange={handleDefaultRotationChange}
						class="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
					/>
				</div>

				<div>
					<label for="default-raised-height" class="block text-xs text-muted-foreground mb-1">
						Raised Height (ft)
					</label>
					<input
						id="default-raised-height"
						type="number"
						min="0"
						max="4"
						step="0.5"
						placeholder="0 (ground level)"
						bind:value={defaultRaisedHeightInput}
						onchange={handleDefaultRaisedHeightChange}
						class="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
					/>
					<p class="text-[10px] text-muted-foreground mt-1">
						Height of bed walls (casts shadows)
					</p>
				</div>
			</div>

			<div class="mt-4 pt-4 border-t border-border space-y-3">
				<div class="space-y-2">
					<p class="font-medium text-foreground text-xs">How to place:</p>
					<ul class="list-disc list-inside space-y-1 text-xs text-muted-foreground">
						<li><strong>Click</strong> to place with these dimensions</li>
						<li><strong>Drag</strong> to draw a custom size</li>
					</ul>
				</div>
				<div class="space-y-2">
					<p class="font-medium text-foreground text-xs">Tips:</p>
					<ul class="list-disc list-inside space-y-1 text-xs text-muted-foreground">
						<li>Hold <kbd class="px-1 py-0.5 bg-muted rounded text-[10px]">Shift</kbd> while dragging to constrain proportions</li>
						<li>Select a bed to edit its dimensions</li>
					</ul>
				</div>
			</div>
		</div>
	{/if}

	<!-- Bed Properties (when bed selected) -->
	{#if selectedBed}
		<div class="mt-4 pt-4 border-t border-border">
			<h4 class="font-medium text-sm mb-3">
				{selectedBed.shape === 'circle' ? 'Circular Bed' : 'Rectangular Bed'}
			</h4>

			<div class="space-y-3">
				<div>
					<label for="bed-width" class="block text-xs text-muted-foreground mb-1">
						{selectedBed.shape === 'circle' ? 'Diameter (ft)' : 'Width (ft)'}
					</label>
					<input
						id="bed-width"
						type="number"
						min="0.5"
						step="0.5"
						bind:value={widthInput}
						onchange={handleWidthChange}
						class="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
					/>
				</div>

				{#if selectedBed.shape === 'rectangle'}
					<div>
						<label for="bed-height" class="block text-xs text-muted-foreground mb-1">
							Height (ft)
						</label>
						<input
							id="bed-height"
							type="number"
							min="0.5"
							step="0.5"
							bind:value={heightInput}
							onchange={handleHeightChange}
							class="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
						/>
					</div>
				{/if}

				<div>
					<label for="bed-rotation" class="block text-xs text-muted-foreground mb-1">
						Rotation (degrees)
					</label>
					<input
						id="bed-rotation"
						type="number"
						min="0"
						max="360"
						step="1"
						bind:value={rotationInput}
						onchange={handleRotationChange}
						class="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
					/>
				</div>

				<div>
					<label for="bed-raised-height" class="block text-xs text-muted-foreground mb-1">
						Raised Height (ft)
					</label>
					<input
						id="bed-raised-height"
						type="number"
						min="0"
						max="4"
						step="0.5"
						placeholder="0 (ground level)"
						bind:value={raisedHeightInput}
						onchange={handleRaisedHeightChange}
						class="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
					/>
					<p class="text-[10px] text-muted-foreground mt-1">
						Height of bed walls (casts shadows)
					</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Fence Settings (when fence tool active) -->
	{#if currentTool === 'fence'}
		<div class="mt-4 pt-4 border-t border-border flex-1">
			<h4 class="font-medium text-sm mb-3">Fence Tool</h4>

			<div class="space-y-3">
				<div>
					<label for="fence-height" class="block text-xs text-muted-foreground mb-1">
						Height (ft)
					</label>
					<input
						id="fence-height"
						type="number"
						min="1"
						max="12"
						step="1"
						bind:value={fenceHeightInput}
						onchange={handleFenceHeightChange}
						class="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
					/>
				</div>
			</div>

			<div class="mt-4 pt-4 border-t border-border space-y-3">
				<div class="space-y-2">
					<p class="font-medium text-foreground text-xs">How to draw:</p>
					<ul class="list-disc list-inside space-y-1 text-xs text-muted-foreground">
						<li><strong>Click</strong> to add fence vertices</li>
						<li><strong>Double-click</strong> or press <kbd class="px-1 py-0.5 bg-muted rounded text-[10px]">Enter</kbd> to finish</li>
						<li>Press <kbd class="px-1 py-0.5 bg-muted rounded text-[10px]">Escape</kbd> to cancel</li>
					</ul>
				</div>
				<div class="space-y-2">
					<p class="font-medium text-foreground text-xs">Tips:</p>
					<ul class="list-disc list-inside space-y-1 text-xs text-muted-foreground">
						<li>Fences cast shadows in shadow mode</li>
						<li>Select a fence to drag vertices</li>
					</ul>
				</div>
			</div>
		</div>
	{/if}

	<!-- Shadow Controls (when shadows tool active) -->
	{#if currentTool === 'shadows'}
		<div class="mt-4 pt-4 border-t border-border space-y-3">
			<div class="flex items-center justify-between">
				<h4 class="font-medium text-sm">Shadow Simulation</h4>
				{#if sunSimulation.enabled}
					<button
						onclick={() => onUpdateSunSimulation({ enabled: false })}
						class="text-xs text-muted-foreground hover:text-foreground transition-colors"
					>
						Disable
					</button>
				{:else}
					<button
						onclick={() => onUpdateSunSimulation({ enabled: true })}
						class="text-xs text-primary hover:text-primary/80 transition-colors"
					>
						Enable
					</button>
				{/if}
			</div>

			{#if sunSimulation.enabled}
				<!-- Month (read-only, synced with timeline) -->
				<div class="space-y-1">
					<div class="flex justify-between items-center">
						<label class="text-xs text-muted-foreground">Month</label>
						<span class="text-xs font-medium">{monthName}</span>
					</div>
					<p class="text-[10px] text-muted-foreground/70">Synced with timeline</p>
				</div>

				<!-- Time of Day Slider -->
				<div class="space-y-1">
					<div class="flex justify-between items-center">
						<label class="text-xs text-muted-foreground">Time of Day</label>
						<span class="text-xs font-medium">{timeDisplay}</span>
					</div>
					<input
						type="range"
						min="0"
						max="1"
						step="0.01"
						value={sunSimulation.timeOfDay}
						oninput={handleTimeChange}
						onchange={() => onTimeSliderRelease?.()}
						class="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-500"
						data-tour="time-slider"
					/>
					<div class="flex justify-between text-[10px] text-muted-foreground/70">
						<span>Sunrise</span>
						<span>Noon</span>
						<span>Sunset</span>
					</div>
				</div>

				<!-- Location -->
				<div class="space-y-2 pt-2 border-t border-border">
					<label class="text-xs text-muted-foreground">Location</label>
					<div class="flex items-center gap-2">
						<button
							onclick={requestGeolocation}
							disabled={isRequestingLocation}
							class="flex items-center gap-1 px-2 py-1.5 text-xs bg-muted hover:bg-muted/80 disabled:opacity-50 rounded transition-colors"
							data-tour="my-location"
						>
							<MapPin class="w-3 h-3" />
							{isRequestingLocation ? '...' : 'My Location'}
						</button>
						<div class="flex items-center gap-1">
							<input
								type="number"
								min="-90"
								max="90"
								step="0.1"
								value={sunSimulation.latitude.toFixed(1)}
								onchange={handleLatitudeChange}
								class="w-16 px-2 py-1.5 text-xs border border-input rounded-md bg-background"
							/>
							<span class="text-xs text-muted-foreground">°N</span>
						</div>
					</div>
					{#if locationError}
						<p class="text-[10px] text-destructive">{locationError}</p>
					{/if}
				</div>

				<!-- Daylight info -->
				<p class="text-xs text-muted-foreground pt-2 border-t border-border">
					~{daylightHours.toFixed(1)} hours of daylight
				</p>
			{/if}
		</div>
	{/if}

	<!-- Help text (only in compact mode, expanded mode has detailed guides) -->
	{#if !expanded}
		<div class="mt-4 text-xs text-muted-foreground">
			{#if currentTool === 'select'}
				<p>Click to select beds or plants. Drag to move.</p>
			{:else if currentTool === 'rectangle'}
				<p>Click and drag on canvas to create a rectangular bed.</p>
			{:else if currentTool === 'circle'}
				<p>Click and drag on canvas to create a circular bed.</p>
			{:else if currentTool === 'fence'}
				<p>Click to add vertices. Double-click to finish the fence.</p>
			{:else if currentTool === 'shadows'}
				<p>Visualize how shadows fall across your garden throughout the day.</p>
			{/if}
		</div>
	{/if}
</div>
