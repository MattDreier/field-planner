/**
 * Tour Store - Guided tour state management
 *
 * Follows the same pattern as timelineState: centralized $state() object
 * with exported action functions for mutations.
 */

// Types
export interface TourStep {
	id: string;
	title: string;
	description: string;
	targetSelector: string;
	/** Optional: different element to spotlight (defaults to targetSelector) */
	spotlightSelector?: string;
	/** Optional: additional elements to spotlight alongside the main spotlight */
	additionalSpotlights?: string[];
	placement: 'top' | 'bottom' | 'left' | 'right';
	/** Optional: additional Y offset in pixels (negative = higher) */
	offsetY?: number;
	/** Optional: auto-advance after this many milliseconds (for informational steps) */
	autoAdvanceMs?: number;
	completionCondition: (state: TourAppState) => boolean;
}

export interface TourAppState {
	currentTool: string;
	bedsLength: number;
	plantsLength: number;
	detailsPlantId: string | null;
	detailsScrolledToBottom: boolean;
	timelinePanelOpen: boolean;
	currentViewDate: string;
	viewScale: string;
	latitude: number;
	timeOfDay: number;
	/** Set to true when user releases the time slider (change event) */
	timeSliderReleased: boolean;
	/** Set to true when user releases the timeline scrubber (mouseup event) */
	timelineScrubberReleased: boolean;
	// Phase dates for first plant (used by timeline tour steps)
	firstPlantGrowingStart?: string; // ISO date
	firstPlantHarvestStart?: string; // ISO date
}

