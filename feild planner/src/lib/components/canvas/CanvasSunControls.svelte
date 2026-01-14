<script lang="ts">
	/**
	 * Floating canvas overlay for shadow simulation controls.
	 * Positioned in the bottom-left corner, separate from navigation controls.
	 */
	import { Button } from '$lib/components/ui/button';
	import type { SunSimulationState } from '$lib/types';
	import { getMonthName, formatTimeOfDay, getDaylightHours } from '$lib/utils/sun';
	import { Sun, MapPin, X } from 'lucide-svelte';

	interface Props {
		sunSimulation: SunSimulationState;
		onUpdate: (state: Partial<SunSimulationState>) => void;
	}

	let { sunSimulation, onUpdate }: Props = $props();

	// Panel open/closed state (separate from simulation enabled)
	let isPanelOpen = $state(false);
	let isRequestingLocation = $state(false);
	let locationError = $state<string | null>(null);

	// Derived values for display
	const monthName = $derived(getMonthName(sunSimulation.month));
	const timeDisplay = $derived(formatTimeOfDay(sunSimulation.timeOfDay));
	const daylightHours = $derived(getDaylightHours(sunSimulation.latitude, sunSimulation.month));

	function handleSunButtonClick() {
		if (!sunSimulation.enabled) {
			// If shadows are off, clicking the button enables them + opens panel
			onUpdate({ enabled: true });
			isPanelOpen = true;
		} else {
			// If shadows are on, just toggle the panel visibility
			isPanelOpen = !isPanelOpen;
		}
	}

	function closePanel() {
		isPanelOpen = false;
	}

	function disableShadows() {
		onUpdate({ enabled: false });
		isPanelOpen = false;
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

<!-- Positioned in bottom-left, separate from navigation controls on the right -->
<div class="absolute bottom-6 left-6 flex flex-col items-start gap-3 pointer-events-none">
	{#if !isPanelOpen}
		<!-- Collapsed: Sun toggle button -->
		<button
			onclick={handleSunButtonClick}
			class="pointer-events-auto w-10 h-10 rounded-full shadow-lg flex items-center justify-center transition-colors"
			class:bg-amber-500={sunSimulation.enabled}
			class:hover:bg-amber-400={sunSimulation.enabled}
			class:bg-zinc-800={!sunSimulation.enabled}
			class:hover:bg-zinc-700={!sunSimulation.enabled}
			aria-label={sunSimulation.enabled ? "Shadow settings" : "Enable shadows"}
			title={sunSimulation.enabled ? "Shadow settings" : "Enable shadows"}
		>
			<Sun class="w-5 h-5 {sunSimulation.enabled ? 'text-zinc-900' : 'text-amber-500'}" />
		</button>
	{:else}
		<!-- Expanded: Full control panel -->
		<div class="pointer-events-auto w-56 rounded-lg bg-zinc-800 shadow-lg overflow-hidden">
			<!-- Header -->
			<div class="flex items-center justify-between px-3 py-2 border-b border-zinc-700">
				<div class="flex items-center gap-2">
					<Sun class="w-4 h-4 text-amber-500" />
					<span class="text-sm font-medium text-white">Shadows</span>
				</div>
				<button
					onclick={closePanel}
					class="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-700 transition-colors text-zinc-400 hover:text-white"
					aria-label="Close panel"
				>
					<X class="w-4 h-4" />
				</button>
			</div>

			<div class="p-3 space-y-3">
				<!-- Month Slider -->
				<div class="space-y-1">
					<div class="flex justify-between items-center">
						<label class="text-xs text-zinc-400">Month</label>
						<span class="text-xs font-medium text-white">{monthName}</span>
					</div>
					<input
						type="range"
						min="0"
						max="11.99"
						step="0.1"
						value={sunSimulation.month}
						oninput={handleMonthChange}
						class="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
					/>
					<div class="flex justify-between text-[10px] text-zinc-500">
						<span>Jan</span>
						<span>Jul</span>
						<span>Dec</span>
					</div>
				</div>

				<!-- Time of Day Slider -->
				<div class="space-y-1">
					<div class="flex justify-between items-center">
						<label class="text-xs text-zinc-400">Time</label>
						<span class="text-xs font-medium text-white">{timeDisplay}</span>
					</div>
					<input
						type="range"
						min="0"
						max="1"
						step="0.01"
						value={sunSimulation.timeOfDay}
						oninput={handleTimeChange}
						class="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
					/>
					<div class="flex justify-between text-[10px] text-zinc-500">
						<span>Sunrise</span>
						<span>Noon</span>
						<span>Sunset</span>
					</div>
				</div>

				<!-- Location -->
				<div class="space-y-1.5 pt-1 border-t border-zinc-700">
					<div class="flex items-center gap-2">
						<button
							onclick={requestGeolocation}
							disabled={isRequestingLocation}
							class="flex items-center gap-1 px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-zinc-300 rounded transition-colors"
						>
							<MapPin class="w-3 h-3" />
							{isRequestingLocation ? '...' : 'My Location'}
						</button>
						<div class="flex items-center gap-1 text-xs text-zinc-400">
							<input
								type="number"
								min="-90"
								max="90"
								step="0.1"
								value={sunSimulation.latitude.toFixed(1)}
								onchange={handleLatitudeChange}
								class="w-14 px-1.5 py-0.5 text-xs border border-zinc-600 rounded bg-zinc-700 text-white"
							/>
							<span>°N</span>
						</div>
					</div>
					{#if locationError}
						<p class="text-[10px] text-red-400">{locationError}</p>
					{/if}
				</div>

				<!-- Footer: Info + Turn Off -->
				<div class="flex items-center justify-between pt-1 border-t border-zinc-700">
					<span class="text-[10px] text-zinc-500">~{daylightHours.toFixed(1)}h daylight</span>
					<button
						onclick={disableShadows}
						class="px-2 py-1 text-[10px] font-medium text-zinc-400 hover:text-white hover:bg-zinc-700 rounded transition-colors"
					>
						Turn Off
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
