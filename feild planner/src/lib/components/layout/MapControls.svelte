<script lang="ts">
	/**
	 * Google Maps style compass and zoom controls overlay.
	 * Fixed position over the canvas, doesn't move with pan.
	 *
	 * Compass rotation interaction:
	 * - Click and drag on compass to rotate the field view
	 * - Drag RIGHT = rotate clockwise, drag LEFT = counter-clockwise
	 * - Drag UP adds to rotation (so up-right = more clockwise)
	 * - Hold Alt/Option to snap to 45° increments (N, NE, E, SE, S, SW, W, NW)
	 */

	interface Props {
		onZoomIn: () => void;
		onZoomOut: () => void;
		onReset: () => void;
		rotation?: number; // Current field rotation in degrees (0-360)
		onRotate?: (rotation: number) => void;
		showCompass?: boolean;
	}

	let { onZoomIn, onZoomOut, onReset, rotation = 0, onRotate, showCompass = true }: Props = $props();

	// Rotation drag state
	let isDragging = $state(false);
	let dragStartX = $state(0);
	let dragStartY = $state(0);
	let rotationAtDragStart = $state(0);

	// Sensitivity: degrees of rotation per pixel of drag
	// 360° per 400px means a full rotation requires dragging ~400 pixels
	const SENSITIVITY = 360 / 400;

	// Snap angles for Alt key (every 15 degrees for fine control)
	// Includes cardinal (N/E/S/W), ordinal (NE/SE/SW/NW), and intermediate directions
	const SNAP_ANGLES = [
		0,    // N
		15,
		30,   // NNE
		45,   // NE
		60,   // ENE
		75,
		90,   // E
		105,
		120,  // ESE
		135,  // SE
		150,  // SSE
		165,
		180,  // S
		195,
		210,  // SSW
		225,  // SW
		240,  // WSW
		255,
		270,  // W
		285,
		300,  // WNW
		315,  // NW
		330,  // NNW
		345
	];

	function snapToNearest(angle: number): number {
		// Normalize to 0-360
		angle = ((angle % 360) + 360) % 360;

		// Find nearest snap angle
		let nearest = SNAP_ANGLES[0];
		let minDiff = Math.abs(angle - nearest);

		for (const snapAngle of SNAP_ANGLES) {
			// Check both the angle and angle + 360 for wrapping
			const diff = Math.min(
				Math.abs(angle - snapAngle),
				Math.abs(angle - (snapAngle + 360)),
				Math.abs((angle + 360) - snapAngle)
			);
			if (diff < minDiff) {
				minDiff = diff;
				nearest = snapAngle;
			}
		}

		return nearest;
	}

	function handlePointerDown(e: PointerEvent) {
		if (!onRotate) return;

		e.preventDefault();
		isDragging = true;
		dragStartX = e.clientX;
		dragStartY = e.clientY;
		rotationAtDragStart = rotation;

		// Capture pointer for smooth tracking even outside the element
		(e.target as HTMLElement).setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!isDragging || !onRotate) return;

		// Calculate drag distance from start point
		const dx = e.clientX - dragStartX; // Positive = dragged right
		const dy = dragStartY - e.clientY; // Positive = dragged up (inverted Y)

		// Primary: horizontal movement controls rotation
		// Secondary: vertical movement adds to it (up-right = more clockwise)
		// This creates a natural "pull to rotate" gesture
		const horizontalRotation = dx * SENSITIVITY;
		const verticalBoost = dy * SENSITIVITY * 0.5; // Vertical is 50% as sensitive

		let deltaRotation = horizontalRotation + verticalBoost;
		let newRotation = rotationAtDragStart + deltaRotation;

		// Normalize to 0-360
		newRotation = ((newRotation % 360) + 360) % 360;

		// Snap if Alt/Option is held
		if (e.altKey) {
			newRotation = snapToNearest(newRotation);
		}

		onRotate(newRotation);
	}

	function handlePointerUp(e: PointerEvent) {
		if (isDragging) {
			isDragging = false;
			(e.target as HTMLElement).releasePointerCapture(e.pointerId);
		}
	}

	// Track if rotation changed during drag to prevent reset on click
	let rotationChangedDuringDrag = $state(false);
	let initialRotationOnDown = $state(0);

	function handlePointerDownTracked(e: PointerEvent) {
		initialRotationOnDown = rotation;
		rotationChangedDuringDrag = false;
		handlePointerDown(e);
	}

	function handlePointerMoveTracked(e: PointerEvent) {
		handlePointerMove(e);
		if (isDragging && Math.abs(rotation - initialRotationOnDown) > 2) {
			rotationChangedDuringDrag = true;
		}
	}

	function handleClickTracked(e: MouseEvent) {
		// Only reset view if we didn't drag to rotate
		if (!rotationChangedDuringDrag) {
			onReset();
		}
		rotationChangedDuringDrag = false;
	}
</script>

<div class="absolute bottom-16 right-4 flex flex-col items-end gap-2 pointer-events-none">
	<!-- Compass (Google Maps style) - interactive for rotation -->
	{#if showCompass}
		<div class="relative">
			<!-- Rotation hint ring (shows during drag) -->
			{#if isDragging}
				<div
					class="absolute inset-0 -m-2 rounded-full border-2 border-dashed border-blue-400/50 animate-pulse"
					style="width: 56px; height: 56px;"
				></div>
			{/if}

			<button
				onpointerdown={handlePointerDownTracked}
				onpointermove={handlePointerMoveTracked}
				onpointerup={handlePointerUp}
				onclick={handleClickTracked}
				class="pointer-events-auto w-10 h-10 rounded-full bg-zinc-800 shadow-lg flex items-center justify-center select-none touch-none
					{isDragging
						? 'ring-2 ring-blue-400 bg-zinc-700 scale-110 cursor-grabbing'
						: 'hover:bg-zinc-700 hover:scale-105 cursor-grab'}
					transition-all duration-150"
				aria-label="Drag horizontally to rotate view, click to reset. Hold Alt to snap to 15° increments."
				title={rotation === 0
					? 'Drag ← → to rotate • Click to reset'
					: `${Math.round(rotation)}° • Drag ← → to rotate • Click to reset`}
			>
				<svg
					viewBox="0 0 24 24"
					class="w-6 h-6"
					style="transform: rotate({-rotation}deg); transition: transform {isDragging ? '0ms' : '150ms'} ease-out;"
				>
					<!-- North half (red) -->
					<path d="M12 2 L16 12 L8 12 Z" fill="#ef4444" />
					<!-- South half (white) -->
					<path d="M12 22 L16 12 L8 12 Z" fill="#ffffff" />
					<!-- Center dot -->
					<circle cx="12" cy="12" r="2" fill="#1f2937" />
				</svg>
			</button>

			<!-- Rotation indicator badge (shows current angle when rotated) -->
			{#if rotation !== 0 && !isDragging}
				<div
					class="absolute -top-1 -right-1 bg-blue-500 text-white text-[9px] font-bold px-1 rounded-full shadow-sm"
				>
					{Math.round(rotation)}°
				</div>
			{/if}
		</div>
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

		<div class="w-full h-px bg-zinc-700"></div>

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
