<script lang="ts">
	import type { AlignmentGuide, DistanceIndicator, DiagonalGuide } from '$lib/utils/smartGuides';
	import { formatDistance } from '$lib/utils/smartGuides';
	import { fieldToCanvas, type CanvasState } from '$lib/utils/coordinates';

	interface Props {
		guides: AlignmentGuide[];
		diagonalGuides: DiagonalGuide[];
		distances: DistanceIndicator[];
		canvasState: CanvasState;
		viewportWidth: number;
		viewportHeight: number;
	}

	let { guides, diagonalGuides, distances, canvasState, viewportWidth, viewportHeight }: Props = $props();

	// Guide line styling
	const guideColor = '#f472b6'; // Pink
	const guideWidth = 1;
	const guideDash = '4 4';

	// Distance label styling
	const labelBg = 'white';
	const labelColor = '#1f2937';
	const labelPadding = 4;
	const labelFontSize = 11;
</script>

<!-- Axis-Aligned Guide Lines -->
{#each guides as guide (guide.type + guide.position)}
	{#if guide.type === 'vertical'}
		{@const canvasX = fieldToCanvas(guide.position, 0, canvasState).x}
		<line
			x1={canvasX}
			y1={0}
			x2={canvasX}
			y2={viewportHeight}
			stroke={guideColor}
			stroke-width={guideWidth}
			stroke-dasharray={guideDash}
			class="pointer-events-none"
		/>
	{:else}
		{@const canvasY = fieldToCanvas(0, guide.position, canvasState).y}
		<line
			x1={0}
			y1={canvasY}
			x2={viewportWidth}
			y2={canvasY}
			stroke={guideColor}
			stroke-width={guideWidth}
			stroke-dasharray={guideDash}
			class="pointer-events-none"
		/>
	{/if}
{/each}

<!-- Diagonal Guide Lines (for rotated bed alignment) -->
{#each diagonalGuides as diag, i (diag.angle + diag.start.x + diag.start.y + i)}
	{@const startCanvas = fieldToCanvas(diag.start.x, diag.start.y, canvasState)}
	{@const endCanvas = fieldToCanvas(diag.end.x, diag.end.y, canvasState)}
	<line
		x1={startCanvas.x}
		y1={startCanvas.y}
		x2={endCanvas.x}
		y2={endCanvas.y}
		stroke={guideColor}
		stroke-width={guideWidth}
		stroke-dasharray={guideDash}
		class="pointer-events-none"
	/>
{/each}

<!-- Distance Indicators -->
{#each distances as dist, i (dist.axis + dist.from + dist.to + i)}
	{@const formattedDist = formatDistance(dist.distance)}
	{#if dist.axis === 'x'}
		<!-- Horizontal distance (gap between objects side by side) -->
		{@const startX = fieldToCanvas(dist.from, 0, canvasState).x}
		{@const endX = fieldToCanvas(dist.to, 0, canvasState).x}
		{@const labelY = fieldToCanvas(0, dist.labelPosition, canvasState).y}
		{@const midX = (startX + endX) / 2}

		<!-- Distance line -->
		<line
			x1={startX}
			y1={labelY}
			x2={endX}
			y2={labelY}
			stroke={guideColor}
			stroke-width={1}
			class="pointer-events-none"
		/>
		<!-- End caps -->
		<line
			x1={startX}
			y1={labelY - 4}
			x2={startX}
			y2={labelY + 4}
			stroke={guideColor}
			stroke-width={1}
			class="pointer-events-none"
		/>
		<line
			x1={endX}
			y1={labelY - 4}
			x2={endX}
			y2={labelY + 4}
			stroke={guideColor}
			stroke-width={1}
			class="pointer-events-none"
		/>
		<!-- Label background -->
		<rect
			x={midX - 20}
			y={labelY - labelFontSize / 2 - labelPadding}
			width={40}
			height={labelFontSize + labelPadding * 2}
			rx={4}
			fill={labelBg}
			stroke={guideColor}
			stroke-width={1}
			class="pointer-events-none"
		/>
		<!-- Label text -->
		<text
			x={midX}
			y={labelY + labelFontSize / 3}
			text-anchor="middle"
			fill={labelColor}
			font-size={labelFontSize}
			font-weight="500"
			class="pointer-events-none"
		>
			{formattedDist}
		</text>
	{:else}
		<!-- Vertical distance (gap between objects stacked) -->
		{@const startY = fieldToCanvas(0, dist.from, canvasState).y}
		{@const endY = fieldToCanvas(0, dist.to, canvasState).y}
		{@const labelX = fieldToCanvas(dist.labelPosition, 0, canvasState).x}
		{@const midY = (startY + endY) / 2}

		<!-- Distance line -->
		<line
			x1={labelX}
			y1={startY}
			x2={labelX}
			y2={endY}
			stroke={guideColor}
			stroke-width={1}
			class="pointer-events-none"
		/>
		<!-- End caps -->
		<line
			x1={labelX - 4}
			y1={startY}
			x2={labelX + 4}
			y2={startY}
			stroke={guideColor}
			stroke-width={1}
			class="pointer-events-none"
		/>
		<line
			x1={labelX - 4}
			y1={endY}
			x2={labelX + 4}
			y2={endY}
			stroke={guideColor}
			stroke-width={1}
			class="pointer-events-none"
		/>
		<!-- Label background -->
		<rect
			x={labelX + 6}
			y={midY - labelFontSize / 2 - labelPadding}
			width={40}
			height={labelFontSize + labelPadding * 2}
			rx={4}
			fill={labelBg}
			stroke={guideColor}
			stroke-width={1}
			class="pointer-events-none"
		/>
		<!-- Label text -->
		<text
			x={labelX + 26}
			y={midY + labelFontSize / 3}
			text-anchor="middle"
			fill={labelColor}
			font-size={labelFontSize}
			font-weight="500"
			class="pointer-events-none"
		>
			{formattedDist}
		</text>
	{/if}
{/each}
