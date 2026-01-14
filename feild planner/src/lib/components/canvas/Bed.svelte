<script lang="ts">
	import type { Bed as BedType } from '$lib/types';
	import type { Id } from '../../../convex/_generated/dataModel';

	interface Props {
		bed: BedType;
		x: number; // top-left x in pixels
		y: number; // top-left y in pixels
		widthPixels: number;
		heightPixels: number;
		isSelected: boolean;
		onSelect: (id: Id<'beds'>) => void;
		onMove?: (id: Id<'beds'>, deltaX: number, deltaY: number) => void;
		onResize?: (id: Id<'beds'>, newWidthFeet: number, newHeightFeet?: number) => void;
	}

	let { bed, x, y, widthPixels, heightPixels, isSelected, onSelect, onMove, onResize }: Props = $props();

	// Use $derived for reactive computed values
	const fillColor = $derived(bed.fillColor || 'rgba(139, 69, 19, 0.3)');
	const strokeColor = $derived(isSelected ? 'rgb(59, 130, 246)' : 'rgba(139, 69, 19, 0.8)');
	const strokeWidth = $derived(isSelected ? 3 : 2);

	// Drag state
	let isDragging = $state(false);
	let dragStartX = $state(0);
	let dragStartY = $state(0);

	function handleMouseDown(e: MouseEvent) {
		if (e.button !== 0) return; // Only left click
		onSelect(bed._id);
		isDragging = true;
		dragStartX = e.clientX;
		dragStartY = e.clientY;
		e.stopPropagation();
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDragging || !onMove) return;
		const deltaX = e.clientX - dragStartX;
		const deltaY = e.clientY - dragStartY;
		onMove(bed._id, deltaX, deltaY);
		dragStartX = e.clientX;
		dragStartY = e.clientY;
	}

	function handleMouseUp() {
		isDragging = false;
	}

	// Resize handles (shown when selected)
	const handleSize = 8;
</script>

<svelte:window onmousemove={handleMouseMove} onmouseup={handleMouseUp} />

<g class="bed" role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && onSelect(bed._id)}>
	{#if bed.shape === 'rectangle'}
		<!-- Rectangular bed -->
		<rect
			{x}
			{y}
			width={widthPixels}
			height={heightPixels}
			fill={fillColor}
			stroke={strokeColor}
			stroke-width={strokeWidth}
			rx="4"
			ry="4"
			class="cursor-move"
			role="button"
			tabindex="-1"
			onmousedown={handleMouseDown}
		/>
	{:else}
		<!-- Circular bed -->
		<ellipse
			cx={x + widthPixels / 2}
			cy={y + heightPixels / 2}
			rx={widthPixels / 2}
			ry={heightPixels / 2}
			fill={fillColor}
			stroke={strokeColor}
			stroke-width={strokeWidth}
			class="cursor-move"
			role="button"
			tabindex="-1"
			onmousedown={handleMouseDown}
		/>
	{/if}

	<!-- Bed name label -->
	{#if bed.name}
		<text
			x={x + widthPixels / 2}
			y={y + heightPixels / 2}
			text-anchor="middle"
			dominant-baseline="middle"
			class="text-sm fill-foreground font-medium pointer-events-none"
		>
			{bed.name}
		</text>
	{/if}

	<!-- Dimension label -->
	<text
		x={x + widthPixels / 2}
		y={y + heightPixels + 16}
		text-anchor="middle"
		class="text-xs fill-muted-foreground pointer-events-none"
	>
		{bed.widthFeet}' × {bed.shape === 'rectangle' ? bed.heightFeet : bed.widthFeet}'
	</text>

	<!-- Resize handles (only shown when selected) -->
	{#if isSelected && onResize && bed.shape === 'rectangle'}
		<!-- Bottom-right corner handle -->
		<rect
			x={x + widthPixels - handleSize / 2}
			y={y + heightPixels - handleSize / 2}
			width={handleSize}
			height={handleSize}
			fill="white"
			stroke="rgb(59, 130, 246)"
			stroke-width="2"
			class="cursor-se-resize"
		/>
		<!-- Right-center handle -->
		<rect
			x={x + widthPixels - handleSize / 2}
			y={y + heightPixels / 2 - handleSize / 2}
			width={handleSize}
			height={handleSize}
			fill="white"
			stroke="rgb(59, 130, 246)"
			stroke-width="2"
			class="cursor-e-resize"
		/>
		<!-- Bottom-center handle -->
		<rect
			x={x + widthPixels / 2 - handleSize / 2}
			y={y + heightPixels - handleSize / 2}
			width={handleSize}
			height={handleSize}
			fill="white"
			stroke="rgb(59, 130, 246)"
			stroke-width="2"
			class="cursor-s-resize"
		/>
	{/if}
</g>
