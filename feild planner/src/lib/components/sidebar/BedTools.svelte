<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { Tool } from '$lib/types';
	import { MousePointer2, Square, Circle, Trash2 } from 'lucide-svelte';

	interface Props {
		currentTool: Tool;
		hasSelection: boolean;
		onToolChange: (tool: Tool) => void;
		onDelete: () => void;
	}

	let { currentTool, hasSelection, onToolChange, onDelete }: Props = $props();
</script>

<div class="p-4 border-b border-border">
	<h3 class="font-semibold text-lg mb-3">Tools</h3>

	<div class="flex flex-wrap gap-2">
		<Button
			variant={currentTool === 'select' ? 'default' : 'outline'}
			size="sm"
			onclick={() => onToolChange('select')}
			class="flex items-center gap-2"
		>
			<MousePointer2 class="w-4 h-4" />
			Select
		</Button>

		<Button
			variant={currentTool === 'rectangle' ? 'default' : 'outline'}
			size="sm"
			onclick={() => onToolChange('rectangle')}
			class="flex items-center gap-2"
		>
			<Square class="w-4 h-4" />
			Rectangle
		</Button>

		<Button
			variant={currentTool === 'circle' ? 'default' : 'outline'}
			size="sm"
			onclick={() => onToolChange('circle')}
			class="flex items-center gap-2"
		>
			<Circle class="w-4 h-4" />
			Circle
		</Button>
	</div>

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

	<div class="mt-4 text-xs text-muted-foreground">
		{#if currentTool === 'select'}
			<p>Click to select beds or plants. Drag to move.</p>
		{:else if currentTool === 'rectangle'}
			<p>Click and drag on canvas to create a rectangular bed.</p>
		{:else if currentTool === 'circle'}
			<p>Click and drag on canvas to create a circular bed.</p>
		{/if}
	</div>
</div>
