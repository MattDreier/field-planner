<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { Tool, Bed } from '$lib/types';
	import { MousePointer2, Square, Circle, Trash2 } from 'lucide-svelte';

	interface Props {
		currentTool: Tool;
		hasSelection: boolean;
		selectedBed: Bed | null;
		onToolChange: (tool: Tool) => void;
		onDelete: () => void;
		onResizeBed: (id: string, widthFeet: number, heightFeet?: number) => void;
		onRotateBed?: (id: string, rotation: number) => void;
	}

	let { currentTool, hasSelection, selectedBed, onToolChange, onDelete, onResizeBed, onRotateBed }: Props = $props();

	// Local input values for controlled inputs
	let widthInput = $state('');
	let heightInput = $state('');
	let rotationInput = $state('');

	// Sync local inputs when selected bed changes
	$effect(() => {
		if (selectedBed) {
			widthInput = selectedBed.widthFeet.toFixed(2);
			heightInput = selectedBed.shape === 'rectangle' ? selectedBed.heightFeet.toFixed(2) : '';
			rotationInput = (selectedBed.rotation ?? 0).toFixed(0);
		}
	});

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
			// Normalize to 0-360
			const normalizedValue = ((value % 360) + 360) % 360;
			onRotateBed(selectedBed._id, normalizedValue);
		}
	}
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

				<!-- Rotation input -->
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
			</div>
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
