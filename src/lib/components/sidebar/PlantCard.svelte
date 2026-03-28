<script lang="ts">
	import type { PlantData } from '$lib/data/plants';
	import { formatHeight } from '$lib/utils/color';
	import { startPlantDrag, plantDragState } from '$lib/stores/plantDrag.svelte';

	interface Props {
		plant: PlantData;
		onClick?: () => void;
	}

	let { plant, onClick }: Props = $props();

	// Pre-commit drag detection state (before drag is committed to the store)
	let pending = $state(false);
	let pointerType = $state<string>('');
	let holdTimer = $state<ReturnType<typeof setTimeout> | null>(null);
	let startX = $state(0);
	let startY = $state(0);
	let holdReady = $state(false); // Visual feedback for touch hold
	let capturedTarget = $state<Element | null>(null);
	let capturedPointerId = $state<number>(0);

	const MOUSE_DRAG_THRESHOLD = 5;
	const TOUCH_HOLD_MS = 200;
	const TOUCH_CANCEL_DISTANCE = 10;

	function handlePointerDown(e: PointerEvent) {
		if (e.button !== 0 || !e.isPrimary) return;
		if (plantDragState.isDragging) return;

		e.preventDefault(); // Prevent text selection
		const target = e.currentTarget as Element;
		target.setPointerCapture(e.pointerId);
		capturedTarget = target;
		capturedPointerId = e.pointerId;

		pending = true;
		pointerType = e.pointerType;
		startX = e.clientX;
		startY = e.clientY;
		holdReady = false;

		if (e.pointerType === 'mouse') {
			// Mouse: drag commits on movement (handled in move listener)
		} else {
			// Touch/pen: require long-press before drag activates
			holdTimer = setTimeout(() => {
				holdReady = true;
				commitDrag(startX, startY);
			}, TOUCH_HOLD_MS);
		}
	}

	function handlePointerMove(e: PointerEvent) {
		if (!pending || !e.isPrimary) return;
		// Once committed, the page-level handlers take over
		if (plantDragState.isDragging) return;

		const dx = e.clientX - startX;
		const dy = e.clientY - startY;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (pointerType === 'mouse') {
			if (distance >= MOUSE_DRAG_THRESHOLD) {
				commitDrag(e.clientX, e.clientY);
			}
		} else {
			// Touch: if finger moves too much before hold completes, cancel (user is scrolling)
			if (distance >= TOUCH_CANCEL_DISTANCE && !holdReady) {
				cancelPending();
			}
		}
	}

	function handlePointerUp(e: PointerEvent) {
		if (!e.isPrimary) return;

		const wasPending = pending;
		const wasDragging = plantDragState.isDragging;
		cancelPending();

		// If we never committed a drag, treat as click
		if (wasPending && !wasDragging && onClick) {
			onClick();
		}
	}

	function commitDrag(clientX: number, clientY: number) {
		pending = false;
		clearHoldTimer();
		releaseCapture(); // Release so page-level handlers take over
		startPlantDrag(
			{
				flowerId: plant.id,
				flowerName: plant.name,
				spacingMin: plant.spacingMin,
				heightMax: plant.heightMax
			},
			clientX,
			clientY
		);
	}

	function cancelPending() {
		pending = false;
		holdReady = false;
		clearHoldTimer();
		releaseCapture();
	}

	function clearHoldTimer() {
		if (holdTimer) {
			clearTimeout(holdTimer);
			holdTimer = null;
		}
	}

	function releaseCapture() {
		if (capturedTarget && capturedPointerId) {
			try { capturedTarget.releasePointerCapture(capturedPointerId); } catch {}
		}
		capturedTarget = null;
		capturedPointerId = 0;
	}
</script>

<div
	class="group p-3 border border-border rounded-lg bg-card hover:border-primary/50 hover:bg-accent/50 cursor-grab active:cursor-grabbing transition-all {holdReady ? 'scale-[1.02] ring-2 ring-primary/40' : ''}"
	class:select-none={pending || plantDragState.isDragging}
	style="touch-action: {pending ? 'none' : 'pan-y'};"
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
	onpointercancel={() => cancelPending()}
	onkeydown={(e) => e.key === 'Enter' && onClick?.()}
	role="button"
	tabindex="0"
	data-tour="flower-{plant.id}"
>
	<div class="flex items-start justify-between gap-2">
		<div class="min-w-0">
			<h4 class="font-medium text-sm leading-tight">
				{plant.name}
				{#if plant.isUserPlant}
					<span class="ml-1.5 inline-flex px-1.5 py-0.5 text-[10px] font-medium bg-primary/15 text-primary rounded-full align-middle">Custom</span>
				{/if}
			</h4>
			<p class="text-xs text-muted-foreground italic">{plant.scientificName}</p>
		</div>
	</div>
	<div class="mt-2 pt-2 border-t border-border/50 flex justify-between text-xs text-muted-foreground">
		<span>
			<span class="text-foreground/70">Spacing</span> {plant.spacingMin}–{plant.spacingMax}"
		</span>
		<span>
			<span class="text-foreground/70">Height</span> {formatHeight(plant.heightMin)}–{formatHeight(plant.heightMax)}
		</span>
	</div>
</div>
