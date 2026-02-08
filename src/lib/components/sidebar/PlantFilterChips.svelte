<script lang="ts">
	import type { PlantData } from '$lib/data/plants';

	interface Props {
		selectedKinds: Set<PlantData['kind']>;
		onToggle: (kind: PlantData['kind']) => void;
	}

	let { selectedKinds, onToggle }: Props = $props();

	const kinds: { value: PlantData['kind']; label: string }[] = [
		{ value: 'flower', label: 'Flower' },
		{ value: 'vegetable', label: 'Vegetable' },
		{ value: 'herb', label: 'Herb' }
	];
</script>

<div class="flex gap-1.5">
	{#each kinds as kind}
		<button
			type="button"
			class="px-2.5 py-0.5 text-xs font-medium rounded-full border transition-colors
				{selectedKinds.has(kind.value)
				? 'bg-primary text-primary-foreground border-primary'
				: 'bg-transparent text-muted-foreground border-border hover:bg-muted hover:text-foreground'}"
			onclick={() => onToggle(kind.value)}
		>
			{kind.label}
		</button>
	{/each}
</div>
