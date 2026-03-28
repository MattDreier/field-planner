<script lang="ts">
	import { X, MapPin, Satellite, PenTool, ChevronRight, ChevronLeft, Check, SkipForward, LocateFixed, Search } from 'lucide-svelte';
	import AddressSearch from './AddressSearch.svelte';
	import { satelliteState, enableSatellite, setAnchor, requestGeolocation } from '$lib/stores/satellite.svelte';
	import { propertyState, closePropertySetup, setProperty, startBoundaryTrace } from '$lib/stores/property.svelte';
	import type { Property } from '$lib/types';

	interface Props {
		fieldRotation: number;
	}

	let { fieldRotation }: Props = $props();

	// Step 1 has two sub-modes: choosing method, or entering address
	let locationMethod = $state<'choose' | 'address'>(
		propertyState.property ? 'address' : 'choose'
	);

	let addressResult = $state<{ address: string; formattedAddress: string; lat: number; lng: number } | null>(
		propertyState.property ? {
			address: propertyState.property.address,
			formattedAddress: propertyState.property.formattedAddress ?? propertyState.property.address,
			lat: propertyState.property.lat,
			lng: propertyState.property.lng
		} : null
	);

	const step = $derived(propertyState.setup.step);

	function handleAddressSelect(result: { address: string; formattedAddress: string; lat: number; lng: number }) {
		addressResult = result;
	}

	function useMyLocation() {
		if (!navigator.geolocation) {
			locationMethod = 'address';
			return;
		}

		requestGeolocation();

		// Watch for the geolocation result
		const check = setInterval(() => {
			if (!satelliteState.isLocating) {
				clearInterval(check);
				if (!satelliteState.locationError) {
					addressResult = {
						address: 'My Location',
						formattedAddress: 'Current Location',
						lat: satelliteState.anchorLat,
						lng: satelliteState.anchorLng
					};
					goToSatellite();
				} else {
					// Geolocation failed, fall back to address entry
					locationMethod = 'address';
				}
			}
		}, 100);
	}

	function chooseAddress() {
		locationMethod = 'address';
	}

	function goToSatellite() {
		if (!addressResult) return;
		setAnchor(addressResult.lat, addressResult.lng);
		enableSatellite();
		propertyState.setup.step = 2;
	}

	function confirmAlignment() {
		propertyState.setup.step = 3;
	}

	function startTracing() {
		if (!addressResult) return;
		const property: Property = {
			address: addressResult.address,
			formattedAddress: addressResult.formattedAddress,
			lat: addressResult.lat,
			lng: addressResult.lng,
			bearing: fieldRotation,
			anchorFieldX: 0,
			anchorFieldY: 0
		};
		setProperty(property);
		startBoundaryTrace();
		closePropertySetup();
	}

	function skipBoundary() {
		if (!addressResult) return;
		const property: Property = {
			address: addressResult.address,
			formattedAddress: addressResult.formattedAddress,
			lat: addressResult.lat,
			lng: addressResult.lng,
			bearing: fieldRotation,
			anchorFieldX: 0,
			anchorFieldY: 0
		};
		setProperty(property);
		closePropertySetup();
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) closePropertySetup();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') closePropertySetup();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Modal backdrop -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
	onpointerdown={handleBackdropClick}
