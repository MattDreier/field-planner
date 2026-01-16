<script lang="ts">
	import { Sun, Moon } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { themeState, toggleTheme, getEffectiveTheme } from '$lib/stores/theme.svelte';

	// Reactive effective theme for icon display
	let effectiveTheme = $derived(getEffectiveTheme());
</script>

<Button
	variant="ghost"
	size="icon"
	onclick={toggleTheme}
	aria-label={effectiveTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
>
	{#if effectiveTheme === 'dark'}
		<Sun class="h-4 w-4" />
	{:else}
		<Moon class="h-4 w-4" />
	{/if}
</Button>
