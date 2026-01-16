import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireAuth } from './lib/auth';

// Get all beds for a layout (with ownership verification)
export const listByLayout = query({
	args: { layoutId: v.id('layouts') },
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);

		// Verify layout ownership
		const layout = await ctx.db.get(args.layoutId);
		if (!layout) {
			throw new Error('Layout not found');
		}
		if (layout.userId !== userId) {
			throw new Error('Not authorized to access this layout');
		}

		return await ctx.db
			.query('beds')
			.withIndex('by_layout', (q) => q.eq('layoutId', args.layoutId))
			.collect();
	}
});

// Create a rectangular bed
export const createRectangle = mutation({
	args: {
		layoutId: v.id('layouts'),
		x: v.number(),
		y: v.number(),
		widthFeet: v.number(),
		heightFeet: v.number(),
		name: v.optional(v.string()),
		fillColor: v.optional(v.string()),
		rotation: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);

		// Verify layout ownership
		const layout = await ctx.db.get(args.layoutId);
		if (!layout) {
			throw new Error('Layout not found');
		}
		if (layout.userId !== userId) {
			throw new Error('Not authorized to add beds to this layout');
		}

		const bedId = await ctx.db.insert('beds', {
			...args,
			userId,
			shape: 'rectangle',
			rotation: args.rotation,
			createdAt: Date.now()
		});

		// Update layout timestamp
		await ctx.db.patch(args.layoutId, { updatedAt: Date.now() });

		return bedId;
	}
});

// Create a circular bed
export const createCircle = mutation({
	args: {
		layoutId: v.id('layouts'),
		x: v.number(),
		y: v.number(),
		widthFeet: v.number(), // diameter
		name: v.optional(v.string()),
		fillColor: v.optional(v.string()),
		rotation: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);

		// Verify layout ownership
		const layout = await ctx.db.get(args.layoutId);
		if (!layout) {
			throw new Error('Layout not found');
		}
		if (layout.userId !== userId) {
			throw new Error('Not authorized to add beds to this layout');
		}

		const bedId = await ctx.db.insert('beds', {
			...args,
			userId,
			shape: 'circle',
			rotation: args.rotation,
			createdAt: Date.now()
		});

		// Update layout timestamp
		await ctx.db.patch(args.layoutId, { updatedAt: Date.now() });

		return bedId;
	}
});

// Update bed position and/or dimensions
export const update = mutation({
	args: {
		id: v.id('beds'),
		x: v.optional(v.number()),
		y: v.optional(v.number()),
		widthFeet: v.optional(v.number()),
		heightFeet: v.optional(v.number()),
		name: v.optional(v.string()),
		fillColor: v.optional(v.string()),
		rotation: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const { id, ...updates } = args;
		const existing = await ctx.db.get(id);
		if (!existing) {
			throw new Error('Bed not found');
		}
		if (existing.userId !== userId) {
			throw new Error('Not authorized to update this bed');
		}

		// Filter out undefined values
		const cleanUpdates = Object.fromEntries(
			Object.entries(updates).filter(([_, v]) => v !== undefined)
		);

		await ctx.db.patch(id, cleanUpdates);

		// Update layout timestamp
		await ctx.db.patch(existing.layoutId, { updatedAt: Date.now() });
	}
});

// Delete a bed and all its plants
export const remove = mutation({
	args: { id: v.id('beds') },
	handler: async (ctx, args) => {
		const userId = await requireAuth(ctx);
		const bed = await ctx.db.get(args.id);
		if (!bed) {
			throw new Error('Bed not found');
		}
		if (bed.userId !== userId) {
			throw new Error('Not authorized to delete this bed');
		}

		// Delete all plants in this bed
		const plants = await ctx.db
			.query('placedPlants')
			.withIndex('by_bed', (q) => q.eq('bedId', args.id))
			.collect();
		for (const plant of plants) {
			await ctx.db.delete(plant._id);
		}

		// Delete the bed
		await ctx.db.delete(args.id);

		// Update layout timestamp
		await ctx.db.patch(bed.layoutId, { updatedAt: Date.now() });
	}
});
