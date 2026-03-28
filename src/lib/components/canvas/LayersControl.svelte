<script lang="ts">
	interface Props {
		satelliteEnabled: boolean;
		gridVisible: boolean;
		onToggleSatellite: () => void;
		onToggleGrid: () => void;
	}

	let {
		satelliteEnabled,
		gridVisible,
		onToggleSatellite,
		onToggleGrid
	}: Props = $props();
</script>

<div class="absolute bottom-16 left-4 z-30">
	<button
		onclick={onToggleSatellite}
		class="group relative w-[72px] h-[72px] rounded-lg overflow-hidden border-2 shadow-lg transition-all {satelliteEnabled ? 'border-blue-500 shadow-blue-500/30' : 'border-zinc-600 hover:border-zinc-400'}"
	>
		<img
			src="/satellite-preview.jpg"
			alt="Satellite view"
			class="absolute inset-0 w-full h-full object-cover"
		/>
		<div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
		<span class="absolute bottom-1 left-0 right-0 text-[10px] font-medium text-white text-center">
			Layers
		</span>
	</button>
</div>
