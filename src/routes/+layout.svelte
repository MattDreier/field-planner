<script lang="ts">
	import '../app.css';
	import { ClerkProvider } from 'svelte-clerk';
	import { setupConvex } from 'convex-svelte';
	import { env } from '$env/dynamic/public';
	import { getConvexUrl } from '$lib/stores/persistence.svelte';

	let { children, data } = $props();

	const convexUrl = getConvexUrl();
	const clerkPublishableKey = env.PUBLIC_CLERK_PUBLISHABLE_KEY;

	// Setup Convex if URL available
	if (convexUrl) {
		setupConvex(convexUrl);
	}
</script>

<div class="min-h-screen bg-background">
	{#if clerkPublishableKey}
		<ClerkProvider {...data} publishableKey={clerkPublishableKey}>
			{@render children()}
		</ClerkProvider>
	{:else}
		{@render children()}
	{/if}
</div>