>
	<div class="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-lg">
		<!-- Header -->
		<div class="flex items-center justify-between px-5 py-4 border-b border-zinc-700">
			<div class="flex items-center gap-2">
				<Satellite class="h-5 w-5 text-blue-400" />
				<h2 class="text-lg font-semibold text-white">Property Setup</h2>
			</div>
			<button onclick={closePropertySetup} class="p-1 rounded-md hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors">
				<X class="h-5 w-5" />
			</button>
		</div>

		<!-- Step indicator -->
		<div class="flex items-center gap-2 px-5 py-3 border-b border-zinc-800">
			{#each [
				{ num: 1, label: 'Location', icon: MapPin },
				{ num: 2, label: 'Align', icon: Satellite },
				{ num: 3, label: 'Boundary', icon: PenTool }
			] as s}
				<div class="flex items-center gap-1.5 {step >= s.num ? 'text-blue-400' : 'text-zinc-500'}">
					<div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium {step > s.num ? 'bg-blue-500 text-white' : step === s.num ? 'bg-blue-500/20 border border-blue-500 text-blue-400' : 'bg-zinc-800 border border-zinc-600 text-zinc-500'}">
						{#if step > s.num}
							<Check class="h-3.5 w-3.5" />
						{:else}
							{s.num}
						{/if}
					</div>
					<span class="text-xs font-medium hidden sm:inline">{s.label}</span>
				</div>
				{#if s.num < 3}
					<div class="flex-1 h-px {step > s.num ? 'bg-blue-500' : 'bg-zinc-700'}"></div>
				{/if}
			{/each}
		</div>

		<!-- Content -->
		<div class="px-5 py-5">
			{#if step === 1}
				{#if locationMethod === 'choose'}
					<!-- Step 1a: Choose location method -->
					<div class="space-y-3">
						<p class="text-sm text-zinc-300">How would you like to find your property?</p>
						<button
							onclick={useMyLocation}
							disabled={satelliteState.isLocating}
							class="w-full flex items-center gap-3 p-4 bg-zinc-800 border border-zinc-600 rounded-lg hover:border-blue-500 hover:bg-zinc-800/80 transition-colors text-left group"
						>
							<div class="w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center shrink-0">
								<LocateFixed class="h-5 w-5 text-blue-400" />
							</div>
							<div>
								<div class="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">
									{#if satelliteState.isLocating}
										Getting location...
									{:else}
										Use my location
									{/if}
								</div>
								<div class="text-xs text-zinc-400">Automatically detect your position via GPS</div>
							</div>
						</button>
						<button
							onclick={chooseAddress}
							class="w-full flex items-center gap-3 p-4 bg-zinc-800 border border-zinc-600 rounded-lg hover:border-blue-500 hover:bg-zinc-800/80 transition-colors text-left group"
						>
							<div class="w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center shrink-0">
								<Search class="h-5 w-5 text-blue-400" />
							</div>
							<div>
								<div class="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">Enter an address</div>
								<div class="text-xs text-zinc-400">Search for your property by street address</div>
							</div>
						</button>
					</div>
				{:else}
					<!-- Step 1b: Address search -->
					<div class="space-y-4">
						<div class="flex items-center gap-2">
							<button
								onclick={() => locationMethod = 'choose'}
								class="p-1 rounded-md hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
							>
								<ChevronLeft class="h-4 w-4" />
							</button>
							<p class="text-sm text-zinc-300">Search for your property address</p>
						</div>
						<AddressSearch
							onSelect={handleAddressSelect}
							initialValue={addressResult?.formattedAddress ?? ''}
						/>
						{#if addressResult}
							<div class="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
								<Check class="h-4 w-4 text-green-400" />
								<span class="text-sm text-green-300">{addressResult.formattedAddress}</span>
							</div>
						{/if}
					</div>
				{/if}
			{:else if step === 2}
				<!-- Step 2: Satellite alignment -->
				<div class="space-y-4">
					<p class="text-sm text-zinc-300">
						Satellite imagery is now loaded. Pan and rotate the canvas to align with your property.
					</p>
					<div class="p-3 bg-zinc-800 rounded-lg space-y-2 text-xs text-zinc-400">
						<p>- Drag to pan the view</p>
						<p>- Use the compass to rotate</p>
						<p>- Scroll to zoom in/out</p>
					</div>
				</div>
			{:else}
				<!-- Step 3: Boundary -->
				<div class="space-y-4">
					<p class="text-sm text-zinc-300">
						Optionally trace your property boundary on the satellite image.
					</p>
					<div class="p-3 bg-zinc-800 rounded-lg space-y-2 text-xs text-zinc-400">
						<p>- Click on the canvas to place boundary points</p>
						<p>- Double-click or press Enter to close the boundary</p>
						<p>- Press Escape to cancel</p>
					</div>
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="flex items-center justify-between px-5 py-4 border-t border-zinc-700">
			<div>
				{#if step > 1}
					<button
						onclick={() => propertyState.setup.step = step - 1}
						class="flex items-center gap-1 px-3 py-1.5 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700 rounded-md transition-colors"
					>
						<ChevronLeft class="h-4 w-4" />
						Back
					</button>
				{/if}
			</div>
			<div class="flex items-center gap-2">
				{#if step === 1 && locationMethod === 'address'}
					<button
						onclick={goToSatellite}
						disabled={!addressResult}
						class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors"
					>
						Continue
						<ChevronRight class="h-4 w-4" />
					</button>
				{:else if step === 2}
					<button
						onclick={confirmAlignment}
						class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
					>
						Looks Good
						<ChevronRight class="h-4 w-4" />
					</button>
				{:else if step === 3}
					<button
						onclick={skipBoundary}
						class="flex items-center gap-1.5 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-700 rounded-md transition-colors"
					>
						<SkipForward class="h-4 w-4" />
						Skip
					</button>
					<button
						onclick={startTracing}
						class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
					>
						<PenTool class="h-4 w-4" />
						Trace Boundary
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>
