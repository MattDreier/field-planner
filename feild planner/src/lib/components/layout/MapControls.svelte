<script lang="ts">
	/**
	 * Google Maps style compass and zoom controls overlay.
	 * Fixed position over the canvas, doesn't move with pan.
	 */

	interface Props {
		onZoomIn: () => void;
		onZoomOut: () => void;
		onReset: () => void;
		showCompass?: boolean;
	}

	let { onZoomIn, onZoomOut, onReset, showCompass = true }: Props = $props();
</script>

<div class="absolute bottom-4 right-4 flex flex-col items-end gap-2 pointer-events-none">
	<!-- Compass (Google Maps style) -->
	{#if showCompass}
		<button
			onclick={onReset}
			class="pointer-events-auto w-10 h-10 rounded-full bg-zinc-800 shadow-lg flex items-center justify-center hover:bg-zinc-700 transition-colors"
			aria-label="Reset view (North is up)"
			title="Reset view"
		>
			<svg viewBox="0 0 24 24" class="w-6 h-6">
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
	<div class="pointer-events-auto flex flex-col rounded-lg bg-zinc-800 shadow-lg overflow-hidden">
		<button
			onclick={onZoomIn}
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
			onclick={onZoomOut}
			class="w-10 h-10 flex items-center justify-center hover:bg-zinc-700 transition-colors text-white"
			aria-label="Zoom out"
		>
			<svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.5">
				<line x1="5" y1="12" x2="19" y2="12" />
			</svg>
		</button>
	</div>
</div>
