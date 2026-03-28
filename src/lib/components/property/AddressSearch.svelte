<script lang="ts">
	import { onMount } from 'svelte';
	import { MapPin, Loader2 } from 'lucide-svelte';

	interface Props {
		onSelect: (result: { address: string; formattedAddress: string; lat: number; lng: number }) => void;
		initialValue?: string;
	}

	let { onSelect, initialValue = '' }: Props = $props();

	let query = $state(initialValue);
	let suggestions = $state<Array<any>>([]);
	let isLoading = $state(false);
	let showDropdown = $state(false);
	let searchBox: any = null;
	let sessionToken: any = null;
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let initError = $state<string | null>(null);

	onMount(async () => {
		try {
			const mod = await import('@mapbox/search-js-core');
			const accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
			if (!accessToken) {
				initError = 'Mapbox token not configured';
				return;
			}
			searchBox = new mod.SearchBoxCore({ accessToken });
			sessionToken = new mod.SessionToken();
		} catch (e) {
			console.error('Failed to load Mapbox Search SDK:', e);
			initError = 'Failed to load search';
		}
	});

	function handleInput() {
		if (debounceTimer) clearTimeout(debounceTimer);
		if (!query.trim() || !searchBox) {
			suggestions = [];
			showDropdown = false;
			return;
		}
		debounceTimer = setTimeout(async () => {
			isLoading = true;
			try {
				const response = await searchBox.suggest(query, { sessionToken });
				suggestions = response.suggestions ?? [];
				showDropdown = suggestions.length > 0;
			} catch (e) {
				console.error('Suggest error:', e);
				suggestions = [];
			} finally {
				isLoading = false;
			}
		}, 300);
	}

	async function selectSuggestion(suggestion: any) {
		showDropdown = false;
		query = suggestion.full_address || suggestion.place_formatted || suggestion.name;
		isLoading = true;
		try {
			const result = await searchBox.retrieve(suggestion, { sessionToken });
			const feature = result?.features?.[0];
			if (feature) {
				const [lng, lat] = feature.geometry.coordinates;
				onSelect({
					address: suggestion.name,
					formattedAddress: suggestion.full_address || suggestion.place_formatted || suggestion.name,
					lat,
					lng
				});
			}
			// New session for next search
			const mod = await import('@mapbox/search-js-core');
			sessionToken = new mod.SessionToken();
		} catch (e) {
			console.error('Retrieve error:', e);
		} finally {
			isLoading = false;
		}
	}

	function handleBlur() {
		setTimeout(() => { showDropdown = false; }, 200);
	}
</script>

<div class="relative w-full">
	<div class="relative">
		<MapPin class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
		<input
			bind:value={query}
			oninput={handleInput}
			onblur={handleBlur}
			onfocus={() => { if (suggestions.length) showDropdown = true; }}
			type="text"
			placeholder="Enter your address..."
			class="w-full pl-10 pr-10 py-2.5 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
		/>
		{#if isLoading}
			<Loader2 class="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
		{/if}
	</div>

	{#if initError}
		<p class="mt-1 text-xs text-red-400">{initError}</p>
	{/if}

	{#if showDropdown}
		<ul class="absolute z-50 w-full mt-1 bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl overflow-hidden">
			{#each suggestions as suggestion}
				<li>
					<button
						type="button"
						class="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-zinc-700 transition-colors flex items-start gap-2"
						onpointerdown={() => selectSuggestion(suggestion)}
					>
						<MapPin class="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
						<div>
							<div class="font-medium">{suggestion.name}</div>
							{#if suggestion.place_formatted}
								<div class="text-xs text-zinc-400">{suggestion.place_formatted}</div>
							{/if}
						</div>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
