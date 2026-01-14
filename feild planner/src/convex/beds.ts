import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// Get all beds for a layout
export const listByLayout = query({
	args: { layoutId: v.id('layouts') },
	handler: async (ctx, args) => {
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
		fillColor: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const bedId = await ctx.db.insert('beds', {
			...args,
			shape: 'rectangle',
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
		fillColor: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const bedId = await ctx.db.insert('beds', {
			...args,
			shape: 'circle',
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
		fillColor: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const { id, ...updates } = args;
		const existing = await ctx.db.get(id);
		if (!existing) {
			throw new Error('Bed not found');
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
		const bed = await ctx.db.get(args.id);
		if (!bed) {
			throw new Error('Bed not found');
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
