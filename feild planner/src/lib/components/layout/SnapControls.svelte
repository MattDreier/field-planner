<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Grid3x3 } from 'lucide-svelte';
	import type { SnapIncrement } from '$lib/utils/snap';

	interface Props {
		snapIncrement: SnapIncrement;
		onSnapChange: (increment: SnapIncrement) => void;
	}

	let { snapIncrement, onSnapChange }: Props = $props();

	const snapOptions: Array<{ value: SnapIncrement; label: string }> = [
		{ value: 0, label: 'Off' },
		{ value: 1, label: '1"' },
		{ value: 12, label: "1'" }
	];
</script>

<div class="flex items-center gap-2">
	<Grid3x3 class="w-4 h-4 text-muted-foreground" />
	<span class="text-sm text-muted-foreground">Snap:</span>
	<div class="flex">
		{#each snapOptions as option, i}
			<Button
				variant={snapIncrement === option.value ? 'default' : 'outline'}
				size="sm"
				onclick={() => onSnapChange(option.value)}
				class="px-2 h-8 min-w-[2.5rem] {i === 0
					? 'rounded-r-none'
					: i === snapOptions.length - 1
						? 'rounded-l-none -ml-px'
						: 'rounded-none -ml-px'}"
			>
				{option.label}
			</Button>
		{/each}
	</div>
</div>
