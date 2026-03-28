<script lang="ts">
	import RotationHandle from './RotationHandle.svelte';
	import type { Bed as BedType } from '$lib/types';
	import type { Id } from '../../../convex/_generated/dataModel';

	interface Props {
		bed: BedType;
		x: number; // top-left x in field inches
		y: number; // top-left y in field inches
		widthInches: number;
		heightInches: number;
		scale: number; // pixelsPerInch * zoom (for counter-scaling fixed-pixel elements)
		isSelected: boolean;
		selectedBedIds: Set<Id<'beds'>>; // All selected beds for multi-drag
		onSelect: (id: Id<'beds'>, shiftKey?: boolean) => void;
		onMove?: (id: Id<'beds'>, deltaX: number, deltaY: number, allSelectedIds?: Set<Id<'beds'>>) => void;
		onMoveStart?: () => void; // Called once when drag/resize begins (for history snapshot)
		onMoveEnd?: () => void; // Called when drag/resize ends (for clearing guides)
		onResize?: (id: Id<'beds'>, newWidthFeet: number, newHeightFeet: number) => void;
		onRotate?: (id: Id<'beds'>, rotation: number) => void;
	}

	let { bed, x, y, widthInches, heightInches, scale, isSelected, selectedBedIds, onSelect, onMove, onMoveStart, onMoveEnd, onResize, onRotate }: Props = $props();

	// Use $derived for reactive computed values
	const fillColor = $derived(bed.fillColor || 'rgba(139, 69, 19, 0.3)');
	const strokeColor = $derived(isSelected ? 'rgb(59, 130, 246)' : 'rgba(139, 69, 19, 0.8)');
	const strokeWidth = $derived((isSelected ? 3 : 2) / scale);

	// Counter-scaled sizes: fixed-pixel appearance regardless of zoom
	const handleSize = $derived(8 / scale);
	const handleStrokeWidth = $derived(2 / scale);
	const borderRadius = $derived(4 / scale);
	const labelFontSize = $derived(14 / scale);
	const dimLabelFontSize = $derived(12 / scale);
	const dimLabelOffset = $derived(16 / scale);
	const rotationHandleDistance = $derived(heightInches / 2 + 30 / scale);

	// Drag state
	let isDragging = $state(false);
	let dragStartX = $state(0);
	let dragStartY = $state(0);

	// Resize state
	type ResizeHandle = 'se' | 'e' | 's' | null; // southeast (corner), east (right), south (bottom)
	let resizeHandle = $state<ResizeHandle>(null);
	let resizeStartX = $state(0);
	let resizeStartY = $state(0);
	let resizeStartWidthFeet = $state(0);
	let resizeStartHeightFeet = $state(0);

	// Minimum bed size in feet
	const MIN_SIZE_FEET = 1;

	function handlePointerDown(e: PointerEvent) {
		if (e.button !== 0) return; // Only primary button

		// Only change selection if:
		// - This bed is NOT already selected (clicking to start a new selection/drag)
		// - OR shift is pressed (toggling in multi-select)
		// If already selected and not shift, preserve selection for multi-drag
		if (!isSelected || e.shiftKey) {
			onSelect(bed._id, e.shiftKey);
		}

		// Notify parent that a drag is starting (for history snapshot)
		onMoveStart?.();

		isDragging = true;
		dragStartX = e.clientX;
		dragStartY = e.clientY;
		(e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
		e.stopPropagation();
	}

	function handlePointerMove(e: PointerEvent) {
		if (isDragging && onMove) {
			const deltaX = e.clientX - dragStartX;
			const deltaY = e.clientY - dragStartY;
			// Pass all selected bed IDs for multi-drag
			onMove(bed._id, deltaX, deltaY, selectedBedIds);
			dragStartX = e.clientX;
			dragStartY = e.clientY;
		}
	}

	function handlePointerUp(e: PointerEvent) {
		isDragging = false;
		(e.currentTarget as SVGElement).releasePointerCapture(e.pointerId);
		onMoveEnd?.();
	}

	// Resize handle events
	function handleResizePointerDown(handle: ResizeHandle, e: PointerEvent) {
		if (e.button !== 0) return;
		e.stopPropagation();

		// Notify parent that a resize is starting (for history snapshot)
		onMoveStart?.();

		resizeHandle = handle;
		resizeStartX = e.clientX;
		resizeStartY = e.clientY;
		resizeStartWidthFeet = bed.widthFeet;
		resizeStartHeightFeet = bed.shape === 'rectangle' ? bed.heightFeet : bed.widthFeet;
		(e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
	}

	function handleResizePointerMove(e: PointerEvent) {
		if (!resizeHandle || !onResize) return;

		const deltaX = e.clientX - resizeStartX;
		const deltaY = e.clientY - resizeStartY;

		// Convert pixel delta to feet (12 inches per foot)
		const deltaFeetX = deltaX / scale / 12;
		const deltaFeetY = deltaY / scale / 12;

		let newWidthFeet = resizeStartWidthFeet;
		let newHeightFeet = resizeStartHeightFeet;

		switch (resizeHandle) {
			case 'se': // Bottom-right corner: resize both dimensions
				newWidthFeet = Math.max(MIN_SIZE_FEET, resizeStartWidthFeet + deltaFeetX);
				newHeightFeet = Math.max(MIN_SIZE_FEET, resizeStartHeightFeet + deltaFeetY);
				break;
			case 'e': // Right edge: resize width only
				newWidthFeet = Math.max(MIN_SIZE_FEET, resizeStartWidthFeet + deltaFeetX);
				break;
			case 's': // Bottom edge: resize height only
				newHeightFeet = Math.max(MIN_SIZE_FEET, resizeStartHeightFeet + deltaFeetY);
				break;
		}

		onResize(bed._id, newWidthFeet, newHeightFeet);
	}

	function handleResizePointerUp(e: PointerEvent) {
		resizeHandle = null;
		(e.currentTarget as SVGElement).releasePointerCapture(e.pointerId);
		onMoveEnd?.();
	}

	// Rotation
	const rotation = $derived(bed.rotation ?? 0);
	const centerX = $derived(x + widthInches / 2);
	const centerY = $derived(y + heightInches / 2);

	function handleRotation(degrees: number) {
		if (onRotate) {
			onRotate(bed._id, degrees);
		}
	}
</script>

<g class="bed" role="button" tabindex="0" style="outline: none" onkeydown={(e) => e.key === 'Enter' && onSelect(bed._id, e.shiftKey)}>
	<!-- Rotation wrapper - all bed content rotates around center -->
	<g transform="rotate({rotation}, {centerX}, {centerY})">
	{#if bed.shape === 'rectangle'}
		<!-- Rectangular bed -->
		<rect
			{x}
			{y}
			width={widthInches}
			height={heightInches}
			fill={fillColor}
			stroke={strokeColor}
			stroke-width={strokeWidth}
			rx={borderRadius}
			ry={borderRadius}
			class="cursor-move touch-none"
			role="button"
			tabindex="-1"
			onpointerdown={handlePointerDown}
			onpointermove={handlePointerMove}
			onpointerup={handlePointerUp}
		/>
	{:else}
		<!-- Circular bed -->
		<ellipse
			cx={x + widthInches / 2}
			cy={y + widthInches / 2}
			rx={widthInches / 2}
			ry={widthInches / 2}
			fill={fillColor}
			stroke={strokeColor}
			stroke-width={strokeWidth}
			class="cursor-move touch-none"
			role="button"
			tabindex="-1"
			onpointerdown={handlePointerDown}
			onpointermove={handlePointerMove}
			onpointerup={handlePointerUp}
		/>
	{/if}

	<!-- Bed name label -->
	{#if bed.name}
		<text
			x={x + widthInches / 2}
			y={y + heightInches / 2}
			text-anchor="middle"
			dominant-baseline="middle"
			font-size={labelFontSize}
			font-weight="500"
			class="fill-foreground pointer-events-none"
		>
			{bed.name}
		</text>
	{/if}

	<!-- Dimension label -->
	<text
		x={x + widthInches / 2}
		y={y + heightInches + dimLabelOffset}
		text-anchor="middle"
		font-size={dimLabelFontSize}
		class="fill-muted-foreground pointer-events-none"
	>
		{bed.widthFeet}' × {bed.shape === 'rectangle' ? bed.heightFeet : bed.widthFeet}'
	</text>

	<!-- Resize handles (only shown when selected) -->
	{#if isSelected && onResize && bed.shape === 'rectangle'}
		<!-- Bottom-right corner handle (SE) -->
		<rect
			x={x + widthInches - handleSize / 2}
			y={y + heightInches - handleSize / 2}
			width={handleSize}
			height={handleSize}
			fill="white"
			stroke="rgb(59, 130, 246)"
			stroke-width={handleStrokeWidth}
			class="cursor-se-resize touch-none"
			role="button"
			tabindex="-1"
			aria-label="Resize bed from corner"
			onpointerdown={(e) => handleResizePointerDown('se', e)}
			onpointermove={handleResizePointerMove}
			onpointerup={handleResizePointerUp}
		/>
		<!-- Right-center handle (E) -->
		<rect
			x={x + widthInches - handleSize / 2}
			y={y + heightInches / 2 - handleSize / 2}
			width={handleSize}
			height={handleSize}
			fill="white"
			stroke="rgb(59, 130, 246)"
			stroke-width={handleStrokeWidth}
			class="cursor-e-resize touch-none"
			role="button"
			tabindex="-1"
			aria-label="Resize bed width"
			onpointerdown={(e) => handleResizePointerDown('e', e)}
			onpointermove={handleResizePointerMove}
			onpointerup={handleResizePointerUp}
		/>
		<!-- Bottom-center handle (S) -->
		<rect
			x={x + widthInches / 2 - handleSize / 2}
			y={y + heightInches - handleSize / 2}
			width={handleSize}
			height={handleSize}
			fill="white"
			stroke="rgb(59, 130, 246)"
			stroke-width={handleStrokeWidth}
			class="cursor-s-resize touch-none"
			role="button"
			tabindex="-1"
			aria-label="Resize bed height"
			onpointerdown={(e) => handleResizePointerDown('s', e)}
			onpointermove={handleResizePointerMove}
			onpointerup={handleResizePointerUp}
		/>
	{/if}
	</g><!-- End rotation wrapper -->

	<!-- Rotation handle (shown when selected) - outside rotation wrapper -->
	{#if isSelected && onRotate}
		<RotationHandle
			{centerX}
			{centerY}
			currentRotation={rotation}
			distance={rotationHandleDistance}
			{scale}
			onRotate={handleRotation}
			onRotateStart={onMoveStart}
		/>
	{/if}
</g>
