<script lang="ts">
	import type { Zone as ZoneType, ZoneVertex } from '$lib/types';
	import { ZONE_COLORS, ZONE_STROKES, ZONE_LABELS, buildZonePath, sampleBezier } from '$lib/utils/zone';
	import type { Id } from '../../../convex/_generated/dataModel';

	interface Props {
		zone: ZoneType;
		vertices: ZoneVertex[]; // field-inch coordinates
		scale: number; // pixelsPerInch * zoom (for counter-scaling)
		isSelected: boolean;
		selectedZoneIds: Set<Id<'zones'>>;
		onSelect: (id: Id<'zones'>, shiftKey?: boolean) => void;
		onMove?: (id: Id<'zones'>, deltaX: number, deltaY: number, allSelectedIds?: Set<Id<'zones'>>, disableSnap?: boolean) => void;
		onMoveVertex?: (id: Id<'zones'>, vertexIndex: number, newX: number, newY: number) => void;
		onMoveControlPoint?: (id: Id<'zones'>, vertexIndex: number, cpType: 'cp1' | 'cp2', x: number, y: number) => void;
		onMoveStart?: () => void;
		onMoveEnd?: () => void;
	}

	let { zone, vertices, scale, isSelected, selectedZoneIds, onSelect, onMove, onMoveVertex, onMoveControlPoint, onMoveStart, onMoveEnd }: Props = $props();

	const fillColor = $derived(ZONE_COLORS[zone.zoneType]);
	const strokeColor = $derived(isSelected ? 'rgb(59, 130, 246)' : ZONE_STROKES[zone.zoneType]);

	const pathString = $derived(buildZonePath(vertices));

	// Counter-scaled sizes
	const handleRadius = $derived(6 / scale);
	const hitAreaRadius = $derived(12 / scale);
	const labelFontSize = $derived(11 / scale);
	const pillHeight = $derived(20 / scale);
	const strokeWidth = $derived((isSelected ? 1.5 : 0.75) / scale);
	const handleStrokeWidth = $derived(2 / scale);
	const cpHandleRadius = $derived(4 / scale);
	const cpLineWidth = $derived(0.5 / scale);
	const cpDashArray = $derived(`${3 / scale} ${2 / scale}`);

	const centroid = $derived.by(() => {
		if (vertices.length < 3) return { x: 0, y: 0 };
		let cx = 0, cy = 0;
		for (const v of vertices) { cx += v.x; cy += v.y; }
		return { x: cx / vertices.length, y: cy / vertices.length };
	});

	const labelText = $derived(zone.name || ZONE_LABELS[zone.zoneType]);
	const labelWidth = $derived(Math.max(labelText.length * 6.5 + 12, 40) / scale);

	// Rotate a point around a center by angleDeg degrees
	function rotatePoint(x: number, y: number, cx: number, cy: number, angleDeg: number): { x: number; y: number } {
		const rad = angleDeg * Math.PI / 180;
		const cos = Math.cos(rad);
		const sin = Math.sin(rad);
		const dx = x - cx;
		const dy = y - cy;
		return {
			x: cx + dx * cos - dy * sin,
			y: cy + dx * sin + dy * cos
		};
	}

	// Fabric seam overlap pairs (landscape_fabric only)
	const seamPairs = $derived.by(() => {
		if (zone.zoneType !== 'landscape_fabric' || !zone.fabricWidthInches || vertices.length < 3) return [];

		const overlap = zone.fabricOverlapInches ?? 6;
		const overlapInches = overlap;
		const stripSpacing = zone.fabricWidthInches - overlap;
		if (stripSpacing <= 0) return [];

		const rotationDeg = zone.fabricRotationDeg ?? 0;
		const cx = centroid.x;
		const cy = centroid.y;

		// Expand curved edges to sampled points, then rotate into seam-aligned frame
		const expandedVerts: Array<{ x: number; y: number }> = [];
		for (let i = 0; i < vertices.length; i++) {
			const curr = vertices[i];
			const next = vertices[(i + 1) % vertices.length];
			expandedVerts.push({ x: curr.x, y: curr.y });
			if (curr.cp1 || next.cp2) {
				const cp1 = curr.cp1 ?? { x: curr.x, y: curr.y };
				const cp2 = next.cp2 ?? { x: next.x, y: next.y };
				const sampled = sampleBezier(curr, cp1, cp2, next, 20);
				expandedVerts.push(...sampled);
			}
		}

		const rotatedVerts = expandedVerts.map(v => rotatePoint(v.x, v.y, cx, cy, -rotationDeg));

		let minY = Infinity, maxY = -Infinity;
		for (const v of rotatedVerts) {
			if (v.y < minY) minY = v.y;
			if (v.y > maxY) maxY = v.y;
		}

		const n = rotatedVerts.length;

		function clipLineToPolygon(y: number): Array<{ x1: number; x2: number }> {
			const intersections: number[] = [];
			for (let i = 0; i < n; i++) {
				const a = rotatedVerts[i];
				const b = rotatedVerts[(i + 1) % n];
				if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) {
					const t = (y - a.y) / (b.y - a.y);
					intersections.push(a.x + t * (b.x - a.x));
				}
			}
			intersections.sort((a, b) => a - b);
			const segs: Array<{ x1: number; x2: number }> = [];
			for (let i = 0; i < intersections.length - 1; i += 2) {
				segs.push({ x1: intersections[i], x2: intersections[i + 1] });
			}
			return segs;
		}

		const pairs: Array<{ top: Array<{ x1: number; y1: number; x2: number; y2: number }>; bottom: Array<{ x1: number; y1: number; x2: number; y2: number }> }> = [];

		for (let seamCenter = minY + stripSpacing; seamCenter < maxY; seamCenter += stripSpacing) {
			const topY = seamCenter - overlapInches / 2;
			const bottomY = seamCenter + overlapInches / 2;

			// Compute seam segments in the rotated frame, then rotate back to original coordinates
			const topSegs = clipLineToPolygon(topY).map(s => {
				const p1 = rotatePoint(s.x1, topY, cx, cy, rotationDeg);
				const p2 = rotatePoint(s.x2, topY, cx, cy, rotationDeg);
				return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
			});
			const bottomSegs = clipLineToPolygon(bottomY).map(s => {
				const p1 = rotatePoint(s.x1, bottomY, cx, cy, rotationDeg);
				const p2 = rotatePoint(s.x2, bottomY, cx, cy, rotationDeg);
				return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
			});

			if (topSegs.length > 0 || bottomSegs.length > 0) {
				pairs.push({ top: topSegs, bottom: bottomSegs });
			}
		}
		return pairs;
	});

	let isDragging = $state(false);
	let dragStartX = $state(0);
	let dragStartY = $state(0);

	let draggingVertexIndex = $state<number | null>(null);
	let vertexDragStartX = $state(0);
	let vertexDragStartY = $state(0);
	let vertexStartPos = $state<{ x: number; y: number } | null>(null);

	// Control point drag state
	let draggingCPIndex = $state<number | null>(null);
	let draggingCPType = $state<'cp1' | 'cp2' | null>(null);
	let cpDragStartX = $state(0);
	let cpDragStartY = $state(0);
	let cpStartPos = $state<{ x: number; y: number } | null>(null);

	function handlePointerDown(e: PointerEvent) {
		if (e.button !== 0) return;
		if (!isSelected || e.shiftKey) { onSelect(zone._id, e.shiftKey); }
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
			onMove(zone._id, deltaX, deltaY, selectedZoneIds, e.altKey);
			dragStartX = e.clientX;
			dragStartY = e.clientY;
		}
	}

	function handlePointerUp(e: PointerEvent) {
		isDragging = false;
		(e.currentTarget as SVGElement).releasePointerCapture(e.pointerId);
		onMoveEnd?.();
	}

	function handleVertexPointerDown(index: number, e: PointerEvent) {
		if (e.button !== 0) return;
		e.stopPropagation();
		onMoveStart?.();
		draggingVertexIndex = index;
		vertexDragStartX = e.clientX;
		vertexDragStartY = e.clientY;
		vertexStartPos = { ...zone.vertices[index] };
		(e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
	}

	function handleVertexPointerMove(e: PointerEvent) {
		if (draggingVertexIndex === null || !onMoveVertex || !vertexStartPos) return;
		const deltaX = e.clientX - vertexDragStartX;
		const deltaY = e.clientY - vertexDragStartY;
		const newX = vertexStartPos.x + deltaX / scale;
		const newY = vertexStartPos.y + deltaY / scale;
		onMoveVertex(zone._id, draggingVertexIndex, newX, newY);
	}

	function handleVertexPointerUp(e: PointerEvent) {
		draggingVertexIndex = null;
		vertexStartPos = null;
		(e.currentTarget as SVGElement).releasePointerCapture(e.pointerId);
		onMoveEnd?.();
	}

	function handleCPPointerDown(index: number, cpType: 'cp1' | 'cp2', e: PointerEvent) {
		if (e.button !== 0) return;
		e.stopPropagation();
		onMoveStart?.();
		draggingCPIndex = index;
		draggingCPType = cpType;
		cpDragStartX = e.clientX;
		cpDragStartY = e.clientY;
		const cp = zone.vertices[index][cpType];
		cpStartPos = cp ? { ...cp } : { x: zone.vertices[index].x, y: zone.vertices[index].y };
		(e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
	}

	function handleCPPointerMove(e: PointerEvent) {
		if (draggingCPIndex === null || !draggingCPType || !onMoveControlPoint || !cpStartPos) return;
		const deltaX = e.clientX - cpDragStartX;
		const deltaY = e.clientY - cpDragStartY;
		const newX = cpStartPos.x + deltaX / scale;
		const newY = cpStartPos.y + deltaY / scale;
		onMoveControlPoint(zone._id, draggingCPIndex, draggingCPType, newX, newY);
	}

	function handleCPPointerUp(e: PointerEvent) {
		draggingCPIndex = null;
		draggingCPType = null;
		cpStartPos = null;
		(e.currentTarget as SVGElement).releasePointerCapture(e.pointerId);
		onMoveEnd?.();
	}
</script>

<g class="zone" role="button" tabindex="0" style="outline: none" onkeydown={(e) => e.key === 'Enter' && onSelect(zone._id, e.shiftKey)}>
	<path
		d={pathString}
		fill={fillColor}
		fill-rule="evenodd"
		stroke={strokeColor}
		stroke-width={strokeWidth}
		stroke-linejoin="round"
		class="cursor-move touch-none"
		role="button"
		tabindex="-1"
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
	/>

	<!-- Fabric seam overlap zones -->
	{#each seamPairs as pair}
		{#each pair.top as seg, i}
			{@const bot = pair.bottom[i]}
			{#if bot}
				<polygon
					points="{seg.x1},{seg.y1} {seg.x2},{seg.y2} {bot.x2},{bot.y2} {bot.x1},{bot.y1}"
					fill="hsla(260, 15%, 20%, 0.25)"
					class="pointer-events-none"
				/>
			{/if}
		{/each}
		{#each pair.top as seg}
			<line x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
				stroke="hsla(260, 10%, 60%, 0.5)" stroke-width={1 / scale} stroke-dasharray="{6 / scale} {3 / scale}" class="pointer-events-none" />
		{/each}
		{#each pair.bottom as seg}
			<line x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
				stroke="hsla(260, 10%, 60%, 0.5)" stroke-width={1 / scale} stroke-dasharray="{6 / scale} {3 / scale}" class="pointer-events-none" />
		{/each}
	{/each}

	<!-- Zone label pill -->
	<rect
		x={centroid.x - labelWidth / 2}
		y={centroid.y - pillHeight / 2}
		width={labelWidth}
		height={pillHeight}
		rx={4 / scale}
		fill="hsla(0, 0%, 0%, 0.5)"
		class="pointer-events-none"
	/>
	<text
		x={centroid.x}
		y={centroid.y}
		text-anchor="middle"
		dominant-baseline="central"
		fill="hsla(0, 0%, 95%, 0.9)"
		font-size={labelFontSize}
		font-weight="500"
		class="pointer-events-none select-none"
	>
		{labelText}
	</text>

	<!-- Vertex handles and control point handles (shown when selected) -->
	{#if isSelected}
		<!-- Control point lines and handles (drawn first so vertex handles sit on top) -->
		{#each vertices as vertex, index}
			{#if vertex.cp1}
				<line
					x1={vertex.x} y1={vertex.y}
					x2={vertex.cp1.x} y2={vertex.cp1.y}
					stroke="hsla(210, 80%, 65%, 0.7)"
					stroke-width={cpLineWidth}
					stroke-dasharray={cpDashArray}
					class="pointer-events-none"
				/>
				<!-- cp1 hit area -->
				<circle
					cx={vertex.cp1.x} cy={vertex.cp1.y} r={hitAreaRadius}
					fill="transparent" class="cursor-crosshair touch-none"
					role="button" tabindex="-1"
					aria-label="Move curve handle cp1 for vertex {index + 1}"
					onpointerdown={(e) => handleCPPointerDown(index, 'cp1', e)}
					onpointermove={handleCPPointerMove}
					onpointerup={handleCPPointerUp}
				/>
				<!-- cp1 visible handle -->
				<circle
					cx={vertex.cp1.x} cy={vertex.cp1.y} r={cpHandleRadius}
					fill="hsla(210, 80%, 85%, 1)"
					stroke="rgb(59, 130, 246)"
					stroke-width={handleStrokeWidth}
					class="pointer-events-none"
				/>
			{/if}
			{#if vertex.cp2}
				<line
					x1={vertex.x} y1={vertex.y}
					x2={vertex.cp2.x} y2={vertex.cp2.y}
					stroke="hsla(210, 80%, 65%, 0.7)"
					stroke-width={cpLineWidth}
					stroke-dasharray={cpDashArray}
					class="pointer-events-none"
				/>
				<!-- cp2 hit area -->
				<circle
					cx={vertex.cp2.x} cy={vertex.cp2.y} r={hitAreaRadius}
					fill="transparent" class="cursor-crosshair touch-none"
					role="button" tabindex="-1"
					aria-label="Move curve handle cp2 for vertex {index + 1}"
					onpointerdown={(e) => handleCPPointerDown(index, 'cp2', e)}
					onpointermove={handleCPPointerMove}
					onpointerup={handleCPPointerUp}
				/>
				<!-- cp2 visible handle -->
				<circle
					cx={vertex.cp2.x} cy={vertex.cp2.y} r={cpHandleRadius}
					fill="hsla(210, 80%, 85%, 1)"
					stroke="rgb(59, 130, 246)"
					stroke-width={handleStrokeWidth}
					class="pointer-events-none"
				/>
			{/if}
		{/each}

		<!-- Vertex handles -->
		{#each vertices as vertex, index}
			<circle
				cx={vertex.x} cy={vertex.y} r={hitAreaRadius}
				fill="transparent" class="cursor-crosshair touch-none" role="button" tabindex="-1"
				aria-label="Move zone vertex {index + 1}"
				onpointerdown={(e) => handleVertexPointerDown(index, e)}
				onpointermove={handleVertexPointerMove}
				onpointerup={handleVertexPointerUp}
			/>
			<circle
				cx={vertex.x} cy={vertex.y} r={handleRadius}
				fill="white" stroke="rgb(59, 130, 246)" stroke-width={handleStrokeWidth}
				class="pointer-events-none"
			/>
		{/each}
	{/if}
</g>
