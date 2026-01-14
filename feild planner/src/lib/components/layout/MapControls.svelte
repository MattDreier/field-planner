<script lang="ts">
	/**
	 * Google Maps style compass and zoom controls overlay.
	 * Fixed position over the canvas, doesn't move with pan.
	 */

	interface Props {
		zoom: number;
		onZoomIn: () => void;
		onZoomOut: () => void;
		onReset: () => void;
		showCompass?: boolean;
	}

	let { zoom, onZoomIn, onZoomOut, onReset, showCompass = true }: Props = $props();

	const zoomPercent = $derived(Math.round(zoom * 100));

	// Zoom percentage visibility state
	let showZoomPercent = $state(false);
	let hideTimeout: ReturnType<typeof setTimeout> | null = null;

	function showPercentage() {
		showZoomPercent = true;
		if (hideTimeout) clearTimeout(hideTimeout);
		hideTimeout = setTimeout(() => {
			showZoomPercent = false;
		}, 1500);
	}

	function handleZoomIn() {
		showPercentage();
		onZoomIn();
	}

	function handleZoomOut() {
		showPercentage();
		onZoomOut();
	}

	function handleMouseEnter() {
		showZoomPercent = true;
		if (hideTimeout) clearTimeout(hideTimeout);
	}

	function handleMouseLeave() {
		hideTimeout = setTimeout(() => {
			showZoomPercent = false;
		}, 800);
	}

	// Show percentage briefly when zoom changes externally (wheel zoom)
	$effect(() => {
		zoom; // track zoom changes
		showPercentage();
	});
</script>

<div class="absolute bottom-6 right-6 flex flex-col items-end gap-3 pointer-events-none">
	<!-- Compass (Google Maps style) -->
	{#if showCompass}
		<button
			onclick={onReset}
			class="pointer-events-auto w-10 h-10 rounded-full bg-zinc-800 shadow-lg flex items-center justify-center hover:bg-zinc-700 transition-colors"
			aria-label="Reset view (North is up)"
			title="Reset view"
		>
			<svg viewBox="0 0 24 24" class="w-6 h-6">
				<!-- Diamond compass shape -->
				<path
					d="M12 2 L16 12 L12 22 L8 12 Z"
					fill="none"
					stroke="none"
				/>
				<!-- North half (red) -->
				<path
					d="M12 2 L16 12 L8 12 Z"
					fill="#ef4444"
				/>
				<!-- South half (white) -->
				<path
					d="M12 22 L16 12 L8 12 Z"
					fill="#ffffff"
				/>
				<!-- Center dot -->
				<circle cx="12" cy="12" r="2" fill="#1f2937" />
			</svg>
		</button>
	{/if}

	<!-- Zoom controls -->
	<div
		class="pointer-events-auto flex flex-col rounded-lg bg-zinc-800 shadow-lg overflow-hidden"
		onmouseenter={handleMouseEnter}
		onmouseleave={handleMouseLeave}
	>
		<button
			onclick={handleZoomIn}
			class="w-10 h-10 flex items-center justify-center hover:bg-zinc-700 transition-colors text-white"
			aria-label="Zoom in"
		>
			<svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5">
				<line x1="12" y1="5" x2="12" y2="19" />
				<line x1="5" y1="12" x2="19" y2="12" />
			</svg>
		</button>

		<div class="w-full h-px bg-zinc-700" />

		<button
			onclick={handleZoomOut}
			class="w-10 h-10 flex items-center justify-center hover:bg-zinc-700 transition-colors text-white"
			aria-label="Zoom out"
		>
			<svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5">
				<line x1="5" y1="12" x2="19" y2="12" />
			</svg>
		</button>
	</div>

	<!-- Zoom percentage indicator (fades in/out) -->
	<div
		class="pointer-events-auto px-2 py-1 rounded bg-zinc-800/80 text-xs text-zinc-400 font-medium transition-opacity duration-300"
		class:opacity-0={!showZoomPercent}
		class:opacity-100={showZoomPercent}
	>
		{zoomPercent}%
	</div>
</div>
