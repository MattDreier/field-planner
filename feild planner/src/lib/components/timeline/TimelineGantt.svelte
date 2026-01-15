<script lang="ts">
	import type { Bed, GardenSettings, PlantingDates } from '$lib/types';
	import type { TimelineViewScale } from '$lib/stores/timeline.svelte';
	import { groupEntriesByBed, parseDate, formatDateISO, type TimelineEntry } from '$lib/utils/timeline';
	import { timelineState, setCurrentViewDate, setViewYear } from '$lib/stores/timeline.svelte';

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

	// Container width tracking for dynamic sizing
	let containerWidth = $state(800);

	// Constants for rendering
	const ROW_HEIGHT = 32;
	const BED_HEADER_HEIGHT = 28;
	const HEADER_HEIGHT = 40;
	const LEFT_LABEL_WIDTH = 140;

	// Season view: number of years to render (current + future years for infinite scroll)
	const SEASON_YEARS_COUNT = 5;

	// Calculate time range for the view (may span multiple years in season view)
	const timeRange = $derived.by(() => {
		if (viewScale === 'season') {
			// Season view spans multiple years for infinite scroll effect
			const startOfYear = new Date(viewYear, 0, 1);
			const endOfRange = new Date(viewYear + SEASON_YEARS_COUNT - 1, 11, 31);
			return { start: startOfYear, end: endOfRange };
		}
		const startOfYear = new Date(viewYear, 0, 1);
		const endOfYear = new Date(viewYear, 11, 31);
		return { start: startOfYear, end: endOfYear };
	});

	// Total days in the view range
	const totalDays = $derived.by(() => {
		const { start, end } = timeRange;
		return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
	});

	// Generate month markers (handles multi-year for season view)
	const monthMarkers = $derived.by(() => {
		const markers: { month: number; year: number; name: string; dayOffset: number; isYearStart: boolean }[] = [];
		const yearsToRender = viewScale === 'season' ? SEASON_YEARS_COUNT : 1;

		for (let y = 0; y < yearsToRender; y++) {
			const year = viewYear + y;
			for (let m = 0; m < 12; m++) {
				const monthStart = new Date(year, m, 1);
				const dayOffset = Math.floor(
					(monthStart.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24)
				);
				markers.push({
					month: m,
					year,
					name: monthStart.toLocaleDateString('en-US', { month: 'short' }),
					dayOffset,
					isYearStart: m === 0
				});
			}
		}
		return markers;
	});

	// Generate week markers for week view grid lines
	const weekMarkers = $derived.by(() => {
		if (viewScale !== 'week') return [];

		const markers: { dayOffset: number; weekNum: number }[] = [];
		// Find first Sunday of the year (or adjust to Monday if preferred)
		const firstDay = new Date(timeRange.start);
		const dayOfWeek = firstDay.getDay(); // 0 = Sunday
		const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;

		let currentOffset = daysUntilSunday;
		let weekNum = 1;

		while (currentOffset < totalDays) {
			markers.push({ dayOffset: currentOffset, weekNum });
			currentOffset += 7;
			weekNum++;
		}
		return markers;
	});

	// Generate day markers for day view
	const dayMarkers = $derived.by(() => {
		if (viewScale !== 'day') return [];

		const markers: { dayOffset: number; dayNum: number; dayName: string; isWeekend: boolean }[] = [];
		for (let d = 0; d < totalDays; d++) {
			const date = new Date(timeRange.start);
			date.setDate(date.getDate() + d);
			const dayOfWeek = date.getDay();
			markers.push({
				dayOffset: d,
				dayNum: date.getDate(),
				dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
				isWeekend: dayOfWeek === 0 || dayOfWeek === 6
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
	// Month view: dynamically sized to fit the full year without scrolling
	// Other views: fixed pixels per day
	const dayWidth = $derived.by(() => {
		switch (viewScale) {
			case 'day':
				return 40; // Very detailed - 40px per day
			case 'week':
				return 20; // Detailed - 20px per day
			case 'month':
				// Dynamic: fit full year in container width
				// totalDays is ~365, containerWidth is available space
				return Math.max(containerWidth / 365, 2); // Minimum 2px per day
			case 'season':
				return 1.5; // Compact - 1.5px per day
			default:
				return 3;
		}
	});

	const chartWidth = $derived.by(() => {
		if (viewScale === 'month') {
			// Month view: exactly fit the container
			return containerWidth;
		}
		return totalDays * dayWidth;
	});

	// Convert a date to X position
	function dateToX(date: Date): number {
		const days = (date.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24);
		return days * dayWidth;
	}

	// Convert X position to date (clamped to visible time range)
	function xToDate(x: number): Date {
		const days = Math.max(0, Math.min(totalDays - 1, x / dayWidth));
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
		// In season view, skip auto-updating viewYear to prevent feedback loop
		setCurrentViewDate(newDate, viewScale === 'season');
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

	// Track container width for dynamic month view sizing
	$effect(() => {
		if (!scrollContainer) return;

		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				containerWidth = entry.contentRect.width;
			}
		});

		resizeObserver.observe(scrollContainer);
		return () => resizeObserver.disconnect();
	});

	// Season view: handle infinite scroll by updating viewYear when scrolling far right
	function handleScroll(e: Event) {
		if (viewScale !== 'season') return;

		const target = e.target as HTMLDivElement;
		const scrollRight = target.scrollWidth - target.scrollLeft - target.clientWidth;

		// When user scrolls near the right edge, load more years
		if (scrollRight < 500 && target.scrollLeft > 100) {
			// Could extend the range here - for now we just have 5 years
		}
	}
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
							<span class="ml-1 text-xs text-amber-500 bg-amber-500/20 px-1 rounded">planned</span>
						{/if}
					</div>
				{/if}
			{/each}
		</div>
	</div>

	<!-- Scrollable chart area -->
	<div
		class="flex-1 overflow-x-auto overflow-y-auto"
		class:overflow-x-hidden={viewScale === 'month'}
		bind:this={scrollContainer}
		onscroll={handleScroll}
	>
		<svg
			width={chartWidth}
			height={contentHeight + HEADER_HEIGHT}
			class="block"
		>
			<!-- Day view: day column backgrounds -->
			{#if viewScale === 'day'}
				<g class="day-backgrounds">
					{#each dayMarkers as marker}
						<rect
							x={marker.dayOffset * dayWidth}
							y={0}
							width={dayWidth}
							height={contentHeight + HEADER_HEIGHT}
							style={marker.isWeekend ? 'fill: var(--color-muted)' : 'fill: transparent'}
						/>
					{/each}
				</g>
			{/if}

			<!-- Month headers -->
			<g class="month-headers">
				{#each monthMarkers as marker, i}
					{@const nextMarker = monthMarkers[i + 1]}
					{@const width = nextMarker
						? (nextMarker.dayOffset - marker.dayOffset) * dayWidth
						: (totalDays - marker.dayOffset) * dayWidth}

					<!-- Month column background (full height) - not in day view -->
					{#if viewScale !== 'day'}
						<rect
							x={marker.dayOffset * dayWidth}
							y={0}
							width={width}
							height={contentHeight + HEADER_HEIGHT}
							style={marker.month % 2 === 0 ? 'fill: var(--color-muted)' : 'fill: transparent'}
						/>
					{/if}

					<!-- Year marker for season view -->
					{#if viewScale === 'season' && marker.isYearStart}
						<rect
							x={marker.dayOffset * dayWidth}
							y={0}
							width={width * 12}
							height={HEADER_HEIGHT}
							style="fill: var(--color-accent)"
							class="opacity-30"
						/>
						<text
							x={marker.dayOffset * dayWidth + 8}
							y={14}
							class="text-sm font-bold fill-blue-600"
						>
							{marker.year}
						</text>
					{/if}

					<!-- Month label -->
					{#if viewScale === 'season'}
						<!-- In season view, show month below year -->
						<text
							x={marker.dayOffset * dayWidth + width / 2}
							y={HEADER_HEIGHT / 2 + 8}
							text-anchor="middle"
							class="text-xs fill-muted-foreground"
						>
							{marker.name}
						</text>
					{:else if viewScale === 'day'}
						<!-- In day view, month labels at top -->
						{#if i === 0 || marker.month !== monthMarkers[i - 1]?.month}
							<text
								x={marker.dayOffset * dayWidth + 4}
								y={12}
								class="text-xs font-medium fill-muted-foreground"
							>
								{marker.name} {marker.year}
							</text>
						{/if}
					{:else}
						<text
							x={marker.dayOffset * dayWidth + width / 2}
							y={HEADER_HEIGHT / 2 + 4}
							text-anchor="middle"
							class="text-xs fill-muted-foreground"
						>
							{marker.name}
						</text>
					{/if}

					<!-- Month separator line -->
					<line
						x1={marker.dayOffset * dayWidth}
						y1={0}
						x2={marker.dayOffset * dayWidth}
						y2={contentHeight + HEADER_HEIGHT}
						stroke={marker.isYearStart && viewScale === 'season' ? 'hsl(220 80% 50%)' : 'hsl(var(--border))'}
						stroke-width={marker.isYearStart && viewScale === 'season' ? 2 : 1}
					/>
				{/each}
			</g>

			<!-- Week grid lines (week view only) -->
			{#if viewScale === 'week'}
				<g class="week-grid">
					{#each weekMarkers as marker}
						<line
							x1={marker.dayOffset * dayWidth}
							y1={HEADER_HEIGHT}
							x2={marker.dayOffset * dayWidth}
							y2={contentHeight + HEADER_HEIGHT}
							stroke="hsl(var(--border) / 0.5)"
							stroke-width="1"
							stroke-dasharray="4 4"
						/>
					{/each}
				</g>
			{/if}

			<!-- Day grid lines and labels (day view only) -->
			{#if viewScale === 'day'}
				<g class="day-grid">
					{#each dayMarkers as marker}
						<!-- Day separator line -->
						<line
							x1={marker.dayOffset * dayWidth}
							y1={HEADER_HEIGHT}
							x2={marker.dayOffset * dayWidth}
							y2={contentHeight + HEADER_HEIGHT}
							stroke="hsl(var(--border) / 0.3)"
							stroke-width="1"
						/>
						<!-- Day number in header -->
						<text
							x={marker.dayOffset * dayWidth + dayWidth / 2}
							y={HEADER_HEIGHT - 8}
							text-anchor="middle"
							class="text-xs fill-muted-foreground"
							class:fill-blue-500={marker.isWeekend}
						>
							{marker.dayNum}
						</text>
						<!-- Day name abbreviation -->
						<text
							x={marker.dayOffset * dayWidth + dayWidth / 2}
							y={HEADER_HEIGHT - 20}
							text-anchor="middle"
							class="text-[10px] fill-muted-foreground/70"
						>
							{marker.dayName.charAt(0)}
						</text>
					{/each}
				</g>
			{/if}

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
