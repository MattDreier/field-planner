import type { QueryCtx, MutationCtx } from 'convex/server';

export async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<string> {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) {
		throw new Error('Not authenticated');
	}
	return identity.subject;
}

export async function getOptionalAuth(ctx: QueryCtx | MutationCtx): Promise<string | null> {
	const identity = await ctx.auth.getUserIdentity();
	return identity?.subject ?? null;
}