// Tour step definitions
export const TOUR_STEPS: TourStep[] = [
	{
		id: 'welcome',
		title: 'Welcome',
		description: 'Welcome modal',
		targetSelector: '',
		placement: 'bottom',
		completionCondition: () => true // Completed by clicking "Start Tour"
	},
	{
		id: 'bed-tool',
		title: 'Create a Garden Bed',
		description:
			'Choose a shape tool to create your first garden bed. Use the rectangle for traditional beds or the circle for round planters.',
		targetSelector: '[data-tour="bed-tools"]',
		placement: 'right',
		completionCondition: (state) => state.currentTool === 'rectangle' || state.currentTool === 'circle'
	},
	{
		id: 'create-bed',
		title: 'Draw Your Bed',
		description:
			'Click and drag on the canvas to draw your garden bed. Release when you have the size you want.',
		targetSelector: '[data-tour="canvas"]',
		placement: 'left',
		completionCondition: (state) => state.bedsLength > 0
	},
	{
		id: 'flower-details',
		title: 'Explore a Plant',
		description: 'Click on a plant card to see detailed growing information.',
		targetSelector: '[data-tour="flower-zinnias"]',
		placement: 'bottom',
		completionCondition: (state) => state.detailsPlantId === 'zinnias'
	},
	{
		id: 'explore-details',
		title: 'Learn About This Plant',
		description:
			'Scroll through the details panel to learn about spacing, growing conditions, harvest tips, and more!',
		targetSelector: '[data-tour="details-panel"]',
		placement: 'left',
		completionCondition: (state) => state.detailsScrolledToBottom === true
	},
	{
		id: 'close-details',
		title: 'Close the Details Panel',
		description: "Click the X to close the plant details panel when you're done exploring.",
		targetSelector: '[data-tour="close-details"]',
		placement: 'bottom',
		completionCondition: (state) => state.detailsPlantId === null
	},
	{
		id: 'place-plant',
		title: 'Place Your First Plant',
		description:
			'Now drag the Zinnias card onto your garden bed. The spacing circle shows how much room each plant needs.',
		targetSelector: '[data-tour="flower-zinnias"]',
		placement: 'bottom',
		completionCondition: (state) => state.plantsLength > 0
	},
	{
		id: 'timeline-open',
		title: 'Open the Timeline',
		description:
			'Click here to open the timeline panel. This shows when to start seeds, transplant, and harvest throughout the season.',
		targetSelector: '[data-tour="timeline-toggle"]',
		placement: 'top',
		completionCondition: (state) => state.timelinePanelOpen === true
	},
	{
		id: 'timeline-growth',
		title: 'Watch Your Garden Grow',
		description:
			'Drag the orange scrubber into the green "Growing" phase. Watch your flower grow as you move through time!',
		targetSelector: '[data-tour="phase-growing"]',
		spotlightSelector: '[data-tour="timeline-chart"]',
		additionalSpotlights: ['[data-tour="first-placed-plant"]'],
		placement: 'top',
		completionCondition: (state) => {
			// Complete when scrubber reaches the start of the first plant's growing phase
			if (!state.firstPlantGrowingStart) return false;
			const current = new Date(state.currentViewDate + 'T12:00:00');
			const growStart = new Date(state.firstPlantGrowingStart + 'T12:00:00');
			return current >= growStart;
		}
	},
	{
		id: 'timeline-harvest',
		title: 'Harvest Time!',
		description:
			'Keep dragging into the coral "Harvest" phase. See how your flower is now ready to cut!',
		targetSelector: '[data-tour="phase-harvest"]',
		spotlightSelector: '[data-tour="timeline-chart"]',
		additionalSpotlights: ['[data-tour="first-placed-plant"]'],
		placement: 'top',
		completionCondition: (state) => {
			// Complete when user releases scrubber AND it's in the harvest phase
			if (!state.firstPlantHarvestStart || !state.timelineScrubberReleased) return false;
			const current = new Date(state.currentViewDate + 'T12:00:00');
			const harvestStart = new Date(state.firstPlantHarvestStart + 'T12:00:00');
			return current >= harvestStart;
		}
	},
	{
		id: 'second-plant',
		title: 'Add Another Variety',
		description:
			'Try adding a different flower! Snapdragons are great cut flowers with long vase life.',
		targetSelector: '[data-tour="flower-snapdragons"]',
		placement: 'bottom',
		completionCondition: (state) => state.plantsLength >= 2
	},
	{
		id: 'shadows-tool',
		title: 'Shadow Simulation',
		description:
			'Select the shadows tool to visualize how sunlight and shadows fall across your garden beds.',
		targetSelector: '[data-tour="shadows-tool"]',
		placement: 'right',
		completionCondition: (state) => state.currentTool === 'shadows'
	},
	{
		id: 'my-location',
		title: 'Set Your Location',
		description:
			'Click "Use My Location" to automatically set your latitude for accurate shadow calculations.',
		targetSelector: '[data-tour="my-location"]',
		placement: 'right',
		completionCondition: (state) => {
			// Will be checked by comparing previous state
			return false; // Handled specially in completion checker
		}
	},
	{
		id: 'time-of-day',
		title: 'Adjust Time of Day',
		description:
			'Move the time slider to see how shadows change throughout the day. Watch for plants that turn gray—they are being overshadowed by taller neighbors!',
		targetSelector: '[data-tour="time-slider"]',
		additionalSpotlights: ['[data-tour="garden-content"]'],
		placement: 'bottom',
		completionCondition: (state) => state.timeSliderReleased
	},
	{
		id: 'seasonal-shadows',
		title: 'Watch Shadows Through the Seasons',
		description:
			"Drag the timeline scrubber between the Last Frost and First Frost markers. Watch how shadows shift as the sun's position changes throughout the year, and see your plants grow!",
		targetSelector: '[data-tour="timeline-chart"]',
		additionalSpotlights: ['[data-tour="garden-content"]'],
		placement: 'left',
		completionCondition: (state) => state.timelineScrubberReleased
	},
	{
		id: 'collapse-timeline',
		title: 'Collapse the Timeline',
		description:
			'Click the down arrow to collapse the timeline panel and get a full view of your garden.',
		targetSelector: '[data-tour="timeline-toggle"]',
		placement: 'top',
		completionCondition: (state) => state.timelinePanelOpen === false
	},
	{
		id: 'height-legend',
		title: 'Understanding Plant Heights',
		description:
			'The color legend shows plant heights. Shorter plants are blue, taller plants are red. This helps you plan your garden so tall plants don\'t shade shorter ones!',
		targetSelector: '[data-tour="height-legend"]',
		additionalSpotlights: ['[data-tour="first-placed-plant"]', '[data-tour="second-placed-plant"]'],
		placement: 'right',
		autoAdvanceMs: 6000,
		completionCondition: () => false
	},
	{
		id: 'sign-in',
		title: 'Save Your Garden',
		description:
			"Sign in to save your garden layout to the cloud. Your designs will sync across devices and be safe forever!",
		targetSelector: '[data-tour="sign-in"]',
		placement: 'bottom',
		completionCondition: () => false // Completed by clicking "Finish Tour" button
	}
];

// localStorage key
const TOUR_STORAGE_KEY = 'heat-harvest-tour-seen';

