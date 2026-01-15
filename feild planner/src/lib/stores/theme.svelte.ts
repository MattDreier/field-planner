export type ThemeMode = 'light' | 'dark' | 'system';

// Theme state using Svelte 5 runes
export const themeState = $state({
	mode: 'system' as ThemeMode
});

// Initialize from localStorage and set up system preference listener
function initializeTheme() {
	// Read from localStorage or default to 'system'
	if (typeof window !== 'undefined') {
		const stored = localStorage.getItem('theme') as ThemeMode | null;
		if (stored === 'light' || stored === 'dark' || stored === 'system') {
			themeState.mode = stored;
		}

		// Apply initial theme
		updateDocumentClass();

		// Listen for system preference changes
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		mediaQuery.addEventListener('change', handleSystemPreferenceChange);
	}
}

// Update document.documentElement class based on effective theme
function updateDocumentClass() {
	if (typeof window !== 'undefined') {
		const effective = getEffectiveTheme();
		if (effective === 'dark') {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	}
}

// Handle system preference changes (only applies in 'system' mode)
function handleSystemPreferenceChange() {
	if (themeState.mode === 'system') {
		updateDocumentClass();
	}
}

// Get the actual theme considering system preference
export function getEffectiveTheme(): 'light' | 'dark' {
	if (themeState.mode === 'system') {
		if (typeof window !== 'undefined') {
			return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		}
		return 'light'; // SSR fallback
	}
	return themeState.mode;
}

// Set theme mode and persist to localStorage
export function setTheme(mode: ThemeMode) {
	themeState.mode = mode;
	if (typeof window !== 'undefined') {
		localStorage.setItem('theme', mode);
		updateDocumentClass();
	}
}

// Toggle between light and dark (skips 'system' mode)
export function toggleTheme() {
	const effective = getEffectiveTheme();
	setTheme(effective === 'light' ? 'dark' : 'light');
}

// Initialize on module load (client-side only)
if (typeof window !== 'undefined') {
	initializeTheme();
}
