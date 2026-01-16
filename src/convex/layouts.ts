import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireAuth } from './lib/auth';

// Get all layouts for the authenticated user
export const list = query({
	args: {},
	handler: async (ctx) => {
		const userId = await requireAuth(ctx);
		return await ctx.db
			.query('layouts')
			.withIndex('by_user', (q) => q.eq('userId', userId))
			.order('desc')
			.collect();
	}
});

// Get a single layout by ID (with ownership verification)
export const get = query({
	args: { id: v.id('layouts') },
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const layout = await ctx.db.get(args.id);
		if (!layout) {
			return null;
		}
		if (layout.userId !== userId) {
			throw new Error('Not authorized to access this layout');
		}
		return layout;
	}
});

// Create a new layout
export const create = mutation({
	args: {
		name: v.string(),
		description: v.optional(v.string()),
		canvasWidth: v.number(),
		canvasHeight: v.number(),
		pixelsPerInch: v.number()
	},
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const now = Date.now();
		return await ctx.db.insert('layouts', {
			...args,
			userId,
			createdAt: now,
			updatedAt: now
		});
	}
});

// Update a layout
export const update = mutation({
	args: {
		id: v.id('layouts'),
		name: v.optional(v.string()),
		description: v.optional(v.string()),
		canvasWidth: v.optional(v.number()),
		canvasHeight: v.optional(v.number()),
		pixelsPerInch: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const { id, ...updates } = args;
		const existing = await ctx.db.get(id);
		if (!existing) {
			throw new Error('Layout not found');
		}
		if (existing.userId !== userId) {
			throw new Error('Not authorized to update this layout');
		}

		// Filter out undefined values
		const cleanUpdates = Object.fromEntries(
			Object.entries(updates).filter(([_, v]) => v !== undefined)
		);

		await ctx.db.patch(id, {
			...cleanUpdates,
			updatedAt: Date.now()
		});
	}
});

// Delete a layout and all its beds/plants
export const remove = mutation({
	args: { id: v.id('layouts') },
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const layout = await ctx.db.get(args.id);
		if (!layout) {
			throw new Error('Layout not found');
		}
		if (layout.userId !== userId) {
			throw new Error('Not authorized to delete this layout');
		}

		// Delete all plants in this layout
		const plants = await ctx.db
			.query('placedPlants')
			.withIndex('by_layout', (q) => q.eq('layoutId', args.id))
			.collect();
		for (const plant of plants) {
			await ctx.db.delete(plant._id);
		}

		// Delete all beds in this layout
		const beds = await ctx.db
			.query('beds')
			.withIndex('by_layout', (q) => q.eq('layoutId', args.id))
			.collect();
		for (const bed of beds) {
			await ctx.db.delete(bed._id);
		}

		// Delete the layout itself
		await ctx.db.delete(args.id);
	}
});
