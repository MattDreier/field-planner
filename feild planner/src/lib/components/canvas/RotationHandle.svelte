<script lang="ts">
	/**
	 * Drag handle for rotating beds.
	 * Positioned above the bed center, drag to rotate.
	 */

	interface Props {
		centerX: number; // bed center X in canvas pixels
		centerY: number; // bed center Y in canvas pixels
		currentRotation: number; // current rotation in degrees
		distance?: number; // distance from center to handle
		onRotate: (degrees: number) => void;
		onRotateStart?: () => void; // Called once when rotation begins (for history snapshot)
	}

	let { centerX, centerY, currentRotation, distance = 40, onRotate, onRotateStart }: Props = $props();

	let isDragging = $state(false);

	// Calculate handle position based on current rotation
	// Handle is positioned along the rotation axis (starts at top, moves with rotation)
	const handleX = $derived(centerX + Math.sin((currentRotation * Math.PI) / 180) * distance);
	const handleY = $derived(centerY - Math.cos((currentRotation * Math.PI) / 180) * distance);

	function handlePointerDown(e: PointerEvent) {
		if (e.button !== 0) return;

		// Notify parent that rotation is starting (for history snapshot)
		onRotateStart?.();

		isDragging = true;
		(e.currentTarget as SVGElement).setPointerCapture(e.pointerId);
		e.stopPropagation();
	}

	function handlePointerMove(e: PointerEvent) {
		if (!isDragging) return;

		// Get SVG element to convert coordinates
		const svg = (e.currentTarget as SVGElement).ownerSVGElement;
		if (!svg) return;

		// Convert client coordinates to SVG coordinates
		const point = svg.createSVGPoint();
		point.x = e.clientX;
		point.y = e.clientY;
		const ctm = svg.getScreenCTM();
		if (!ctm) return;
		const svgPoint = point.matrixTransform(ctm.inverse());

		// Calculate angle from bed center to pointer
		const dx = svgPoint.x - centerX;
		const dy = svgPoint.y - centerY;

		// atan2 gives angle from positive X axis, we want from negative Y (North)
		// atan2(dx, -dy) gives angle from North
		let angle = Math.atan2(dx, -dy) * (180 / Math.PI);

		// Normalize to 0-360
		angle = ((angle % 360) + 360) % 360;

		onRotate(angle);
	}

	function handlePointerUp(e: PointerEvent) {
		isDragging = false;
		(e.currentTarget as SVGElement).releasePointerCapture(e.pointerId);
	}
</script>

<g class="rotation-handle">
	<!-- Line from center to handle -->
	<line
		x1={centerX}
		y1={centerY}
		x2={handleX}
		y2={handleY}
		stroke="rgb(59, 130, 246)"
		stroke-width="2"
		stroke-dasharray="4 2"
		class="pointer-events-none"
	/>

	<!-- Handle circle -->
	<circle
		cx={handleX}
		cy={handleY}
		r="8"
		fill="white"
		stroke="rgb(59, 130, 246)"
		stroke-width="2"
		class={isDragging ? 'cursor-grabbing' : 'cursor-grab'}
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
	/>

	<!-- Rotation icon inside handle -->
	<g transform="translate({handleX}, {handleY})" class="pointer-events-none">
		<path
			d="M-3,-2 A4,4 0 1,1 3,-2"
			fill="none"
			stroke="rgb(59, 130, 246)"
			stroke-width="1.5"
			stroke-linecap="round"
		/>
		<polygon points="3,-2 5,0 1,0" fill="rgb(59, 130, 246)" />
	</g>
</g>
