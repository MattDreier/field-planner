import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// Get all layouts
export const list = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query('layouts').order('desc').collect();
	}
});

// Get a single layout by ID
export const get = query({
	args: { id: v.id('layouts') },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
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
		const now = Date.now();
		return await ctx.db.insert('layouts', {
			...args,
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
		const { id, ...updates } = args;
		const existing = await ctx.db.get(id);
		if (!existing) {
			throw new Error('Layout not found');
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
