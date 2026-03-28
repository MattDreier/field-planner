import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireAuth } from './lib/auth';

// Get all fences for a layout (with ownership verification)
export const listByLayout = query({
	args: { layoutId: v.id('layouts') },
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);

		const layout = await ctx.db.get(args.layoutId);
		if (!layout) {
			throw new Error('Layout not found');
		}
		if (layout.userId !== userId) {
			throw new Error('Not authorized to access this layout');
		}

		return await ctx.db
			.query('fences')
			.withIndex('by_layout', (q) => q.eq('layoutId', args.layoutId))
			.collect();
	}
});

// Create a fence
export const create = mutation({
	args: {
		layoutId: v.id('layouts'),
		vertices: v.array(v.object({ x: v.number(), y: v.number() })),
		heightFeet: v.number(),
		name: v.optional(v.string()),
		color: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);

		const layout = await ctx.db.get(args.layoutId);
		if (!layout) {
			throw new Error('Layout not found');
		}
		if (layout.userId !== userId) {
			throw new Error('Not authorized to add fences to this layout');
		}

		const fenceId = await ctx.db.insert('fences', {
			...args,
			userId,
			createdAt: Date.now()
		});

		await ctx.db.patch(args.layoutId, { updatedAt: Date.now() });

		return fenceId;
	}
});

// Remove a fence
export const remove = mutation({
	args: { id: v.id('fences') },
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const fence = await ctx.db.get(args.id);
		if (!fence) {
			throw new Error('Fence not found');
		}
		if (fence.userId !== userId) {
			throw new Error('Not authorized to delete this fence');
		}

		await ctx.db.delete(args.id);
		await ctx.db.patch(fence.layoutId, { updatedAt: Date.now() });
	}
});
