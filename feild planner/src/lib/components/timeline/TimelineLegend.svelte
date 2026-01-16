<script lang="ts">
	import { PHASE_COLORS } from '$lib/utils/timeline';

	const phases = [
		{ key: 'indoor-start', label: 'Indoor Start', color: PHASE_COLORS['indoor-start'] },
		{ key: 'hardening-off', label: 'Hardening Off', color: PHASE_COLORS['hardening-off'] },
		{ key: 'growing', label: 'Growing', color: PHASE_COLORS['growing'] },
		{ key: 'harvest-window', label: 'Harvest', color: PHASE_COLORS['harvest-window'] }
	];
</script>

<div class="flex items-center gap-4 px-4 py-2 border-b border-border bg-muted/30">
	<span class="text-xs text-muted-foreground font-medium">Phases:</span>
	{#each phases as phase}
		<div class="flex items-center gap-1.5">
			<div
				class="w-4 h-2.5 rounded-sm"
				style="background-color: {phase.color}"
			></div>
			<span class="text-xs text-muted-foreground">{phase.label}</span>
		</div>
	{/each}

	<div class="ml-auto flex items-center gap-4">
		<div class="flex items-center gap-1.5">
			<div class="w-6 h-0 border-t-2 border-dashed" style="border-color: oklch(0.60 0.12 250)"></div>
			<span class="text-xs text-muted-foreground">Frost dates</span>
		</div>
	</div>
</div>
