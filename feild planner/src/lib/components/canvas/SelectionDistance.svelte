<script lang="ts">
	import { fieldToCanvas, type CanvasState } from '$lib/utils/coordinates';
	import { formatDistance, type SelectionDistanceResult } from '$lib/utils/smartGuides';

	interface Props {
		distanceInfo: SelectionDistanceResult;
		canvasState: CanvasState;
		onDistanceChange: (newDistance: number) => void;
	}

	let { distanceInfo, canvasState, onDistanceChange }: Props = $props();

	// Convert field coordinates to canvas pixels
	const startPx = $derived(fieldToCanvas(distanceInfo.lineStart.x, distanceInfo.lineStart.y, canvasState));
	const endPx = $derived(fieldToCanvas(distanceInfo.lineEnd.x, distanceInfo.lineEnd.y, canvasState));

	// Input position (center of line)
	const inputX = $derived((startPx.x + endPx.x) / 2);
	const inputY = $derived((startPx.y + endPx.y) / 2);

	// Calculate perpendicular direction for end caps (works for any angle)
	const capSize = 8; // pixels
	const perpDir = $derived.by(() => {
		const dx = endPx.x - startPx.x;
		const dy = endPx.y - startPx.y;
		const len = Math.sqrt(dx * dx + dy * dy);
		if (len === 0) return { x: 0, y: 1 };
		// Perpendicular is (-dy, dx) normalized
		return { x: -dy / len, y: dx / len };
	});

	// Local state for input
	let inputValue = $state('');
	let isEditing = $state(false);

	// Sync input value when distance changes
	$effect(() => {
		if (!isEditing) {
			inputValue = formatDistance(distanceInfo.distance);
		}
	});

	// Line styling
	const lineColor = '#3b82f6'; // Blue
	const lineWidth = 2;

	// Parse user input and apply distance change
	function handleInputChange() {
		isEditing = false;
		const parsed = parseDistanceInput(inputValue);
		if (parsed !== null && parsed !== distanceInfo.distance) {
			onDistanceChange(parsed);
		} else {
			// Reset to current value if invalid
			inputValue = formatDistance(distanceInfo.distance);
		}
	}

	function handleInputFocus() {
		isEditing = true;
		// Convert to just inches for easier editing
		inputValue = distanceInfo.distance.toFixed(0);
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleInputChange();
			(e.target as HTMLInputElement).blur();
		} else if (e.key === 'Escape') {
			isEditing = false;
			inputValue = formatDistance(distanceInfo.distance);
			(e.target as HTMLInputElement).blur();
		}
	}

	/**
	 * Parse distance input - accepts formats like:
	 * - "24" or "24in" or "24"" -> 24 inches
	 * - "2'" or "2ft" -> 24 inches
	 * - "2' 6"" or "2ft 6in" -> 30 inches
	 */
	function parseDistanceInput(input: string): number | null {
		const trimmed = input.trim().toLowerCase();
		if (!trimmed) return null;

		// Try feet and inches: 2' 6" or 2ft 6in
		const feetInchesMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(?:'|ft|feet)\s*(\d+(?:\.\d+)?)\s*(?:"|in|inches?)?$/);
		if (feetInchesMatch) {
			const feet = parseFloat(feetInchesMatch[1]);
			const inches = parseFloat(feetInchesMatch[2]);
			return feet * 12 + inches;
		}

		// Try just feet: 2' or 2ft
		const feetMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(?:'|ft|feet)$/);
		if (feetMatch) {
			return parseFloat(feetMatch[1]) * 12;
		}

		// Try just inches: 24 or 24" or 24in
		const inchesMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(?:"|in|inches?)?$/);
		if (inchesMatch) {
			return parseFloat(inchesMatch[1]);
		}

		return null;
	}
</script>

<!-- Distance measurement line with end caps -->
<g class="selection-distance pointer-events-none">
	<!-- Main line -->
	<line
		x1={startPx.x}
		y1={startPx.y}
		x2={endPx.x}
		y2={endPx.y}
		stroke={lineColor}
		stroke-width={lineWidth}
	/>

	<!-- End caps (perpendicular to line direction) -->
	<line
		x1={startPx.x - perpDir.x * capSize}
		y1={startPx.y - perpDir.y * capSize}
		x2={startPx.x + perpDir.x * capSize}
		y2={startPx.y + perpDir.y * capSize}
		stroke={lineColor}
		stroke-width={lineWidth}
	/>
	<line
		x1={endPx.x - perpDir.x * capSize}
		y1={endPx.y - perpDir.y * capSize}
		x2={endPx.x + perpDir.x * capSize}
		y2={endPx.y + perpDir.y * capSize}
		stroke={lineColor}
		stroke-width={lineWidth}
	/>
</g>

<!-- Input overlay (using foreignObject for HTML input inside SVG) -->
<foreignObject
	x={inputX - 40}
	y={inputY - 14}
	width="80"
	height="28"
	class="pointer-events-auto"
>
	<!-- eslint-disable-next-line svelte/no-static-element-interactions -->
	<div
		class="flex items-center justify-center h-full"
		onpointerdown={(e) => e.stopPropagation()}
		onclick={(e) => e.stopPropagation()}
	>
		<input
			type="text"
			bind:value={inputValue}
			onfocus={handleInputFocus}
			onblur={handleInputChange}
			onkeydown={handleKeyDown}
			class="w-16 px-2 py-1 text-xs font-medium text-center bg-white border-2 border-blue-500 rounded shadow-md focus:outline-none focus:ring-2 focus:ring-blue-300"
			style="font-size: 12px;"
		/>
	</div>
</foreignObject>
