<script lang="ts">
	import type { Bed, GardenSettings, PlantingDates } from '$lib/types';
	import type { TimelineViewScale } from '$lib/stores/timeline.svelte';
	import { groupEntriesByBed, parseDate, formatDateISO, type TimelineEntry } from '$lib/utils/timeline';
	import { timelineState, setCurrentViewDate } from '$lib/stores/timeline.svelte';

	interface Props {
		entries: TimelineEntry[];
		beds: Bed[];
		gardenSettings: GardenSettings;
		viewYear: number;
		viewScale: TimelineViewScale;
		onUpdatePlantDates?: (plantId: string, dates: PlantingDates) => void;
	}

	let { entries, beds, gardenSettings, viewYear, viewScale, onUpdatePlantDates }: Props = $props();

	// Scrubber drag state
	let isDraggingScrubber = $state(false);

	// Entry drag state
	let draggingEntryId = $state<string | null>(null);
	let dragStartEntryX = $state(0);

	// Constants for rendering
	const ROW_HEIGHT = 32;
	const BED_HEADER_HEIGHT = 28;
	const HEADER_HEIGHT = 40;
	const LEFT_LABEL_WIDTH = 140;

	// Calculate time range for the view
	const timeRange = $derived.by(() => {
		const startOfYear = new Date(viewYear, 0, 1);
		const endOfYear = new Date(viewYear, 11, 31);
		return { start: startOfYear, end: endOfYear };
	});

	// Days in the year
	const totalDays = $derived.by(() => {
		const { start, end } = timeRange;
		return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
	});

	// Generate month markers
	const monthMarkers = $derived.by(() => {
		const markers: { month: number; name: string; dayOffset: number }[] = [];
		for (let m = 0; m < 12; m++) {
			const monthStart = new Date(viewYear, m, 1);
			const dayOffset = Math.floor(
				(monthStart.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24)
			);
			markers.push({
				month: m,
				name: monthStart.toLocaleDateString('en-US', { month: 'short' }),
				dayOffset
			});
		}
		return markers;
	});

	// Parse frost dates
	const frostDates = $derived.by(() => {
		const last = parseDate(gardenSettings.lastFrostDate);
		const first = parseDate(gardenSettings.firstFrostDate);
		return {
			lastFrost: last,
			firstFrost: first,
			lastFrostDay: last
				? Math.floor((last.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24))
				: null,
			firstFrostDay: first
				? Math.floor((first.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24))
				: null
		};
	});

	// Group entries by bed
	const groupedEntries = $derived(groupEntriesByBed(entries));

	// Calculate total content height
	const contentHeight = $derived.by(() => {
		let height = 0;
		for (const group of groupedEntries.values()) {
			height += BED_HEADER_HEIGHT + group.entries.length * ROW_HEIGHT;
		}
		return Math.max(height, 100);
	});

	// Calculate SVG width based on view scale
	const dayWidth = $derived.by(() => {
		switch (viewScale) {
			case 'week':
				return 20;
			case 'month':
				return 3;
			case 'season':
				return 1.5;
			default:
				return 3;
		}
	});

	const chartWidth = $derived(totalDays * dayWidth);

	// Convert a date to X position
	function dateToX(date: Date): number {
		const days = (date.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24);
		return days * dayWidth;
	}

	// Convert X position to date
	function xToDate(x: number): Date {
		const days = x / dayWidth;
		const date = new Date(timeRange.start);
		date.setDate(date.getDate() + Math.round(days));
		return date;
	}

	// Calculate scrubber X position from currentViewDate
	const scrubberX = $derived.by(() => {
		const currentDate = new Date(timelineState.currentViewDate + 'T12:00:00');
		return dateToX(currentDate);
	});

	// Scrubber drag handlers
	function handleScrubberMouseDown(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDraggingScrubber = true;
		document.addEventListener('mousemove', handleScrubberDrag);
		document.addEventListener('mouseup', handleScrubberMouseUp);
	}

	function handleScrubberDrag(e: MouseEvent) {
		if (!isDraggingScrubber || !scrollContainer) return;

		const rect = scrollContainer.getBoundingClientRect();
		const scrollLeft = scrollContainer.scrollLeft;
		const x = e.clientX - rect.left + scrollLeft;

		// Clamp to valid range
		const clampedX = Math.max(0, Math.min(chartWidth, x));
		const newDate = xToDate(clampedX);

		// Update the current view date
		setCurrentViewDate(newDate);
	}

	function handleScrubberMouseUp() {
		isDraggingScrubber = false;
		document.removeEventListener('mousemove', handleScrubberDrag);
		document.removeEventListener('mouseup', handleScrubberMouseUp);
	}

	// Entry drag handlers
	function handleEntryMouseDown(e: MouseEvent, entry: TimelineEntry) {
		if (entry.type !== 'placed' || !onUpdatePlantDates) return;

		e.preventDefault();
		e.stopPropagation();
		draggingEntryId = entry.id;
		dragStartEntryX = e.clientX;
		document.addEventListener('mousemove', handleEntryDrag);
		document.addEventListener('mouseup', handleEntryMouseUp);
	}

	function handleEntryDrag(e: MouseEvent) {
		if (!draggingEntryId || !scrollContainer || !onUpdatePlantDates) return;

		const entry = entries.find((en) => en.id === draggingEntryId);
		if (!entry || entry.type !== 'placed') return;

		const deltaX = e.clientX - dragStartEntryX;
		const deltaDays = Math.round(deltaX / dayWidth);

		if (deltaDays === 0) return;

		// Calculate new dates by shifting the start date
		const newDates: PlantingDates = { ...entry.plantingDates };

		if (entry.plantingDates.indoorStartDate) {
			const oldDate = new Date(entry.plantingDates.indoorStartDate + 'T12:00:00');
			oldDate.setDate(oldDate.getDate() + deltaDays);
			newDates.indoorStartDate = formatDateISO(oldDate);
		}

		if (entry.plantingDates.directSowDate) {
			const oldDate = new Date(entry.plantingDates.directSowDate + 'T12:00:00');
			oldDate.setDate(oldDate.getDate() + deltaDays);
			newDates.directSowDate = formatDateISO(oldDate);
		}

		if (entry.plantingDates.transplantDate) {
			const oldDate = new Date(entry.plantingDates.transplantDate + 'T12:00:00');
			oldDate.setDate(oldDate.getDate() + deltaDays);
			newDates.transplantDate = formatDateISO(oldDate);
		}

		// Update the start position for smooth dragging
		dragStartEntryX = e.clientX;

		// Call the update handler
		onUpdatePlantDates(draggingEntryId, newDates);
	}

	function handleEntryMouseUp() {
		draggingEntryId = null;
		document.removeEventListener('mousemove', handleEntryDrag);
		document.removeEventListener('mouseup', handleEntryMouseUp);
	}

	// Build flat list of rows with their Y positions
	const rowData = $derived.by(() => {
		const rows: {
			type: 'bed-header' | 'plant';
			bedId: string;
			bedName: string;
			entry?: TimelineEntry;
			y: number;
		}[] = [];

		let currentY = 0;
		for (const [bedId, group] of groupedEntries) {
			// Bed header row
			rows.push({
				type: 'bed-header',
				bedId,
				bedName: group.bedName,
				y: currentY
			});
			currentY += BED_HEADER_HEIGHT;

			// Plant rows
			for (const entry of group.entries) {
				rows.push({
					type: 'plant',
					bedId,
					bedName: group.bedName,
					entry,
					y: currentY
				});
				currentY += ROW_HEIGHT;
			}
		}

		return rows;
	});

	// Scroll container reference for horizontal scrolling
	let scrollContainer: HTMLDivElement;
