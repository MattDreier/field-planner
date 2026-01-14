<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { SunSimulationState } from '$lib/types';
	import { getMonthName, formatTimeOfDay, getDaylightHours } from '$lib/utils/sun';
	import { Sun, MapPin, ChevronDown, ChevronUp } from 'lucide-svelte';

	interface Props {
		sunSimulation: SunSimulationState;
		onUpdate: (state: Partial<SunSimulationState>) => void;
	}

	let { sunSimulation, onUpdate }: Props = $props();

	// Local state for collapsible
	let isExpanded = $state(true);
	let isRequestingLocation = $state(false);
	let locationError = $state<string | null>(null);

	// Derived values for display
	const monthName = $derived(getMonthName(sunSimulation.month));
	const timeDisplay = $derived(formatTimeOfDay(sunSimulation.timeOfDay));
	const daylightHours = $derived(getDaylightHours(sunSimulation.latitude, sunSimulation.month));

	function toggleEnabled() {
		onUpdate({ enabled: !sunSimulation.enabled });
	}

	function toggleExpanded() {
		isExpanded = !isExpanded;
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
					maximumAge: 300000 // Cache for 5 minutes
				});
			});

			onUpdate({ latitude: position.coords.latitude });
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

	function handleLatitudeChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const value = parseFloat(target.value);
		if (!isNaN(value) && value >= -90 && value <= 90) {
			onUpdate({ latitude: value });
		}
	}

	function handleMonthChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const value = parseFloat(target.value);
		onUpdate({ month: value });
	}

	function handleTimeChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const value = parseFloat(target.value);
		onUpdate({ timeOfDay: value });
	}
</script>

<div class="p-4 border-b border-border">
	<button
		class="w-full flex items-center justify-between cursor-pointer"
		onclick={toggleExpanded}
	>
		<div class="flex items-center gap-2">
			<Sun class="w-5 h-5 text-amber-500" />
			<h3 class="font-semibold text-lg">Shadow Simulation</h3>
		</div>
		{#if isExpanded}
			<ChevronUp class="w-4 h-4 text-muted-foreground" />
		{:else}
			<ChevronDown class="w-4 h-4 text-muted-foreground" />
		{/if}
	</button>

	{#if isExpanded}
		<div class="mt-4 space-y-4">
			<!-- Enable/Disable Toggle -->
			<div class="flex items-center justify-between">
				<span class="text-sm">Show shadows</span>
				<Button
					variant={sunSimulation.enabled ? 'default' : 'outline'}
					size="sm"
					onclick={toggleEnabled}
				>
					{sunSimulation.enabled ? 'On' : 'Off'}
				</Button>
			</div>

			{#if sunSimulation.enabled}
				<!-- Location -->
				<div class="space-y-2">
					<label class="block text-xs text-muted-foreground">Location</label>
					<div class="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onclick={requestGeolocation}
							disabled={isRequestingLocation}
							class="flex items-center gap-1"
						>
							<MapPin class="w-3 h-3" />
							{isRequestingLocation ? 'Getting...' : 'Use My Location'}
						</Button>
					</div>
					{#if locationError}
						<p class="text-xs text-destructive">{locationError}</p>
					{/if}
					<div class="flex items-center gap-2">
						<label for="latitude" class="text-xs text-muted-foreground">Latitude:</label>
						<input
							id="latitude"
							type="number"
							min="-90"
							max="90"
							step="0.1"
							value={sunSimulation.latitude.toFixed(1)}
							onchange={handleLatitudeChange}
							class="w-20 px-2 py-1 text-sm border border-input rounded-md bg-background"
						/>
						<span class="text-xs text-muted-foreground">°N</span>
					</div>
				</div>

				<!-- Month Slider -->
				<div class="space-y-2">
					<div class="flex justify-between items-center">
						<label class="text-xs text-muted-foreground">Month</label>
						<span class="text-sm font-medium">{monthName}</span>
					</div>
					<input
						type="range"
						min="0"
						max="11.99"
						step="0.1"
						value={sunSimulation.month}
						oninput={handleMonthChange}
						class="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-500"
					/>
					<div class="flex justify-between text-xs text-muted-foreground">
						<span>Jan</span>
						<span>Jul</span>
						<span>Dec</span>
					</div>
				</div>

				<!-- Time of Day Slider -->
				<div class="space-y-2">
					<div class="flex justify-between items-center">
						<label class="text-xs text-muted-foreground">Time of Day</label>
						<span class="text-sm font-medium">{timeDisplay}</span>
					</div>
					<input
						type="range"
						min="0"
						max="1"
						step="0.01"
						value={sunSimulation.timeOfDay}
						oninput={handleTimeChange}
						class="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-amber-500"
					/>
					<div class="flex justify-between text-xs text-muted-foreground">
						<span>Sunrise</span>
						<span>Noon</span>
						<span>Sunset</span>
					</div>
				</div>

				<!-- Info -->
				<div class="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
					<p>~{daylightHours.toFixed(1)} hours of daylight</p>
					<p class="mt-1">Shadows show how taller plants may shade shorter ones.</p>
				</div>
			{/if}
		</div>
	{/if}
</div>
