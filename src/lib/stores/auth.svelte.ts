/**
 * Clerk-Convex Authentication Bridge
 *
 * This module provides integration between Clerk authentication and Convex.
 * It sets up the auth token provider for Convex using Clerk session tokens.
 */

import { useClerkContext } from 'svelte-clerk';
import { useConvexClient } from 'convex-svelte';

/**
 * Sets up Convex authentication using Clerk session tokens.
 * Must be called within a component that is a child of both ClerkProvider and ConvexProvider.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { setupConvexAuth } from '$lib/stores/auth.svelte';
 *
 *   const auth = setupConvexAuth();
 * </script>
 *
 * {#if auth.isLoaded}
 *   {#if auth.isSignedIn}
 *     <p>Signed in as {auth.userId}</p>
 *   {:else}
 *     <p>Not signed in</p>
 *   {/if}
 * {:else}
 *   <p>Loading...</p>
 * {/if}
 * ```
 */
export function setupConvexAuth() {
	const clerkContext = useClerkContext();
	const client = useConvexClient();

	$effect(() => {
		const session = clerkContext.session;

		if (session) {
			client.setAuth(
				async () => {
					const token = await session.getToken({ template: 'convex' });
					return token;
				},
				(isAuthenticated) => {
					console.log('Convex auth status:', isAuthenticated);
				}
			);
		} else {
			client.setAuth(async () => null);
		}
	});

	return {
		get isLoaded() {
			return clerkContext.clerk?.loaded ?? false;
		},
		get isSignedIn() {
			return !!clerkContext.auth?.userId;
		},
		get userId() {
			return clerkContext.auth?.userId ?? null;
		}
	};
}
