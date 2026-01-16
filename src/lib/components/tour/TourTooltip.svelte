<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { skipTour, completeTour, nextStep, prevStep, TOUR_STEPS } from '$lib/stores/tour.svelte';

	interface Props {
		title: string;
		description: string;
		currentStep: number;
		totalSteps: number;
		placement: 'top' | 'bottom' | 'left' | 'right';
		targetRect: DOMRect | null;
		offsetY?: number;
		autoAdvanceMs?: number;
		isFinalStep?: boolean;
		canGoBack?: boolean;
		canGoForward?: boolean;
	}

	let { title, description, currentStep, totalSteps, placement, targetRect, offsetY = 0, autoAdvanceMs, isFinalStep = false, canGoBack = false, canGoForward = false }: Props = $props();

	// Auto-advance timer state
	let timerProgress = $state(0); // 0 to 1
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	// Circular progress calculation (SVG stroke-dashoffset)
	const circleRadius = 8;
	const circleCircumference = 2 * Math.PI * circleRadius;
	const strokeDashoffset = $derived(circleCircumference * (1 - timerProgress));

	// Start/reset timer when step changes or autoAdvanceMs is set
	$effect(() => {
		// Clean up previous timer
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
		timerProgress = 0;

		if (!autoAdvanceMs || isFinalStep) return;

		const startTime = Date.now();
		const duration = autoAdvanceMs;

		timerInterval = setInterval(() => {
			const elapsed = Date.now() - startTime;
			timerProgress = Math.min(elapsed / duration, 1);

			if (timerProgress >= 1) {
				if (timerInterval) clearInterval(timerInterval);
				timerInterval = null;
				nextStep();
			}
		}, 50); // Update every 50ms for smooth animation

		return () => {
			if (timerInterval) {
				clearInterval(timerInterval);
				timerInterval = null;
			}
		};
	});

	// Calculate tooltip position based on target element and placement
	const tooltipStyle = $derived.by(() => {
		const tooltipWidth = 320;
		const tooltipHeight = 180; // Approximate
		const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
		const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

		// Center the tooltip if no target (e.g., final step)
		if (!targetRect) {
			const left = (viewportWidth - tooltipWidth) / 2;
			const top = (viewportHeight - tooltipHeight) / 2;
			return `top: ${top}px; left: ${left}px;`;
		}

		const gap = 16; // Space between tooltip and target

		let top = 0;
		let left = 0;

		switch (placement) {
			case 'top':
				top = targetRect.top - tooltipHeight - gap;
				left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
				break;
			case 'bottom':
				top = targetRect.bottom + gap;
				left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
				break;
			case 'left':
				top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
				left = targetRect.left - tooltipWidth - gap;
				break;
			case 'right':
				top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
				left = targetRect.right + gap;
				break;
		}

		// Apply custom Y offset (negative moves tooltip up)
		top += offsetY;

		// Clamp to viewport
		left = Math.max(16, Math.min(left, viewportWidth - tooltipWidth - 16));
		top = Math.max(16, Math.min(top, viewportHeight - tooltipHeight - 16));

		return `top: ${top}px; left: ${left}px;`;
	});

	// Calculate arrow position
	const arrowStyle = $derived.by(() => {
		if (!targetRect) return '';

		switch (placement) {
			case 'top':
				return 'bottom: -8px; left: 50%; transform: translateX(-50%) rotate(180deg);';
			case 'bottom':
				return 'top: -8px; left: 50%; transform: translateX(-50%);';
			case 'left':
				return 'right: -8px; top: 50%; transform: translateY(-50%) rotate(90deg);';
			case 'right':
				return 'left: -8px; top: 50%; transform: translateY(-50%) rotate(-90deg);';
		}
	});

	// Progress as percentage
	const progress = $derived(((currentStep - 1) / (totalSteps - 1)) * 100);
</script>

<div
	class="fixed z-[60] w-80 bg-popover border border-border rounded-lg shadow-xl"
	style={tooltipStyle}
	role="tooltip"
>
	<!-- Arrow -->
	<div class="absolute w-4 h-4" style={arrowStyle}>
		<svg viewBox="0 0 16 8" class="fill-popover stroke-border">
			<path d="M0 8 L8 0 L16 8" stroke-width="1" />
		</svg>
	</div>

	<!-- Content -->
	<div class="p-4">
		<!-- Close button -->
		<button
			class="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
			onclick={skipTour}
			aria-label="Close tour"
		>
			<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M18 6L6 18M6 6l12 12" />
			</svg>
		</button>

		<!-- Title -->
		<h3 class="font-semibold text-base mb-2 pr-6">{title}</h3>

		<!-- Description -->
		<p class="text-sm text-muted-foreground leading-relaxed mb-4 min-h-[48px]">
			{description}
		</p>

		<!-- Actions -->
		{#if isFinalStep}
			<div class="flex items-center justify-end mb-3">
				<Button size="sm" onclick={completeTour}>
					Finish Tour
				</Button>
			</div>
		{/if}

		<!-- Progress bar with navigation -->
		<div class="flex items-center gap-2">
			<!-- Back arrow -->
			<button
				class="w-6 h-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
				disabled={!canGoBack}
				onclick={prevStep}
				aria-label="Previous step"
			>
				<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M15 18L9 12L15 6" />
				</svg>
			</button>

			<div class="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
				<div
					class="h-full bg-primary rounded-full transition-all duration-300"
					style="width: {progress}%"
				></div>
			</div>
			<span class="text-xs text-muted-foreground font-medium">{currentStep}/{totalSteps}</span>

			<!-- Forward arrow (only visible when user has gone back) -->
			{#if canGoForward}
				<button
					class="w-6 h-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
					onclick={nextStep}
					aria-label="Next step"
				>
					<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M9 6L15 12L9 18" />
					</svg>
				</button>
			{/if}

			{#if autoAdvanceMs && !isFinalStep}
				<!-- Circular countdown timer -->
				<svg width="20" height="20" class="transform -rotate-90">
					<!-- Background circle -->
					<circle
						cx="10"
						cy="10"
						r={circleRadius}
						fill="none"
						stroke="currentColor"
						stroke-width="3"
						class="text-muted"
					/>
					<!-- Progress circle -->
					<circle
						cx="10"
						cy="10"
						r={circleRadius}
						fill="none"
						stroke="currentColor"
						stroke-width="3"
						stroke-linecap="round"
						stroke-dasharray={circleCircumference}
						stroke-dashoffset={strokeDashoffset}
						class="text-primary"
					/>
				</svg>
			{/if}
		</div>
	</div>
</div>