</script>

<div class="h-full flex">
	<!-- Fixed left labels -->
	<div
		class="flex-shrink-0 border-r border-border bg-card overflow-hidden"
		style="width: {LEFT_LABEL_WIDTH}px"
	>
		<!-- Header spacer -->
		<div class="h-10 border-b border-border bg-muted/30 flex items-center px-3">
			<span class="text-xs font-medium text-muted-foreground">Plant / Bed</span>
		</div>

		<!-- Labels -->
		<div class="overflow-y-auto" style="height: calc(100% - 40px)">
			{#each rowData as row, i}
				{#if row.type === 'bed-header'}
					<div
						class="flex items-center px-3 pt-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase border-t border-border/40"
						class:border-t-0={i === 0}
						style="height: {BED_HEADER_HEIGHT}px"
					>
						{row.bedName}
					</div>
				{:else if row.entry}
					<div
						class="flex items-center px-3 pl-5 text-sm truncate"
						style="height: {ROW_HEIGHT}px"
						title={row.entry.flowerName}
					>
						<span class="truncate">
							{row.entry.flowerName}
							{#if row.entry.successionIndex !== undefined}
								<span class="text-xs text-muted-foreground ml-1">
									#{row.entry.successionIndex + 1}
								</span>
							{/if}
						</span>
						{#if row.entry.type === 'planned'}
							<span class="ml-1 text-xs text-amber-600 bg-amber-100 px-1 rounded">planned</span>
						{/if}
					</div>
				{/if}
			{/each}
		</div>
	</div>

	<!-- Scrollable chart area -->
	<div class="flex-1 overflow-x-auto overflow-y-auto" bind:this={scrollContainer}>
		<svg
			width={chartWidth}
			height={contentHeight + HEADER_HEIGHT}
			class="block"
		>
			<!-- Month headers -->
			<g class="month-headers">
				{#each monthMarkers as marker, i}
					{@const nextMarker = monthMarkers[i + 1]}
					{@const width = nextMarker
						? (nextMarker.dayOffset - marker.dayOffset) * dayWidth
						: (totalDays - marker.dayOffset) * dayWidth}

					<!-- Month column background (full height) -->
					<rect
						x={marker.dayOffset * dayWidth}
						y={0}
						width={width}
						height={contentHeight + HEADER_HEIGHT}
						fill={i % 2 === 0 ? 'oklch(0.97 0.015 75)' : 'transparent'}
					/>

					<!-- Month label -->
					<text
						x={marker.dayOffset * dayWidth + width / 2}
						y={HEADER_HEIGHT / 2 + 4}
						text-anchor="middle"
						class="text-xs fill-muted-foreground"
					>
						{marker.name}
					</text>

					<!-- Month separator line -->
					<line
						x1={marker.dayOffset * dayWidth}
						y1={0}
						x2={marker.dayOffset * dayWidth}
						y2={contentHeight + HEADER_HEIGHT}
						stroke="hsl(var(--border))"
						stroke-width="1"
					/>
				{/each}
			</g>

			<!-- Frost date lines -->
			{#if frostDates.lastFrostDay !== null}
				<line
					x1={frostDates.lastFrostDay * dayWidth}
					y1={HEADER_HEIGHT}
					x2={frostDates.lastFrostDay * dayWidth}
					y2={contentHeight + HEADER_HEIGHT}
					stroke="hsl(210 100% 50%)"
					stroke-width="2"
					stroke-dasharray="6 4"
				/>
				<text
					x={frostDates.lastFrostDay * dayWidth + 4}
					y={HEADER_HEIGHT + 14}
					class="text-xs fill-blue-500 font-medium"
				>
					Last Frost
				</text>
			{/if}

			{#if frostDates.firstFrostDay !== null}
				<line
					x1={frostDates.firstFrostDay * dayWidth}
					y1={HEADER_HEIGHT}
					x2={frostDates.firstFrostDay * dayWidth}
					y2={contentHeight + HEADER_HEIGHT}
					stroke="hsl(210 100% 50%)"
					stroke-width="2"
					stroke-dasharray="6 4"
				/>
				<text
					x={frostDates.firstFrostDay * dayWidth + 4}
					y={HEADER_HEIGHT + 14}
					class="text-xs fill-blue-500 font-medium"
				>
					First Frost
				</text>
			{/if}

			<!-- Plant rows -->
			<g class="plant-rows" transform="translate(0, {HEADER_HEIGHT})">
				{#each rowData as row, rowIdx}
					{#if row.type === 'bed-header'}
						<!-- Subtle separator line between bed groups -->
						{#if rowIdx > 0}
							<line
								x1={0}
								y1={row.y}
								x2={chartWidth}
								y2={row.y}
								stroke="hsl(var(--border) / 0.3)"
								stroke-width="1"
							/>
						{/if}
					{:else if row.entry}
						<!-- Row background -->
						<rect
							x={0}
							y={row.y}
							width={chartWidth}
							height={ROW_HEIGHT}
							fill="transparent"
							class="hover:fill-accent/30"
						/>

						<!-- Phase bars (draggable group for placed plants) -->
						<g
							class={row.entry.type === 'placed' && onUpdatePlantDates ? 'cursor-grab active:cursor-grabbing' : ''}
							onmousedown={(e) => handleEntryMouseDown(e, row.entry!)}
							style={draggingEntryId === row.entry.id ? 'opacity: 0.7;' : ''}
						>
							{#each row.entry.phases as phase}
								{@const startX = dateToX(phase.startDate)}
								{@const endX = dateToX(phase.endDate)}
								{@const barWidth = Math.max(endX - startX, 4)}

								<rect
									x={startX}
									y={row.y + 6}
									width={barWidth}
									height={ROW_HEIGHT - 12}
									fill={phase.color}
									rx="3"
									ry="3"
									class="hover:opacity-80"
								>
									<title>{phase.label}: {phase.startDate.toLocaleDateString()} - {phase.endDate.toLocaleDateString()}</title>
								</rect>
							{/each}
						</g>
					{/if}
				{/each}
			</g>

			<!-- Current date scrubber -->
			<g class="scrubber" transform="translate({scrubberX}, 0)">
				<!-- Vertical line -->
				<line
					x1={0}
					y1={0}
					x2={0}
					y2={contentHeight + HEADER_HEIGHT}
					stroke="hsl(24 95% 53%)"
					stroke-width="2"
					class="pointer-events-none"
				/>

				<!-- Draggable handle at top -->
				<g
					class="cursor-ew-resize"
					role="slider"
					tabindex="0"
					aria-label="Timeline scrubber - drag to change current view date"
					aria-valuenow={new Date(timelineState.currentViewDate).getTime()}
					onmousedown={handleScrubberMouseDown}
				>
					<!-- Handle background -->
					<rect
						x={-12}
						y={0}
						width={24}
						height={HEADER_HEIGHT}
						fill="hsl(24 95% 53%)"
						rx="4"
						ry="4"
						class="opacity-90 hover:opacity-100"
					/>
					<!-- Handle grip lines -->
					<line x1={-4} y1={12} x2={-4} y2={28} stroke="white" stroke-width="1.5" opacity="0.7" />
					<line x1={0} y1={12} x2={0} y2={28} stroke="white" stroke-width="1.5" opacity="0.7" />
					<line x1={4} y1={12} x2={4} y2={28} stroke="white" stroke-width="1.5" opacity="0.7" />
					<!-- Date label -->
					<text
						x={0}
						y={-6}
						text-anchor="middle"
						class="text-xs fill-orange-500 font-semibold"
						style="pointer-events: none"
					>
						{new Date(timelineState.currentViewDate + 'T12:00:00').toLocaleDateString('en-US', {
							month: 'short',
							day: 'numeric'
						})}
					</text>
				</g>
			</g>
		</svg>
	</div>
</div>
