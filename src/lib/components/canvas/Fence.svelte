<script lang="ts">
	/**
	 * Renders a fence as a polyline with vertex handles when selected.
	 * Supports dragging the entire fence or individual vertices.
	 * Expects field-inch coordinates; rendered inside a scaled <g> group.
	 */
	import type { Fence as FenceType, FenceVertex } from '$lib/types';
	import type { Id } from '../../../convex/_generated/dataModel';

	interface Props {
		fence: FenceType;
		vertices: FenceVertex[]; // field-inch coordinates
		scale: number; // pixelsPerInch * zoom (for counter-scaling)
		isSelected: boolean;
		selectedFenceIds: Set<Id<'fences'>>;
		onSelect: (id: Id<'fences'>, shiftKey?: boolean) => void;
		onMove?: (id: Id<'fences'>, deltaX: number, deltaY: number, allSelectedIds?: Set<Id<'fences'>>, disableSnap?: boolean) => void;
		onMoveVertex?: (id: Id<'fences'>, vertexIndex: number, newX: number, newY: number) => void;
		onMoveStart?: () => void;
		onMoveEnd?: () => void;
	}

	let {
		fence,
		vertices,
		scale,
		isSelected,
		selectedFenceIds,
		onSelect,
		onMove,
		onMoveVertex,
		onMoveStart,
		onMoveEnd
	}: Props = $props();

	// Styling
	const strokeColor = $derived(fence.color || (isSelected ? 'rgb(59, 130, 246)' : 'rgb(120, 113, 108)'));

	// Convert vertices to SVG polyline points string (field-inch coordinates)
	const pointsString = $derived(
		vertices.map(v => `${v.x},${v.y}`).join(' ')
	);

	// Calculate midpoint for height label (field-inch coordinates)
	const midpoint = $derived.by(() => {
		if (vertices.length < 2) return { x: 0, y: 0 };
		const mid = Math.floor(vertices.length / 2);
		if (vertices.length % 2 === 0) {
			// Even number of vertices - average the two middle ones
			const v1 = vertices[mid - 1];
			const v2 = vertices[mid];
			return { x: (v1.x + v2.x) / 2, y: (v1.y + v2.y) / 2 };
		} else {
			return vertices[mid];
		}
	});

	// Fence body drag state
	let isDragging = $state(false);
	let dragStartX = $state(0);
	let dragStartY = $state(0);

	// Vertex drag state
	let draggingVertexIndex = $state<number | null>(null);
	let vertexDragStartX = $state(0);
	let vertexDragStartY = $state(0);
	let vertexStartPos = $state<{ x: number; y: number } | null>(null);

	// Counter-scaled sizes (fixed visual size regardless of zoom)
	const handleRadius = $derived(6 / scale);
	const hitAreaRadius = $derived(12 / scale);
	const labelFontSize = $derived(11 / scale);
	const labelOffsetY = $derived(12 / scale);
	const fenceStrokeWidth = $derived((isSelected ? 4 : 3) / scale);
	const handleStrokeWidth = $derived(2 / scale);

	function handlePointerDown(e: PointerEvent) {
		if (e.button !== 0) return;

		if (!isSelected || e.shiftKey) {
			onSelect(fence._id, e.shiftKey);
		}

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
			onMove(fence._id, deltaX, deltaY, selectedFenceIds, e.altKey);
			dragStartX = e.clientX;
			dragStartY = e.clientY;
		}
	}

	function handlePointerUp(e: PointerEvent) {
		isDragging = false;
		(e.currentTarget as SVGElement).releasePointerCapture(e.pointerId);
		onMoveEnd?.();
	}

	// Vertex handle events
	function handleVertexPointerDown(index: number, e: PointerEvent) {
		if (e.button !== 0) return;
		e.stopPropagation();

		onMoveStart?.();

		draggingVertexIndex = index;
		vertexDragStartX = e.clientX;
		vertexDragStartY = e.clientY;
		vertexStartPos = { ...fence.vertices[index] };
		(e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
	}

	function handleVertexPointerMove(e: PointerEvent) {
		if (draggingVertexIndex === null || !onMoveVertex || !vertexStartPos) return;

		const deltaX = e.clientX - vertexDragStartX;
		const deltaY = e.clientY - vertexDragStartY;

		// Convert pixel delta to field inches
		const newX = vertexStartPos.x + deltaX / scale;
		const newY = vertexStartPos.y + deltaY / scale;

		onMoveVertex(fence._id, draggingVertexIndex, newX, newY);
	}

	function handleVertexPointerUp(e: PointerEvent) {
		draggingVertexIndex = null;
		vertexStartPos = null;
		(e.currentTarget as SVGElement).releasePointerCapture(e.pointerId);
		onMoveEnd?.();
	}
</script>

<g class="fence" role="button" tabindex="0" style="outline: none" onkeydown={(e) => e.key === 'Enter' && onSelect(fence._id, e.shiftKey)}>
	<!-- Fence line (polyline connecting all vertices) -->
	<polyline
		points={pointsString}
		fill="none"
		stroke={strokeColor}
		stroke-width={fenceStrokeWidth}
		stroke-linecap="round"
		stroke-linejoin="round"
		class="cursor-move touch-none"
		role="button"
		tabindex="-1"
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
	/>

	<!-- Invisible wider hit area for easier selection -->
	<polyline
		points={pointsString}
		fill="none"
		stroke="transparent"
		stroke-width={20 / scale}
		stroke-linecap="round"
		stroke-linejoin="round"
		class="cursor-move touch-none"
		role="button"
		tabindex="-1"
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
	/>

	<!-- Height label at midpoint -->
	<text
		x={midpoint.x}
		y={midpoint.y - labelOffsetY}
		text-anchor="middle"
		font-size={labelFontSize}
		class="fill-muted-foreground pointer-events-none select-none"
	>
		{fence.heightFeet}' fence
	</text>

	<!-- Vertex handles (shown when selected) -->
	{#if isSelected}
		{#each vertices as vertex, index}
			<!-- Invisible larger hit area -->
			<circle
				cx={vertex.x}
				cy={vertex.y}
				r={hitAreaRadius}
				fill="transparent"
				class="cursor-crosshair touch-none"
				role="button"
				tabindex="-1"
				aria-label="Move fence vertex {index + 1}"
				onpointerdown={(e) => handleVertexPointerDown(index, e)}
				onpointermove={handleVertexPointerMove}
				onpointerup={handleVertexPointerUp}
			/>
			<!-- Visible handle -->
			<circle
				cx={vertex.x}
				cy={vertex.y}
				r={handleRadius}
				fill="white"
				stroke="rgb(59, 130, 246)"
				stroke-width={handleStrokeWidth}
				class="pointer-events-none"
			/>
		{/each}
	{/if}
</g>