// Tour state
export const tourState = $state({
	isActive: false,
	showWelcome: false,
	currentStepIndex: 0,
	hasSeenTour: false,
	// Track the furthest step the user has reached (for back/forward navigation)
	furthestStepIndex: 0,
	// Track previous values for comparison-based conditions
	previousState: null as TourAppState | null,
	// Prevent multiple step completions during rapid state changes
	isAdvancing: false
});

// Get current step
export function getCurrentStep(): TourStep | null {
	if (tourState.currentStepIndex < 0 || tourState.currentStepIndex >= TOUR_STEPS.length) {
		return null;
	}
	return TOUR_STEPS[tourState.currentStepIndex];
}

// Initialize tour (check localStorage, show welcome if first visit)
export function initializeTour(): void {
	if (typeof window === 'undefined') return;

	const seen = localStorage.getItem(TOUR_STORAGE_KEY);
	tourState.hasSeenTour = seen === 'true';

	// Show welcome modal for first-time visitors
	if (!tourState.hasSeenTour) {
		tourState.showWelcome = true;
	}
}

// Start the tour
export function startTour(): void {
	tourState.showWelcome = false;
	tourState.isActive = true;
	tourState.currentStepIndex = 1; // Skip welcome step (index 0)
	tourState.furthestStepIndex = 1; // Reset furthest step when starting fresh
	tourState.previousState = null;
	tourState.isAdvancing = false;
}

// Skip the tour
export function skipTour(): void {
	tourState.showWelcome = false;
	tourState.isActive = false;
	tourState.currentStepIndex = 0;
	markTourAsSeen();
}

// Move to next step
export function nextStep(): void {
	if (tourState.currentStepIndex < TOUR_STEPS.length - 1) {
		tourState.currentStepIndex++;
		// Track the furthest step reached
		if (tourState.currentStepIndex > tourState.furthestStepIndex) {
			tourState.furthestStepIndex = tourState.currentStepIndex;
		}
	} else {
		completeTour();
	}
}

// Move to previous step
export function prevStep(): void {
	// Minimum step is 1 (step 0 is the welcome modal)
	if (tourState.currentStepIndex > 1) {
		tourState.currentStepIndex--;
	}
}

// Check if user can go back to a previous step
export function canGoBack(): boolean {
	return tourState.currentStepIndex > 1;
}

// Check if user can go forward (only to previously visited steps)
export function canGoForward(): boolean {
	return tourState.currentStepIndex < tourState.furthestStepIndex;
}

// Complete the tour
export function completeTour(): void {
	tourState.isActive = false;
	tourState.currentStepIndex = 0;
	markTourAsSeen();
}

// Mark tour as seen in localStorage
function markTourAsSeen(): void {
	tourState.hasSeenTour = true;
	if (typeof window !== 'undefined') {
		localStorage.setItem(TOUR_STORAGE_KEY, 'true');
	}
}

// Reset tour (for testing or re-starting)
export function resetTour(): void {
	tourState.hasSeenTour = false;
	tourState.isActive = false;
	tourState.showWelcome = false;
	tourState.currentStepIndex = 0;
	tourState.furthestStepIndex = 0;
	tourState.previousState = null;
	tourState.isAdvancing = false;
	if (typeof window !== 'undefined') {
		localStorage.removeItem(TOUR_STORAGE_KEY);
	}
}

// Check if current step is complete and advance if so
export function checkStepCompletion(appState: TourAppState): void {
	if (!tourState.isActive) return;
	// Prevent multiple completions during rapid state changes (e.g., dragging)
	if (tourState.isAdvancing) return;

	const currentStep = getCurrentStep();
	if (!currentStep) return;

	// Special handling for comparison-based conditions
	const stepId = currentStep.id;
	const prev = tourState.previousState;

	let isComplete = false;

	// Some steps use comparison-based conditions (detect any change from previous state)
	if (stepId === 'my-location') {
		// latitude changed
		isComplete = prev !== null && appState.latitude !== prev.latitude;
	} else {
		// Use the step's completion condition
		isComplete = currentStep.completionCondition(appState);
	}

	// Update previous state for next comparison
	tourState.previousState = { ...appState };

	if (isComplete) {
		// Mark as advancing to prevent duplicate triggers
		tourState.isAdvancing = true;
		// Delay before advancing to let user see their action
		setTimeout(() => {
			nextStep();
			tourState.isAdvancing = false;
		}, 300);
	}
}
