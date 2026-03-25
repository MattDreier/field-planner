<script lang="ts">
	import { browser } from '$app/environment';
	import { tourState, getCurrentStep, skipTour, canGoBack, canGoForward, TOUR_STEPS } from '$lib/stores/tour.svelte';
	import TourTooltip from './TourTooltip.svelte';

	// Spotlight rects (what gets highlighted) - supports multiple spotlights
	let spotlightRects = $state<DOMRect[]>([]);
	// Tooltip target rect (where tooltip points)
	let tooltipRect = $state<DOMRect | null>(null);
	let targetElement = $state<HTMLElement | null>(null);

	// Get current step info
	const currentStep = $derived(getCurrentStep());
	const stepIndex = $derived(tourState.currentStepIndex);
	const isFinalStep = $derived(stepIndex === TOUR_STEPS.length - 1);

	// Find and track the target elements (only runs in browser)
	$effect(() => {
		if (!browser) return;
		if (!tourState.isActive || !currentStep?.targetSelector) {
			spotlightRects = [];
			tooltipRect = null;
			targetElement = null;
			return;
		}

		function updateRect() {
			if (!currentStep?.targetSelector) return;

			// Get tooltip target element
			const element = document.querySelector(currentStep.targetSelector) as HTMLElement | null;

			// Get primary spotlight element (defaults to tooltip target)
			const spotlightSelector = currentStep.spotlightSelector || currentStep.targetSelector;
			const spotlightElement = document.querySelector(spotlightSelector) as HTMLElement | null;

			if (element) {
				targetElement = element;
				tooltipRect = element.getBoundingClientRect();

				// Collect all spotlight rects (primary + additional)
				const rects: DOMRect[] = [];
				const primaryRect = spotlightElement?.getBoundingClientRect() ?? tooltipRect;
				if (primaryRect) rects.push(primaryRect);

				// Add additional spotlights if defined
				if (currentStep.additionalSpotlights) {
					for (const selector of currentStep.additionalSpotlights) {
						const additionalElement = document.querySelector(selector) as HTMLElement | null;
						if (additionalElement) {
							rects.push(additionalElement.getBoundingClientRect());
						}
					}
				}

				spotlightRects = rects;

				// Scroll primary spotlight element into view if needed
				const scrollTarget = spotlightElement || element;
				const rect = scrollTarget.getBoundingClientRect();
				const isVisible =
					rect.top >= 0 &&
					rect.left >= 0 &&
					rect.bottom <= window.innerHeight &&
					rect.right <= window.innerWidth;

				if (!isVisible) {
					scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
					// Update rects after scroll
					setTimeout(updateRect, 300);
				}
			} else {
				spotlightRects = [];
				tooltipRect = null;
				targetElement = null;
			}
		}

		// Initial update
		updateRect();

		// Set up observers
		const resizeObserver = new ResizeObserver(updateRect);
		if (targetElement) {
			resizeObserver.observe(targetElement);
		}

		// Listen for scroll and resize
		window.addEventListener('scroll', updateRect, true);
		window.addEventListener('resize', updateRect);

		// Poll for element changes (in case element appears after initial render)
		const pollInterval = setInterval(updateRect, 500);

		return () => {
			resizeObserver.disconnect();
			window.removeEventListener('scroll', updateRect, true);
			window.removeEventListener('resize', updateRect);
			clearInterval(pollInterval);
		};
	});

	// Handle keyboard navigation
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && tourState.isActive) {
			skipTour();
		}
	}

	// Spotlight padding
	const padding = 8;
	const borderRadius = 8;

	// Detect dark mode for overlay color
	let isDarkMode = $state(false);

	$effect(() => {
		if (!browser) return;

		// Check initial dark mode state
		isDarkMode = document.documentElement.classList.contains('dark');

		// Watch for dark mode changes
		const observer = new MutationObserver(() => {
			isDarkMode = document.documentElement.classList.contains('dark');
		});

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class']
		});

		return () => observer.disconnect();
	});

	// Overlay color: dark in light mode, light in dark mode
	const overlayColor = $derived(isDarkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.75)');
</script>

<svelte:window onkeydown={handleKeydown} />

{#if tourState.isActive && currentStep}
	<!-- Overlay with spotlight cutout - pointer-events-none allows clicks through -->
	<div class="fixed inset-0 z-50 pointer-events-none">
		<svg class="absolute inset-0 w-full h-full pointer-events-none">
			<defs>
				<mask id="spotlight-mask">
					<!-- White background = visible overlay -->
					<rect width="100%" height="100%" fill="white" />

					<!-- Black cutouts = transparent spotlights (supports multiple) -->
					{#each spotlightRects as rect, i}
						<rect
							x={rect.left - padding}
							y={rect.top - padding}
							width={rect.width + padding * 2}
							height={rect.height + padding * 2}
							rx={borderRadius}
							fill="black"
							class="transition-all duration-300 ease-out"
						/>
					{/each}
				</mask>
			</defs>

			<!-- Overlay with mask applied - dark in light mode, light in dark mode -->
			<rect
				width="100%"
				height="100%"
				fill={overlayColor}
				mask="url(#spotlight-mask)"
			/>
		</svg>

		<!-- Tooltip - this needs pointer-events to be clickable -->
		<!-- Show even without targetRect on final step (centered) -->
		{#if currentStep && (tooltipRect || isFinalStep)}
			<div class="pointer-events-auto">
				<TourTooltip
					title={currentStep.title}
					description={currentStep.description}
					currentStep={stepIndex}
					totalSteps={TOUR_STEPS.length - 1}
					placement={currentStep.placement}
					targetRect={tooltipRect}
					offsetY={currentStep.offsetY}
					autoAdvanceMs={currentStep.autoAdvanceMs}
					{isFinalStep}
					canGoBack={canGoBack()}
					canGoForward={canGoForward()}
				/>
			</div>
		{/if}
	</div>
{/if}
